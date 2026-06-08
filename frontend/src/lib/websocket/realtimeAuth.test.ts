import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureValidRealtimeToken, parseTokenRole } from './realtimeAuth';

const { mockIsTokenExpired } = vi.hoisted(() => ({
  mockIsTokenExpired: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  isTokenExpired: mockIsTokenExpired,
}));

function tokenWithRole(role: 'MEMBER' | 'GUEST'): string {
  const payload = btoa(JSON.stringify({ role }));
  return `header.${payload}.signature`;
}

describe('realtimeAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsTokenExpired.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('parseTokenRole은 MEMBER/GUEST role을 읽는다', () => {
    expect(parseTokenRole(tokenWithRole('MEMBER'))).toBe('MEMBER');
    expect(parseTokenRole(tokenWithRole('GUEST'))).toBe('GUEST');
  });

  it('parseTokenRole은 잘못된 token이면 null을 반환한다', () => {
    expect(parseTokenRole('broken')).toBeNull();
    expect(parseTokenRole(null)).toBeNull();
  });

  it('저장된 토큰이 없으면 게스트 토큰을 발급해 저장한다', async () => {
    const guest = tokenWithRole('GUEST');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: guest }),
    } as Response);

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(guest);
    expect(localStorage.getItem('accessToken')).toBe(guest);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/auth/guest', {
      method: 'POST',
    });
  });

  it('저장된 토큰이 유효하면 그대로 반환한다', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockIsTokenExpired.mockReturnValue(false);

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(member);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('만료된 게스트 토큰은 제거하고 새 게스트 토큰으로 교체한다', async () => {
    const oldGuest = tokenWithRole('GUEST');
    const newGuest = tokenWithRole('GUEST');
    localStorage.setItem('accessToken', oldGuest);
    mockIsTokenExpired.mockReturnValue(true);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: newGuest }),
    } as Response);

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(newGuest);
    expect(localStorage.getItem('accessToken')).toBe(newGuest);
  });

  it('만료된 멤버 토큰은 자동 게스트 다운그레이드 없이 그대로 반환한다', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockIsTokenExpired.mockReturnValue(true);

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(member);
    expect(localStorage.getItem('accessToken')).toBe(member);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('게스트 토큰 발급 실패 시 null을 반환하고 저장하지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    const result = await ensureValidRealtimeToken();

    expect(result).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('게스트 토큰 발급 요청이 예외를 던져도 null을 반환하고 저장하지 않는다', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));

    const result = await ensureValidRealtimeToken();

    expect(result).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
