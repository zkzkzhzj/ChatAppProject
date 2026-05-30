package com.maeum.gohyang.confession.application.port.out;

import java.util.List;

import com.maeum.gohyang.confession.domain.ConfessionReactionCount;

public interface LoadConfessionReactionPort {

    List<ConfessionReactionCount> countByConfession(long confessionId);
}
