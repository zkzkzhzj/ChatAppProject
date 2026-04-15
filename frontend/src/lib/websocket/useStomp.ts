'use client';

import { useEffect, useRef } from 'react';

import type { StompSubscription } from '@stomp/stompjs';

import { useChatStore } from '@/store/useChatStore';
import type { ChatMessage, MessageResponse } from '@/types/chat';

import {
  connectAnonymous,
  connectWithAuth,
  disconnectStomp,
  subscribeToChatRoom,
} from './stompClient';

const VILLAGE_CHAT_TOPIC = 'village';

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
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const subscriptionRef = useRef<StompSubscription | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    console.log('[useStomp] Connecting to STOMP server', token ? '(authenticated)' : '(guest)');
    setConnectionStatus('connecting');

    const onConnected = () => {
      console.log('[useStomp] STOMP connected, subscribing to village chat');
      setConnectionStatus('connected');

      subscriptionRef.current = subscribeToChatRoom(VILLAGE_CHAT_TOPIC, (msg) => {
        console.log('[useStomp] Received message:', msg);
        addMessage(toMessage(msg));
      });
    };

    const onError = (err: import('@stomp/stompjs').IFrame) => {
      console.error('[useStomp] STOMP error:', err);
      if (token) {
        // 토큰 만료/유효하지 않은 경우 제거
        localStorage.removeItem('accessToken');
      }
      setConnectionStatus('error');
    };

    if (token) {
      connectWithAuth(token, onConnected, onError);
    } else {
      connectAnonymous(onConnected, onError);
    }

    return () => {
      console.log('[useStomp] Cleanup: disconnecting');
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      disconnectStomp();
      setConnectionStatus('disconnected');
    };
  }, [addMessage, setConnectionStatus]);
}
