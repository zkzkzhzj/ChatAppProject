package com.maeum.gohyang.confession.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.ListReceivedLettersUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ListReceivedLettersService implements ListReceivedLettersUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final LoadConfessionLetterPort loadConfessionLetterPort;

    @Override
    @Transactional(readOnly = true)
    public List<ConfessionLetter> execute(Query query) {
        ConfessionRecord record = loadConfessionRecordPort.load(query.confessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isAuthor(query.requesterUserId())) {
            throw new ConfessionAccessDeniedException();
        }
        return loadConfessionLetterPort.loadReceived(query.confessionId());
    }
}
