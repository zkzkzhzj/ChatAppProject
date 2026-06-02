package com.maeum.gohyang.confession.domain;

public record ConfessionReactionCount(
        ConfessionReactionType reactionType,
        long count
) {
}
