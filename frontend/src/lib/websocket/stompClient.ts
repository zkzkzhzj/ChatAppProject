import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient: Client | null = null;

export function getStompClient(): Client {
  if (!stompClient) {
    stompClient = new Client({
      webSocketFactory: () =>
        new SockJS(
          process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080/ws',
        ),
      reconnectDelay: 5_000,
    });
  }
  return stompClient;
}

export function connectStomp(onConnected: () => void): void {
  const client = getStompClient();
  client.onConnect = onConnected;
  client.activate();
}

export function disconnectStomp(): void {
  stompClient?.deactivate();
}
