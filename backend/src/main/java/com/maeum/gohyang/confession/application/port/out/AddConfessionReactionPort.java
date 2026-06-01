package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionReaction;

public interface AddConfessionReactionPort {

    boolean addIfAbsent(ConfessionReaction reaction);
}
