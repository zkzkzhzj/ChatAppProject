package com.maeum.gohyang.global.security;

import java.security.Principal;

/**
 * Spring Security Principal로 사용되는 인증된 유저 정보.
 *
 * global 패키지에 위치하는 이유:
 * - @AuthenticationPrincipal로 모든 도메인의 Controller에서 사용된다.
 * - identity 도메인에 두면 다른 도메인이 identity에 직접 의존하게 된다.
 *
 * userId는 GUEST 토큰일 경우 null이다.
 * sessionId는 GUEST 토큰일 경우 고유 식별자(guest-UUID), MEMBER일 경우 null이다.
 */
public record AuthenticatedUser(Long userId, UserType role, String sessionId) implements Principal {

    /** MEMBER용 간편 생성자 (sessionId 없음). */
    public AuthenticatedUser(Long userId, UserType role) {
        this(userId, role, null);
    }

    @Override
    public String getName() {
        if (userId != null) {
            return String.valueOf(userId);
        }
        return sessionId != null ? sessionId : "guest";
    }

    public boolean isGuest() {
        return role == UserType.GUEST;
    }

    /**
     * 위치 공유 등에서 사용하는 고유 식별자.
     * MEMBER: "user-{userId}", GUEST: sessionId (guest-UUID).
     */
    public String displayId() {
        if (userId != null) {
            return "user-" + userId;
        }
        return sessionId != null ? sessionId : "guest";
    }
}
