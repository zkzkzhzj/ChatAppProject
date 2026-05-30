package com.maeum.gohyang.confession.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.ListConfessionReactionSummaryUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionReactionPort;
import com.maeum.gohyang.confession.domain.ConfessionReactionCount;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ListConfessionReactionSummaryService implements ListConfessionReactionSummaryUseCase {

    private final LoadConfessionReactionPort loadConfessionReactionPort;

    @Override
    @Transactional(readOnly = true)
    public List<ConfessionReactionCount> execute(long confessionId) {
        return loadConfessionReactionPort.countByConfession(confessionId);
    }
}
