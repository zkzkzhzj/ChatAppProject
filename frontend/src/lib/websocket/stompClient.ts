import type { IFrame, StompSubscription } from '@stomp/stompjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import type { MessageResponse } from '@/types/chat';

let stompClient: Client | null = null;

export function getStompClient(): Client {
  stompClient ??= new Client({
    webSocketFactory: () =>
      new SockJS(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080/ws'),
    reconnectDelay: 5_000,
    debug:
      process.env.NODE_ENV === 'development'
        ? (msg: string) => { console.log('[STOMP]', msg); }
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
  console.log('[STOMP] Publishing to /app/chat/village', { body });
  client.publish({
    destination: '/app/chat/village',
    body: JSON.stringify({ body }),
  });
  onSent?.();
}

// --- 타이핑 상태 ---

export interface TypingBroadcast {
  id: string;
  typing: boolean;
}

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

export interface PositionBroadcast {
  id: string;
  userType: 'MEMBER' | 'GUEST' | 'LEAVE';
  x: number;
  y: number;
}

export function subscribeToPositions(
  onPosition: (pos: PositionBroadcast) => void,
): StompSubscription {
  const client = getStompClient();
  return client.subscribe('/topic/village/positions', (frame) => {
    onPosition(JSON.parse(frame.body) as PositionBroadcast);
  });
}

export function sendPosition(x: number, y: number): void {
  const client = getStompClient();
  if (!client.connected) return;
  client.publish({
    destination: '/app/village/position',
    body: JSON.stringify({ x, y }),
  });
}
