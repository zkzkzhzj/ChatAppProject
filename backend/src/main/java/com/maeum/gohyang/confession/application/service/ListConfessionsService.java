package com.maeum.gohyang.confession.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.ListConfessionsUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ListConfessionsService implements ListConfessionsUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;

    @Override
    @Transactional(readOnly = true)
    public List<ConfessionRecord> execute(Query query) {
        return loadConfessionRecordPort.loadVisible(query.bookshelf(), query.limit());
    }
}
