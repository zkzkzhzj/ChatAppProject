package com.maeum.gohyang.confession.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.ListNpcSimilarConfessionsUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ListNpcSimilarConfessionsService implements ListNpcSimilarConfessionsUseCase {

    private static final int DEFAULT_LIMIT = 5;

    private final LoadConfessionRecordPort loadConfessionRecordPort;

    @Override
    @Transactional(readOnly = true)
    public List<ConfessionRecord> execute(Query query) {
        int limit = query.limit() <= 0 ? DEFAULT_LIMIT : query.limit();
        return loadConfessionRecordPort.loadForNpc(query.bookshelf(), limit);
    }
}
