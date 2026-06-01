package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.AddConfessionReactionUseCase;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;

import jakarta.validation.constraints.NotNull;

public record ConfessionReactionRequest(
        @NotNull
        ConfessionReactionType reactionType
) {

    public AddConfessionReactionUseCase.Command toCommand(long userId, long confessionId) {
        return new AddConfessionReactionUseCase.Command(userId, confessionId, reactionType);
    }
}
