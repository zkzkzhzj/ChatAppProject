package com.maeum.gohyang.identity.domain;

import java.time.LocalDateTime;

/**
 * Identity Context의 핵심 Domain Entity.
 * 인프라 기술에 의존하지 않는 순수 POJO.
 * 이메일/비밀번호는 UserLocalAuth가 관리한다.
 */
public class User {

    private final Long id;
    private final UserType type;
    private final LocalDateTime createdAt;

    private User(Long id, UserType type, LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.createdAt = createdAt;
    }

    /** 신규 회원가입 시 MEMBER 생성. id는 영속화 이후 부여된다. */
    public static User newMember() {
        return new User(null, UserType.MEMBER, LocalDateTime.now());
    }

    /** 영속화된 User 복원 (Persistence Adapter → Domain). */
    public static User restore(Long id, UserType type, LocalDateTime createdAt) {
        return new User(id, type, createdAt);
    }

    public Long getId() { return id; }
    public UserType getType() { return type; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
