'use client';

import { useEffect, useRef } from 'react';

import type { IFrame, StompSubscription } from '@stomp/stompjs';

import apiClient from '@/lib/api/client';
import { getDisplayIdFromToken, isTokenExpired } from '@/lib/auth';
import { useChatStore } from '@/store/useChatStore';
import type { ChatMessage, MessageResponse } from '@/types/chat';

import { emitNpcTypingUpdate, emitPositionUpdate, emitTypingUpdate } from './positionBridge';
import {
  connectWithAuth,
  disconnectStomp,
  subscribeToChatRoom,
  subscribeToPositions,
  subscribeToTyping,
} from './stompClient';
import { emitDisplayIdChange } from './tokenBridge';

const VILLAGE_CHAT_TOPIC = 'village';
const RECONNECT_DELAY_MS = 3_000;
/** STOMP 인증 실패 메시지 — 서버 StompAuthChannelInterceptor 와 정확히 일치해야 함 */
const TOKEN_INVALID_MESSAGE = 'Invalid or expired token';
/** 같은 인증 에러가 연속 N회 발생하면 진짜 만료로 간주하고 토큰 갱신 (무한 루프 방어) */
const AUTH_ERROR_THRESHOLD = 1;

function parseTokenRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(atob(base64)) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

async function issueGuestToken(): Promise<string | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const res = await fetch(`${apiBase}/api/v1/auth/guest`, { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    return data.accessToken;
  } catch (err) {
    console.warn('[useStomp] 게스트 토큰 발급 실패', err);
    return null;
  }
}

function toMessage(msg: MessageResponse): ChatMessage {
  return {
    id: msg.id,
    participantId: msg.participantId,
    senderId: msg.senderId,
    senderType: msg.senderType,
    body: msg.body,
    createdAt: msg.createdAt,
  };
}

/**
 * 마을 공개 채팅 STOMP 훅.
 *
 * 마운트 시 즉시 STOMP 연결 + 마을 채팅방 구독.
 * 토큰이 있으면 인증 헤더를 포함하고, 없으면(게스트) 인증 없이 연결한다.
 * 게스트도 다른 사람의 채팅을 볼 수 있어야 하므로 토큰 유무와 관계없이 구독한다.
 * 채널 개념 도입 전까지 토픽은 /topic/chat/village 고정.
 */
