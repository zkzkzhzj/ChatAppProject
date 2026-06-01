package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionReactionType;

public interface DeleteConfessionReactionPort {

    void delete(long userId, long confessionId, ConfessionReactionType reactionType);
}
