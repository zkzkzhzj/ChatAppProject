package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDateTime;

import com.maeum.gohyang.village.domain.Character;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "character")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CharacterJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static CharacterJpaEntity from(Character character) {
        CharacterJpaEntity e = new CharacterJpaEntity();
        e.userId = character.getUserId();
        e.updatedAt = character.getUpdatedAt();
        return e;
    }

    public Character toDomain() {
        return Character.restore(id, userId, updatedAt);
    }
}
