package com.maeum.gohyang.global.security;

/**
 * 유저 유형. global 패키지에 위치하는 이유:
 * - JWT 클레임, Security Principal, Identity 도메인이 모두 참조하는 인증 인프라 개념이다.
 * - identity/domain에 두면 다른 도메인이 identity에 직접 의존하게 된다.
 */
public enum UserType {
    MEMBER,
    GUEST
}
