import { isTokenExpired } from '@/lib/auth';

const TOKEN_KEY = 'accessToken';
let guestTokenRequest: Promise<string | null> | null = null;

export type RealtimeTokenRole = 'MEMBER' | 'GUEST';

export function parseTokenRole(token: string | null): RealtimeTokenRole | null {
  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role === 'MEMBER' || payload.role === 'GUEST' ? payload.role : null;
  } catch {
    return null;
  }
}

async function issueGuestToken(): Promise<string | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const res = await fetch(`${apiBase}/api/v1/auth/guest`, { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    return data.accessToken;
  } catch (err) {
    console.warn('[realtimeAuth] 게스트 토큰 발급 실패', err);
    return null;
  }
}

async function issueAndStoreGuestToken(): Promise<string | null> {
  guestTokenRequest ??= issueGuestToken().finally(() => {
    guestTokenRequest = null;
  });
  const fresh = await guestTokenRequest;
  if (fresh) localStorage.setItem(TOKEN_KEY, fresh);
  return fresh;
}

export async function ensureValidRealtimeToken(): Promise<string | null> {
  const stored = localStorage.getItem(TOKEN_KEY);

  if (!stored) {
    return issueAndStoreGuestToken();
  }

  if (!isTokenExpired(stored)) {
    return stored;
  }

  const role = parseTokenRole(stored);
  if (role === 'GUEST') {
    console.log('[realtimeAuth] 게스트 토큰 만료 임박/만료 - 사전 갱신');
    localStorage.removeItem(TOKEN_KEY);
    return issueAndStoreGuestToken();
  }

  console.warn(
    '[realtimeAuth] 멤버 토큰 만료 임박/만료 - 자동 갱신 미지원, 서버 거부 시 재로그인 필요',
  );
  return stored;
}
