import { afterEach, describe, expect, it } from 'vitest';

import { getDisplayIdFromToken, isTokenExpired } from './auth';

/**
 * #28 fix 핵심 — 만료된 토큰을 STOMP 로 보내지 않도록 사전 차단.
 * 토큰의 displayId 는 서버 AuthenticatedUser.displayId() 와 동일 규칙이어야 한다.
 */

function makeToken(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload));
  return `header.${body}.signature`;
}

describe('auth — JWT 토큰 유틸 (#28 fix)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe('isTokenExpired', () => {
    it('exp 가 과거면 만료로 판정한다', () => {
      // Given
      const past = Math.floor(Date.now() / 1000) - 10;
      const token = makeToken({ exp: past, sub: 'guest-x', role: 'GUEST' });

      // When / Then
      expect(isTokenExpired(token)).toBe(true);
    });

    it('exp 가 충분히 미래면 유효로 판정한다', () => {
      // Given
      const future = Math.floor(Date.now() / 1000) + 3600;
      const token = makeToken({ exp: future, sub: 'guest-x', role: 'GUEST' });

      // When / Then
      expect(isTokenExpired(token)).toBe(false);
    });

    it('exp 가 마진(기본 60s) 이내면 만료 임박으로 판정한다', () => {
      // Given: 30초 후 만료 — 60초 마진보다 가까움
      const soon = Math.floor(Date.now() / 1000) + 30;
      const token = makeToken({ exp: soon, sub: 'guest-x', role: 'GUEST' });

      // When / Then: 사전 갱신 트리거
      expect(isTokenExpired(token)).toBe(true);
    });

    it('토큰 인자가 없고 localStorage 도 비어 있으면 만료로 판정한다', () => {
      // Given: localStorage 비어 있음
      // When / Then
      expect(isTokenExpired()).toBe(true);
    });

    it('exp claim 이 없으면 만료로 판정한다 (안전한 기본값)', () => {
      // Given: exp 누락 토큰 — 비정상 토큰은 갱신 트리거
      const token = makeToken({ sub: 'guest-x', role: 'GUEST' });

      // When / Then
      expect(isTokenExpired(token)).toBe(true);
    });

    it('잘못된 형식 토큰은 만료로 판정한다', () => {
      // Given: base64 디코딩 불가능
      // When / Then
      expect(isTokenExpired('not-a-jwt')).toBe(true);
    });

    it('인자 없을 때 localStorage 의 토큰을 읽는다', () => {
      // Given
      const future = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('accessToken', makeToken({ exp: future, sub: 'g', role: 'GUEST' }));

      // When / Then
      expect(isTokenExpired()).toBe(false);
    });
  });

  describe('getDisplayIdFromToken', () => {
    it('GUEST 토큰의 displayId 는 sub 그대로다 (서버 AuthenticatedUser 와 일치)', () => {
      // Given
      const token = makeToken({ sub: 'guest-abc-123', role: 'GUEST', exp: 9999999999 });

      // When / Then
      expect(getDisplayIdFromToken(token)).toBe('guest-abc-123');
    });

    it('MEMBER 토큰의 displayId 는 "user-{sub}" 다', () => {
      // Given
      const token = makeToken({ sub: '42', role: 'MEMBER', exp: 9999999999 });

      // When / Then
      expect(getDisplayIdFromToken(token)).toBe('user-42');
    });

    it('role 이 없으면 null 을 반환한다 (자기인식 비활성화)', () => {
      // Given
      const token = makeToken({ sub: 'guest-x', exp: 9999999999 });

      // When / Then
      expect(getDisplayIdFromToken(token)).toBeNull();
    });

    it('토큰이 없으면 null 을 반환한다', () => {
      // Given: localStorage 비어 있음
      // When / Then
      expect(getDisplayIdFromToken()).toBeNull();
    });

    it('인자 없을 때 localStorage 의 토큰을 읽는다', () => {
      // Given
      localStorage.setItem(
        'accessToken',
        makeToken({ sub: 'guest-z', role: 'GUEST', exp: 9999999999 }),
      );

      // When / Then
      expect(getDisplayIdFromToken()).toBe('guest-z');
    });
  });
});
