package com.maeum.gohyang.global.security;

import java.util.Optional;

/**
 * JWT 토큰을 파싱해 AuthenticatedUser를 반환하는 포트.
 *
 * global/security에 위치하는 이유:
 * - StompAuthChannelInterceptor(global/config)와 JwtFilter(identity/adapter) 모두 토큰 파싱이 필요하다.
 * - JwtProvider(identity)를 global에서 직접 참조하면 도메인 경계를 침범하므로,
 *   이 포트를 통해 의존 방향을 역전시킨다.
 */
public interface ParseTokenPort {

    Optional<AuthenticatedUser> parse(String token);
}
