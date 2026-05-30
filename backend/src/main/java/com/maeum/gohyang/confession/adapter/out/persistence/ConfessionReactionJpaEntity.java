package com.maeum.gohyang.confession.adapter.out.persistence;

import java.time.LocalDateTime;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.domain.ConfessionReaction;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;
import com.maeum.gohyang.confession.error.InvalidConfessionReactionException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "confession_reaction")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConfessionReactionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false)
    private @Nullable Long confessionId;

    @Column(nullable = false)
    private @Nullable Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private @Nullable ConfessionReactionType reactionType;

    @Column(nullable = false, updatable = false)
    private @Nullable LocalDateTime createdAt;

    public static ConfessionReactionJpaEntity from(ConfessionReaction reaction) {
        ConfessionReactionJpaEntity e = new ConfessionReactionJpaEntity();
        e.id = reaction.getId();
        e.confessionId = reaction.getConfessionId();
        e.userId = reaction.getUserId();
        e.reactionType = reaction.getReactionType();
        e.createdAt = reaction.getCreatedAt();
        return e;
    }

    public ConfessionReaction toDomain() {
        if (confessionId == null || userId == null || reactionType == null || createdAt == null) {
            throw new InvalidConfessionReactionException();
        }
        return ConfessionReaction.restore(id, confessionId, userId, reactionType, createdAt);
    }
}
