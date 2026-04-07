package com.maeum.gohyang.identity.adapter.in.security;

/**
 * @deprecated JwtProvider가 AuthenticatedUser를 직접 반환하면서 불필요해졌다.
 * global.security.AuthenticatedUser를 사용한다.
 */
@Deprecated
final class JwtClaims {
    private JwtClaims() {}
}
