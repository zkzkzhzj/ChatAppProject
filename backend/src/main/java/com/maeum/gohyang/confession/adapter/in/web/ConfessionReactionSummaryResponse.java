package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.domain.ConfessionReactionCount;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;

public record ConfessionReactionSummaryResponse(
        ConfessionReactionType reactionType,
        long count
) {

    public static ConfessionReactionSummaryResponse from(ConfessionReactionCount count) {
        return new ConfessionReactionSummaryResponse(count.reactionType(), count.count());
    }
}
