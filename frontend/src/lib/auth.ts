/**
 * JWT 토큰에서 사용자 정보를 추출하는 유틸리티.
 *
 * 서버 JWT의 sub claim에 userId가 들어있다 (MEMBER 토큰 기준).
 * 외부 라이브러리 없이 base64 디코딩으로 payload를 파싱한다.
 */

export function getUserIdFromToken(): number | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload)) as { sub?: string };
    return decoded.sub ? Number(decoded.sub) : null;
  } catch {
    return null;
  }
}
