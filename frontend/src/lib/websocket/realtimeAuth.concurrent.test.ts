import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureValidRealtimeToken } from './realtimeAuth';

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

describe('realtimeAuth concurrent token issue', () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsTokenExpired.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shares one guest token request across concurrent callers', async () => {
    const guest = tokenWithRole('GUEST');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: guest }),
    } as Response);

    const [first, second] = await Promise.all([
      ensureValidRealtimeToken(),
      ensureValidRealtimeToken(),
    ]);

    expect(first).toBe(guest);
    expect(second).toBe(guest);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('accessToken')).toBe(guest);
  });
});
