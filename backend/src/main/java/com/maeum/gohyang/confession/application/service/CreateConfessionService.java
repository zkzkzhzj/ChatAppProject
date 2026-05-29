package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.CreateConfessionUseCase;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreateConfessionService implements CreateConfessionUseCase {

    private final SaveConfessionRecordPort saveConfessionRecordPort;

    @Override
    @Transactional
    public ConfessionRecord execute(Command command) {
        ConfessionRecord record = ConfessionRecord.newRecord(
                command.authorUserId(),
                command.title(),
                command.body(),
                command.bookshelf(),
                ConfessionRiskLevel.LOW
        );
        return saveConfessionRecordPort.save(record);
    }
}
