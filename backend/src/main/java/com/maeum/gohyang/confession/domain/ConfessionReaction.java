package com.maeum.gohyang.confession.domain;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Objects;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.error.InvalidConfessionReactionException;

public class ConfessionReaction {

    private final @Nullable Long id;
    private final long confessionId;
    private final long userId;
    private final ConfessionReactionType reactionType;
    private final LocalDateTime createdAt;

    private ConfessionReaction(@Nullable Long id, long confessionId, long userId,
                               ConfessionReactionType reactionType, LocalDateTime createdAt) {
        this.id = id;
        this.confessionId = confessionId;
        this.userId = userId;
        this.reactionType = reactionType;
        this.createdAt = createdAt;
    }

    public static ConfessionReaction newReaction(long confessionId, long userId,
                                                 @Nullable ConfessionReactionType reactionType) {
        validate(reactionType);
        ConfessionReactionType checkedReactionType = Objects.requireNonNull(reactionType);
        return new ConfessionReaction(
                null,
                confessionId,
                userId,
                checkedReactionType,
                LocalDateTime.now(ZoneOffset.UTC)
        );
    }

    public static ConfessionReaction restore(@Nullable Long id, long confessionId, long userId,
                                             @Nullable ConfessionReactionType reactionType,
                                             LocalDateTime createdAt) {
        validate(reactionType);
        return new ConfessionReaction(id, confessionId, userId, Objects.requireNonNull(reactionType), createdAt);
    }

    private static void validate(@Nullable ConfessionReactionType reactionType) {
        if (reactionType == null) {
            throw new InvalidConfessionReactionException();
        }
    }

    public @Nullable Long getId() {
        return id;
    }

    public long getConfessionId() {
        return confessionId;
    }

    public long getUserId() {
        return userId;
    }

    public ConfessionReactionType getReactionType() {
        return reactionType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