export function useStomp(): void {
  const addMessage = useChatStore((s) => s.addMessage);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const setNpcTyping = useChatStore((s) => s.setNpcTyping);
  const chatSubRef = useRef<StompSubscription | null>(null);
  const posSubRef = useRef<StompSubscription | null>(null);
  const typingSubRef = useRef<StompSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;
    let consecutiveAuthErrors = 0;

    /**
     * 토큰을 결정한다 — localStorage 에 유효한 토큰이 있으면 재사용, 없거나 만료 임박이면 새로 발급.
     * 만료된 토큰을 STOMP CONNECT 로 보내면 서버 거부 → 새 sessionId → 자기인식 깨짐 (#28).
     * 사전 체크로 그 트리거 자체를 차단한다.
     *
     * 게스트만 자동 재발급한다. 멤버 토큰은 만료되어도 토큰을 그대로 두고 서버가 명시적으로
     * 거부하게 둔다 — 자동 게스트 다운그레이드는 멤버 신원 상실로 이어진다 (Codex P1, #36 review).
     * 멤버 토큰 자동 갱신은 별도 트랙(refresh token / sliding session) 에서 다룬다.
     */
    const ensureValidToken = async (): Promise<string | null> => {
      const stored = localStorage.getItem('accessToken');

      if (!stored) {
        const fresh = await issueGuestToken();
        if (fresh) localStorage.setItem('accessToken', fresh);
        return fresh;
      }

      if (!isTokenExpired(stored)) return stored;

      const role = parseTokenRole(stored);
      if (role === 'GUEST') {
        console.log('[useStomp] 게스트 토큰 만료 임박/만료 — 사전 갱신');
        localStorage.removeItem('accessToken');
        const fresh = await issueGuestToken();
        if (fresh) localStorage.setItem('accessToken', fresh);
        return fresh;
      }

      // 멤버 토큰 만료 — 자동 게스트 다운그레이드 차단. 토큰 그대로 두고 서버 거부 시 onError 에서 처리.
      console.warn(
        '[useStomp] 멤버 토큰 만료 임박/만료 — 자동 갱신 미지원, 서버 거부 시 재로그인 필요',
      );
      return stored;
    };

    const connect = async () => {
      const token = await ensureValidToken();
      if (cancelled) return;

      if (!token) {
        console.error('[useStomp] 토큰 없이 STOMP 연결 불가');
        setConnectionStatus('error');
        return;
      }

      // 자기인식 동기화 — 토큰이 결정된 시점에 displayId 를 Phaser 측에 전달
      emitDisplayIdChange(getDisplayIdFromToken(token));

      console.log('[useStomp] Connecting to STOMP server');
      setConnectionStatus('connecting');

      const onConnected = () => {
        if (cancelled) return;
        console.log('[useStomp] STOMP connected, subscribing to village chat');
        setConnectionStatus('connected');
        consecutiveAuthErrors = 0;

        // 이전 대화 10개 로드 (멤버만 — 게스트는 403)
        const tokenPayload = parseTokenRole(token);
        if (tokenPayload !== 'GUEST') {
          apiClient
            .get<MessageResponse[]>('/api/v1/chat/messages')
            .then(({ data }) => {
              if (!cancelled) {
                // Cassandra는 최신순(DESC)으로 반환하므로 역순으로 뒤집어 시간순 배치
                prependMessages(data.map(toMessage).reverse());
              }
            })
            .catch((err: unknown) => {
              console.warn('[useStomp] 히스토리 로드 실패', err);
            });
        }

        chatSubRef.current = subscribeToChatRoom(VILLAGE_CHAT_TOPIC, (msg) => {
          console.log('[useStomp] Received message:', msg);
          const chatMsg = toMessage(msg);
          // NPC 응답이 오면 타이핑 표시 해제
          if (chatMsg.senderType === 'NPC') {
            setNpcTyping(false);
            emitNpcTypingUpdate(false);
          }
          addMessage(chatMsg);
        });

        posSubRef.current = subscribeToPositions((pos) => {
          emitPositionUpdate(pos);
        });

        typingSubRef.current = subscribeToTyping((data) => {
          emitTypingUpdate(data);
        });
      };

      const onError = (err: IFrame) => {
        console.error('[useStomp] STOMP error:', err);
        setConnectionStatus('error');
        if (cancelled) return;

        const isAuthError = err.headers.message === TOKEN_INVALID_MESSAGE;
        if (isAuthError) {
          consecutiveAuthErrors += 1;
          if (consecutiveAuthErrors >= AUTH_ERROR_THRESHOLD) {
            const stored = localStorage.getItem('accessToken');
            const role = parseTokenRole(stored);
            consecutiveAuthErrors = 0;

            if (role === 'MEMBER') {
              // 멤버 인증 에러 — 자동 게스트 다운그레이드 금지 (Codex P1).
              // 무한 루프 방어를 위해 재연결도 시도하지 않는다. 사용자가 재로그인 해야 함.
              // disconnectStomp() 누락 시 stompClient 의 reconnectDelay 가 살아있어 5초마다
              // 같은 만료 토큰으로 STOMP 내장 자동 재연결이 무한 반복된다.
              console.warn('[useStomp] 멤버 인증 실패 — 재연결 중단, 재로그인 필요');
              disconnectStomp();
              return;
            }
            // 게스트 또는 토큰 없음 → 새 게스트 발급
            console.log('[useStomp] 게스트 인증 에러 — 토큰 갱신 후 재연결');
            localStorage.removeItem('accessToken');
          }
        }
        // 일반 에러(네트워크·timeout 등)는 토큰 그대로 재연결 — sessionId 유지로 자기인식 보존
        setTimeout(() => {
          if (!cancelled) void connect();
        }, RECONNECT_DELAY_MS);
      };

      connectWithAuth(token, onConnected, onError);
    };

    // 탭 종료 시 graceful disconnect — SockJS heartbeat timeout 까지 기다리지 않고 즉시 LEAVE 발송 (3-D)
    const handleUnload = () => {
      disconnectStomp();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    void connect();

    return () => {
      cancelled = true;
      console.log('[useStomp] Cleanup: disconnecting');
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      chatSubRef.current?.unsubscribe();
      chatSubRef.current = null;
      posSubRef.current?.unsubscribe();
      posSubRef.current = null;
      typingSubRef.current?.unsubscribe();
      typingSubRef.current = null;
      disconnectStomp();
      setConnectionStatus('disconnected');
      emitDisplayIdChange(null);
    };
  }, [addMessage, prependMessages, setConnectionStatus, setNpcTyping]);
}
