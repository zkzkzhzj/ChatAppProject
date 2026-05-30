package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionReactionType;

public interface AddConfessionReactionUseCase {

    Result execute(Command command);

    record Command(long userId, long confessionId, ConfessionReactionType reactionType) { }

    record Result(boolean added, ConfessionReactionType reactionType) { }
}
