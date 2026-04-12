package com.maeum.gohyang.village.domain;

import java.time.LocalDateTime;

/**
 * Village Context의 공간 Domain Entity.
 * 인프라 기술에 의존하지 않는 순수 POJO.
 * 유저당 기본 공간(is_default=true)이 1개 존재한다.
 */
public class Space {

    private final Long id;
    private final Long userId;
    private final boolean isDefault;
    private final SpaceTheme theme;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private Space(Long id, Long userId, boolean isDefault, SpaceTheme theme,
                  LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.isDefault = isDefault;
        this.theme = theme;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /** 유저 가입 시 기본 공간 생성. id는 영속화 이후 부여된다. */
    public static Space newDefaultSpace(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return new Space(null, userId, true, SpaceTheme.DEFAULT, now, now);
    }

    /** 영속화된 Space 복원 (Persistence Adapter → Domain). */
    public static Space restore(Long id, Long userId, boolean isDefault, SpaceTheme theme,
                                LocalDateTime createdAt, LocalDateTime updatedAt) {
        return new Space(id, userId, isDefault, theme, createdAt, updatedAt);
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public SpaceTheme getTheme() {
        return theme;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
