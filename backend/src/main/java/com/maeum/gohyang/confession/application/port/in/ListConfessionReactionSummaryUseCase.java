package com.maeum.gohyang.confession.application.port.in;

import java.util.List;

import com.maeum.gohyang.confession.domain.ConfessionReactionCount;

public interface ListConfessionReactionSummaryUseCase {

    List<ConfessionReactionCount> execute(long confessionId);
}
