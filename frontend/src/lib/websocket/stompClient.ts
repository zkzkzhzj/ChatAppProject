import type { IFrame, StompSubscription } from '@stomp/stompjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import type { MessageResponse } from '@/types/chat';

import type {
  MailNotificationBroadcast,
  PositionBroadcast,
  TypingBroadcast,
} from './realtimeTypes';

let stompClient: Client | null = null;

export function getStompClient(): Client {
  stompClient ??= new Client({
    webSocketFactory: () =>
      new SockJS(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080/ws'),
    reconnectDelay: 5_000,
    debug:
      process.env.NODE_ENV === 'development'
        ? (msg: string) => {
            console.log('[STOMP]', msg);
          }
        : () => undefined,
  });
  return stompClient;
}

export function connectWithAuth(
  token: string,
  onConnected: () => void,
  onError?: (err: IFrame) => void,
): void {
  const client = getStompClient();
  client.connectHeaders = { Authorization: `Bearer ${token}` };
  client.onConnect = onConnected;
  if (onError) {
    client.onStompError = onError;
  }
  client.activate();
}

export function disconnectStomp(): void {
  void stompClient?.deactivate();
  stompClient = null;
}

export function subscribeToChatRoom(
  topic: string,
  onMessage: (msg: MessageResponse) => void,
): StompSubscription {
  const client = getStompClient();
  return client.subscribe(`/topic/chat/${topic}`, (frame) => {
    const parsed: unknown = JSON.parse(frame.body);
    if (Array.isArray(parsed)) {
      (parsed as MessageResponse[]).forEach(onMessage);
    } else {
      onMessage(parsed as MessageResponse);
    }
  });
}

export function sendVillageMessage(body: string, onSent?: () => void): void {
  const client = getStompClient();
  if (!client.connected) return;
  console.log('[STOMP] Publishing to /app/chat/village', { body });
  client.publish({
    destination: '/app/chat/village',
    body: JSON.stringify({ body }),
  });
  onSent?.();
}

// --- 타이핑 상태 ---

export function subscribeToTyping(onTyping: (data: TypingBroadcast) => void): StompSubscription {
  const client = getStompClient();
  return client.subscribe('/topic/village/typing', (frame) => {
    onTyping(JSON.parse(frame.body) as TypingBroadcast);
  });
}

export function sendTypingStatus(typing: boolean): void {
  const client = getStompClient();
  if (!client.connected) return;
  client.publish({
    destination: '/app/village/typing',
    body: JSON.stringify({ typing }),
  });
}

// --- 위치 공유 ---

export function subscribeToPositions(
  onPosition: (pos: PositionBroadcast) => void,
): StompSubscription {
  const client = getStompClient();
  return client.subscribe('/topic/village/positions', (frame) => {
    onPosition(JSON.parse(frame.body) as PositionBroadcast);
  });
}

export function subscribeToMailNotifications(
  onNotification: (notification: MailNotificationBroadcast) => void,
): StompSubscription {
  const client = getStompClient();
  return client.subscribe('/user/queue/mail', (frame) => {
    onNotification(JSON.parse(frame.body) as MailNotificationBroadcast);
  });
}

export function sendPosition(x: number, y: number, z = 0): void {
  const client = getStompClient();
  if (!client.connected) return;
  client.publish({
    destination: '/app/village/position',
    body: JSON.stringify({ x, y, z }),
  });
}

/**
 * 마을을 벗어났음을 backend에 알린다 (도서관 진입 결로 호출).
 * backend는 `userType=LEAVE` broadcast 결로 다른 클라이언트에 통지 → placeholder 제거.
 * STOMP 세션은 살아있어 disconnect listener 결로는 안 잡힘 — 명시 신호 필요 (Codex P1).
 */
export function sendLeaveVillage(): void {
  const client = getStompClient();
  if (!client.connected) return;
  client.publish({ destination: '/app/village/leave', body: '{}' });
}
