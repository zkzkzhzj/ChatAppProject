package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.DeleteConfessionUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeleteConfessionService implements DeleteConfessionUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final SaveConfessionRecordPort saveConfessionRecordPort;

    @Override
    @Transactional
    public void execute(Command command) {
        ConfessionRecord record = loadConfessionRecordPort.load(command.confessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        saveConfessionRecordPort.save(record.deleteByAuthor(command.requesterUserId()));
    }
}
