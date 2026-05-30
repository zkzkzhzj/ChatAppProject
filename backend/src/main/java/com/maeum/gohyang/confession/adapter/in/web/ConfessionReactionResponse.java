package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.AddConfessionReactionUseCase;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;

public record ConfessionReactionResponse(
        ConfessionReactionType reactionType,
        boolean added
) {

    public static ConfessionReactionResponse from(AddConfessionReactionUseCase.Result result) {
        return new ConfessionReactionResponse(result.reactionType(), result.added());
    }
}
