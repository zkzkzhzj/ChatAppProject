/**
 * JWT 토큰에서 사용자 정보를 추출하는 유틸리티.
 *
 * 서버 JWT의 sub claim에 userId(MEMBER) 또는 guest-UUID(GUEST)가 들어있다.
 * 외부 라이브러리 없이 base64 디코딩으로 payload를 파싱한다.
 */

interface TokenPayload {
  sub?: string;
  role?: 'MEMBER' | 'GUEST';
  exp?: number;
}

const TOKEN_KEY = 'accessToken';
const MEMBER_DISPLAY_ID_PREFIX = 'user-';
/** 만료 임박 마진 — 서버 도달 전에 갱신해 'Invalid or expired token' 사전 차단 */
const EXPIRY_MARGIN_MS = 60_000;

function decodePayload(token: string): TokenPayload | null {
  try {
    const part = token.split('.')[1];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as TokenPayload;
  } catch {
    return null;
  }
}

export function getUserIdFromToken(): number | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const payload = decodePayload(token);
  return payload?.sub ? Number(payload.sub) : null;
}

/**
 * 토큰의 displayId 를 반환한다 (서버 AuthenticatedUser.displayId() 와 동일 규칙).
 * MEMBER: "user-{sub}", GUEST: sub (guest-UUID).
 */
export function getDisplayIdFromToken(token?: string | null): string | null {
  const raw = token ?? localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  const payload = decodePayload(raw);
  if (!payload?.sub || !payload.role) return null;
  return payload.role === 'GUEST' ? payload.sub : `${MEMBER_DISPLAY_ID_PREFIX}${payload.sub}`;
}

/**
 * 토큰이 만료되었거나 임박했는지 검사한다.
 * 만료된 토큰을 STOMP CONNECT 로 보내면 서버가 'Invalid or expired token' 으로 거부하고,
 * 클라이언트는 새 토큰(=새 sessionId)을 발급받아 자기인식이 깨진다 (#28).
 */
export function isTokenExpired(token?: string | null, marginMs = EXPIRY_MARGIN_MS): boolean {
  const raw = token ?? localStorage.getItem(TOKEN_KEY);
  if (!raw) return true;
  const payload = decodePayload(raw);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + marginMs;
}
