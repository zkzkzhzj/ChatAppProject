import type { IFrame } from '@stomp/stompjs';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStomp } from './useStomp';

const {
  mockConnectWithAuth,
  mockDisconnectStomp,
  mockEnsureValidRealtimeToken,
  mockGet,
  mockParseTokenRole,
  mockPrependMessages,
  mockSetLoginRequired,
  mockSubscribeToStompRealtimeChannels,
} = vi.hoisted(() => ({
  mockConnectWithAuth: vi.fn(),
  mockDisconnectStomp: vi.fn(),
  mockEnsureValidRealtimeToken: vi.fn(),
  mockGet: vi.fn(),
  mockParseTokenRole: vi.fn(),
  mockPrependMessages: vi.fn(),
  mockSetLoginRequired: vi.fn(),
  mockSubscribeToStompRealtimeChannels: vi.fn(),
}));

vi.mock('./realtimeClient', () => ({
  connectRealtime: mockConnectWithAuth,
  disconnectRealtime: mockDisconnectStomp,
  subscribeToRealtimeChannels: mockSubscribeToStompRealtimeChannels,
}));

vi.mock('./realtimeAuth', () => ({
  ensureValidRealtimeToken: mockEnsureValidRealtimeToken,
  parseTokenRole: mockParseTokenRole,
}));

vi.mock('@/lib/api/client', () => ({
  default: { get: mockGet },
}));

vi.mock('./tokenBridge', () => ({
  emitDisplayIdChange: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getDisplayIdFromToken: vi.fn().mockReturnValue('user-1'),
}));

vi.mock('@/lib/scene/mailRefreshBridge', () => ({
  emitMailRefreshRequested: vi.fn(),
}));

vi.mock('@/store/useChatStore', () => ({
  useChatStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        addMessage: vi.fn(),
        prependMessages: mockPrependMessages,
        setConnectionStatus: vi.fn(),
        setLoginRequired: mockSetLoginRequired,
      }),
    { setState: vi.fn() },
  ),
}));

function tokenWithRole(role: 'MEMBER' | 'GUEST') {
  const payload = btoa(JSON.stringify({ role }));
  return `header.${payload}.signature`;
}

function TestHarness() {
  useStomp();
  return null;
}

function captureOnError(): Promise<(err: IFrame) => void> {
  return waitFor(() => {
    const call = mockConnectWithAuth.mock.calls[0];
    expect(call).toBeDefined();
    return call[2] as (err: IFrame) => void;
  });
}

const tokenInvalidError = {
  command: 'ERROR',
  headers: { message: 'Invalid or expired token' },
} as unknown as IFrame;

describe('useStomp — 멤버 토큰 만료 시 STOMP 자동 reconnect 차단', () => {
  beforeEach(() => {
    mockConnectWithAuth.mockReset();
    mockDisconnectStomp.mockReset();
    mockEnsureValidRealtimeToken.mockReset();
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: [] });
    mockParseTokenRole.mockReset();
    mockPrependMessages.mockReset();
    mockSetLoginRequired.mockReset();
    mockSubscribeToStompRealtimeChannels.mockReset();
    mockSubscribeToStompRealtimeChannels.mockReturnValue(vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('멤버 토큰 + 401 ERROR → disconnectStomp 가 호출돼 STOMP 내장 reconnect 까지 끊는다', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockEnsureValidRealtimeToken.mockResolvedValue(member);
    mockParseTokenRole.mockReturnValue('MEMBER');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockDisconnectStomp.mockClear();
    onError(tokenInvalidError);

    expect(mockDisconnectStomp).toHaveBeenCalledTimes(1);
  });

  it('게스트 토큰 + 401 ERROR → disconnectStomp 호출 X (토큰 갱신 후 재연결 흐름 보존)', async () => {
    const guest = tokenWithRole('GUEST');
    localStorage.setItem('accessToken', guest);
    mockEnsureValidRealtimeToken.mockResolvedValue(guest);
    mockParseTokenRole.mockReturnValue('GUEST');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockDisconnectStomp.mockClear();
    onError(tokenInvalidError);

    expect(mockDisconnectStomp).not.toHaveBeenCalled();
  });

  it('멤버 토큰 + 401 ERROR → 만료 토큰 localStorage 제거 + setLoginRequired(true) 호출', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockEnsureValidRealtimeToken.mockResolvedValue(member);
    mockParseTokenRole.mockReturnValue('MEMBER');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockSetLoginRequired.mockClear();
    onError(tokenInvalidError);

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(mockSetLoginRequired).toHaveBeenCalledWith(true);
  });

  it('게스트 토큰 + 401 ERROR → setLoginRequired 호출 X (자동 갱신 흐름 보존)', async () => {
    const guest = tokenWithRole('GUEST');
    localStorage.setItem('accessToken', guest);
    mockEnsureValidRealtimeToken.mockResolvedValue(guest);
    mockParseTokenRole.mockReturnValue('GUEST');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockSetLoginRequired.mockClear();
    onError(tokenInvalidError);

    expect(mockSetLoginRequired).not.toHaveBeenCalled();
  });

  it('member connection loads recent chat history and prepends it in chronological order', async () => {
    const member = tokenWithRole('MEMBER');
    const latest = {
      id: 'message-2',
      participantId: 11,
      senderId: 43,
      body: 'latest',
      createdAt: '2026-04-08T12:01:00.000Z',
    };
    const older = {
      id: 'message-1',
      participantId: 10,
      senderId: 42,
      body: 'older',
      createdAt: '2026-04-08T12:00:00.000Z',
    };
    localStorage.setItem('accessToken', member);
    mockEnsureValidRealtimeToken.mockResolvedValue(member);
    mockParseTokenRole.mockReturnValue('MEMBER');
    mockGet.mockResolvedValue({ data: [latest, older] });

    render(<TestHarness />);

    await waitFor(() => {
      expect(mockConnectWithAuth).toHaveBeenCalled();
    });
    const onConnected = mockConnectWithAuth.mock.calls[0][1] as () => void;
    onConnected();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/v1/chat/messages');
      expect(mockPrependMessages).toHaveBeenCalledWith([older, latest]);
    });
  });
});
