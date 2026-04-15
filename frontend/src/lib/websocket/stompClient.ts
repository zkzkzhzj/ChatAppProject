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
    debug: (msg) => {
      console.log('[STOMP]', msg);
    },
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

export function connectAnonymous(onConnected: () => void, onError?: (err: IFrame) => void): void {
  const client = getStompClient();
  client.connectHeaders = {};
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

export function sendVillageMessage(body: string): void {
  const client = getStompClient();
  console.log('[STOMP] Publishing to /app/chat/village', { body });
  client.publish({
    destination: '/app/chat/village',
    body: JSON.stringify({ body }),
  });
}
