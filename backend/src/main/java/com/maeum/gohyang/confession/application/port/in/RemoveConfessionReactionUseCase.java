package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionReactionType;

public interface RemoveConfessionReactionUseCase {

    void execute(Command command);

    record Command(long userId, long confessionId, ConfessionReactionType reactionType) { }
}
