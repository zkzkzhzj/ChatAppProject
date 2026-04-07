package com.maeum.gohyang.global.security;

/**
 * Spring Security Principal로 사용되는 인증된 유저 정보.
 *
 * global 패키지에 위치하는 이유:
 * - @AuthenticationPrincipal로 모든 도메인의 Controller에서 사용된다.
 * - identity 도메인에 두면 다른 도메인이 identity에 직접 의존하게 된다.
 *
 * userId는 GUEST 토큰일 경우 null이다.
 */
public record AuthenticatedUser(Long userId, UserType role) {

    public boolean isGuest() {
        return role == UserType.GUEST;
    }
}
