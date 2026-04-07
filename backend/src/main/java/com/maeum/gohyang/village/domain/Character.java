package com.maeum.gohyang.village.domain;

import java.time.LocalDateTime;

/**
 * Village Context의 캐릭터 Domain Entity.
 * 인프라 기술에 의존하지 않는 순수 POJO.
 * 유저당 캐릭터는 1개(1:1 관계).
 */
public class Character {

    private final Long id;
    private final Long userId;
    private final LocalDateTime updatedAt;

    private Character(Long id, Long userId, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.updatedAt = updatedAt;
    }

    /** 유저 가입 시 기본 캐릭터 생성. id는 영속화 이후 부여된다. */
    public static Character newCharacter(Long userId) {
        return new Character(null, userId, LocalDateTime.now());
    }

    /**
     * 게스트 임시 캐릭터. DB에 저장하지 않는다.
     * 요청마다 동일한 기본값을 생성한다. 새로고침 시 초기화된다.
     * userId = null (게스트는 식별 ID 없음), id = null (비영속).
     */
    public static Character defaultGuest() {
        return new Character(null, null, LocalDateTime.now());
    }

    /** 영속화된 Character 복원 (Persistence Adapter → Domain). */
    public static Character restore(Long id, Long userId, LocalDateTime updatedAt) {
        return new Character(id, userId, updatedAt);
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
