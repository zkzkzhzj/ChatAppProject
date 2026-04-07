package com.maeum.gohyang.identity.adapter.in.security;

import com.maeum.gohyang.identity.domain.UserType;

/**
 * 파싱된 JWT의 핵심 클레임 VO.
 * userId는 GUEST 토큰일 경우 null이다.
 */
public record JwtClaims(Long userId, UserType role) {

    public boolean isGuest() {
        return role == UserType.GUEST;
    }
}
