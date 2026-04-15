'use client';

import { useEffect, useRef } from 'react';

import type { StompSubscription } from '@stomp/stompjs';

import apiClient from '@/lib/api/client';
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

const VILLAGE_CHAT_TOPIC = 'village';

function parseTokenRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(atob(base64)) as { role?: string }).role ?? null;
  } catch {
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

    const connect = async () => {
      let token = localStorage.getItem('accessToken');

      // 토큰이 없으면 게스트 토큰 자동 발급 (게스트 토큰 = 익명 접속)
      if (!token) {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
          const res = await fetch(`${apiBase}/api/v1/auth/guest`, { method: 'POST' });
          if (res.ok) {
            const data = (await res.json()) as { accessToken: string };
            token = data.accessToken;
            localStorage.setItem('accessToken', token);
          }
        } catch (err) {
          console.warn('[useStomp] 게스트 토큰 발급 실패', err);
        }
      }

      if (cancelled) return;

      if (!token) {
        console.error('[useStomp] 토큰 없이 STOMP 연결 불가');
        setConnectionStatus('error');
        return;
      }

      console.log('[useStomp] Connecting to STOMP server');
      setConnectionStatus('connecting');

      const onConnected = () => {
        if (cancelled) return;
        console.log('[useStomp] STOMP connected, subscribing to village chat');
        setConnectionStatus('connected');

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

      const onError = (err: import('@stomp/stompjs').IFrame) => {
        console.error('[useStomp] STOMP error:', err);
        localStorage.removeItem('accessToken');
        setConnectionStatus('error');
      };

      connectWithAuth(token, onConnected, onError);
    };

    void connect();

    return () => {
      cancelled = true;
      console.log('[useStomp] Cleanup: disconnecting');
      chatSubRef.current?.unsubscribe();
      chatSubRef.current = null;
      posSubRef.current?.unsubscribe();
      posSubRef.current = null;
      typingSubRef.current?.unsubscribe();
      typingSubRef.current = null;
      disconnectStomp();
      setConnectionStatus('disconnected');
    };
  }, [addMessage, prependMessages, setConnectionStatus, setNpcTyping]);
}
