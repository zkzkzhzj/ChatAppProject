export function decodeJwtPayload(token: string): unknown {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  return JSON.parse(atob(padded));
}

export function hasMemberToken(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const token = window.localStorage.getItem('accessToken');
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'role' in payload &&
      (payload as { role?: unknown }).role === 'MEMBER'
    );
  } catch {
    return false;
  }
}
