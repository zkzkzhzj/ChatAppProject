import type { IFrame } from '@stomp/stompjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectRealtime, disconnectRealtime, resolveRealtimeTransport, sendPosition } from './realtimeClient';

const {
  mockConnectRawWebSocket,
  mockConnectWithAuth,
  mockDisconnectRawWebSocket,
  mockDisconnectStomp,
  mockSendRawPosition,
  mockSendStompPosition,
} = vi.hoisted(() => ({
  mockConnectRawWebSocket: vi.fn(),
  mockConnectWithAuth: vi.fn(),
  mockDisconnectRawWebSocket: vi.fn(),
  mockDisconnectStomp: vi.fn(),
  mockSendRawPosition: vi.fn(),
  mockSendStompPosition: vi.fn(),
}));

vi.mock('./rawWebSocketClient', () => ({
  connectRawWebSocket: mockConnectRawWebSocket,
  disconnectRawWebSocket: mockDisconnectRawWebSocket,
  sendRawPosition: mockSendRawPosition,
}));

vi.mock('./stompClient', () => ({
  connectWithAuth: mockConnectWithAuth,
  disconnectStomp: mockDisconnectStomp,
  sendPosition: mockSendStompPosition,
}));

describe('realtimeClient transport selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('defaults to STOMP when NEXT_PUBLIC_REALTIME_TRANSPORT is not raw', () => {
    const onConnected = vi.fn();
    const onError = vi.fn<(err: IFrame) => void>();

    expect(resolveRealtimeTransport()).toBe('stomp');
    connectRealtime('token', onConnected, onError);
    sendPosition(1, 2);
    disconnectRealtime();

    expect(mockConnectWithAuth).toHaveBeenCalledWith('token', onConnected, onError);
    expect(mockSendStompPosition).toHaveBeenCalledWith(1, 2);
    expect(mockDisconnectStomp).toHaveBeenCalledTimes(1);
    expect(mockConnectRawWebSocket).not.toHaveBeenCalled();
  });

  it('uses raw websocket when NEXT_PUBLIC_REALTIME_TRANSPORT is raw', () => {
    const onConnected = vi.fn();
    const onError = vi.fn<(err: IFrame) => void>();
    vi.stubEnv('NEXT_PUBLIC_REALTIME_TRANSPORT', 'raw');

    expect(resolveRealtimeTransport()).toBe('raw');
    connectRealtime('token', onConnected, onError);
    sendPosition(1, 2);
    disconnectRealtime();

    expect(mockConnectRawWebSocket).toHaveBeenCalledWith('token', onConnected, onError);
    expect(mockSendRawPosition).toHaveBeenCalledWith(1, 2);
    expect(mockDisconnectRawWebSocket).toHaveBeenCalledTimes(1);
    expect(mockConnectWithAuth).not.toHaveBeenCalled();
  });
});
