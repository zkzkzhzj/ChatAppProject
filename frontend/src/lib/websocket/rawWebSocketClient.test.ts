import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  connectRawWebSocket,
  disconnectRawWebSocket,
  sendRawPosition,
  sendRawTypingStatus,
  sendRawVillageMessage,
  subscribeToRawRealtimeChannels,
} from './rawWebSocketClient';

class MockWebSocket {
  static CLOSED = 3;
  static CONNECTING = 0;
  static instances: MockWebSocket[] = [];
  static OPEN = 1;

  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onopen: (() => void) | null = null;
  readyState: number = WebSocket.CONNECTING;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  receive(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }
}

describe('rawWebSocketClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubEnv('NEXT_PUBLIC_RAW_WS_URL', 'ws://localhost:8080/ws/v2');
  });

  it('connects to /ws/v2 with access_token and subscribes on open', () => {
    const onConnected = vi.fn();

    connectRawWebSocket('token-1', onConnected);
    subscribeToRawRealtimeChannels({ addMessage: vi.fn() });
    const socket = MockWebSocket.instances[0];
    socket.open();

    expect(socket.url).toBe('ws://localhost:8080/ws/v2?access_token=token-1');
    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(socket.sent).toContain(JSON.stringify({ type: 'SUBSCRIBE', roomId: 1 }));
  });

  it('maps raw MESSAGE, POSITION_UPDATE, and TYPING_UPDATE frames to existing handlers', () => {
    const addMessage = vi.fn();
    const cleanup = subscribeToRawRealtimeChannels({ addMessage });

    connectRawWebSocket('token-1', vi.fn());
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.receive({
      type: 'MESSAGE',
      message: {
        id: 'message-1',
        participantId: 10,
        senderId: 42,
        body: 'hello',
        createdAt: '2026-04-08T12:00:00.000Z',
      },
    });
    socket.receive({
      type: 'POSITION_UPDATE',
      displayId: 'user-42',
      userType: 'MEMBER',
      x: 1,
      y: 2,
    });
    socket.receive({
      type: 'TYPING_UPDATE',
      displayId: 'user-42',
      typing: true,
    });

    expect(addMessage).toHaveBeenCalledWith({
      id: 'message-1',
      participantId: 10,
      senderId: 42,
      body: 'hello',
      createdAt: '2026-04-08T12:00:00.000Z',
    });

    cleanup();
  });

  it('sends raw publish, position, typing, and disconnect unsubscribe frames', () => {
    connectRawWebSocket('token-1', vi.fn());
    const socket = MockWebSocket.instances[0];
    socket.open();

    sendRawVillageMessage('hello');
    sendRawPosition(1, 2);
    sendRawTypingStatus(true);
    disconnectRawWebSocket();

    expect(socket.sent).toContain(JSON.stringify({ type: 'PUBLISH', roomId: 1, body: 'hello' }));
    expect(socket.sent).toContain(JSON.stringify({ type: 'POSITION', roomId: 1, x: 1, y: 2 }));
    expect(socket.sent).toContain(JSON.stringify({ type: 'TYPING', roomId: 1, typing: true }));
    expect(socket.sent).toContain(JSON.stringify({ type: 'UNSUBSCRIBE', roomId: 1 }));
  });
});
