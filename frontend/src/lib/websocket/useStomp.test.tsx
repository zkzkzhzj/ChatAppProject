import type { IFrame } from '@stomp/stompjs';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStomp } from './useStomp';

/**
 * 멤버 토큰 만료 시 STOMP 자동 reconnect 무한 루프 회귀 차단.
 *
 * 배경: stompClient.ts 의 `reconnectDelay: 5_000` 으로 인해 STOMP Client 자체가 ERROR 프레임 직후
 *      자동 재연결을 시도한다. useStomp 의 onError 분기가 멤버 인증 실패를 감지하고 우리 setTimeout
 *      reconnect 만 막아도, STOMP 내장 reconnect 가 같은 만료 토큰으로 5초마다 재시도해 콘솔 도배 +
 *      서버 부하를 유발한다. → 멤버 분기에서 disconnectStomp() 를 호출해 내장 reconnect 까지 차단해야 한다.
 *
 * 게스트 분기는 기존 동작 유지 — 토큰 갱신 후 재연결이 정상 흐름이므로 disconnect 호출 X.
 */

const { mockConnectWithAuth, mockDisconnectStomp } = vi.hoisted(() => ({
  mockConnectWithAuth: vi.fn(),
  mockDisconnectStomp: vi.fn(),
}));

vi.mock('./stompClient', () => ({
  connectWithAuth: mockConnectWithAuth,
  disconnectStomp: mockDisconnectStomp,
  subscribeToChatRoom: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  subscribeToPositions: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  subscribeToTyping: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('./positionBridge', () => ({
  emitNpcTypingUpdate: vi.fn(),
  emitPositionUpdate: vi.fn(),
  emitTypingUpdate: vi.fn(),
}));

vi.mock('./tokenBridge', () => ({
  emitDisplayIdChange: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  isTokenExpired: vi.fn().mockReturnValue(false),
  getDisplayIdFromToken: vi.fn().mockReturnValue('user-1'),
}));

vi.mock('@/store/useChatStore', () => ({
  useChatStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        addMessage: vi.fn(),
        prependMessages: vi.fn(),
        setConnectionStatus: vi.fn(),
        setNpcTyping: vi.fn(),
      }),
    { setState: vi.fn() },
  ),
}));

function setRoleToken(role: 'MEMBER' | 'GUEST') {
  const payload = btoa(JSON.stringify({ role }));
  localStorage.setItem('accessToken', `header.${payload}.signature`);
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
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('멤버 토큰 + 401 ERROR → disconnectStomp 가 호출돼 STOMP 내장 reconnect 까지 끊는다', async () => {
    // Given: 멤버 토큰으로 STOMP 연결됨
    setRoleToken('MEMBER');
    render(<TestHarness />);
    const onError = await captureOnError();

    // cleanup 효과(unmount)로 호출되는 disconnect 와 분리하기 위해 카운터 초기화
    mockDisconnectStomp.mockClear();

    // When: 서버가 만료/위조 토큰을 거부 (Invalid or expired token)
    onError(tokenInvalidError);

    // Then: 멤버 분기에서 STOMP 내장 reconnect 차단 위해 disconnectStomp 호출
    expect(mockDisconnectStomp).toHaveBeenCalledTimes(1);
  });

  it('게스트 토큰 + 401 ERROR → disconnectStomp 호출 X (토큰 갱신 후 재연결 흐름 보존)', async () => {
    // Given: 게스트 토큰으로 STOMP 연결됨
    setRoleToken('GUEST');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockDisconnectStomp.mockClear();

    // When
    onError(tokenInvalidError);

    // Then: 게스트는 새 토큰 받아 재연결하는 게 정상 — disconnect 호출 X
    expect(mockDisconnectStomp).not.toHaveBeenCalled();
  });
});
