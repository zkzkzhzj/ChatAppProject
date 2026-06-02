package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.GetConfessionDetailUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetConfessionDetailService implements GetConfessionDetailUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;

    @Override
    @Transactional(readOnly = true)
    public ConfessionRecord execute(long confessionId) {
        ConfessionRecord record = loadConfessionRecordPort.load(confessionId)
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isVisible()) {
            throw new ConfessionNotFoundException();
        }
        return record;
    }
}
