package com.maeum.gohyang.confession.application.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.GetThankReplyUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.LoadThankReplyPort;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;
import com.maeum.gohyang.confession.error.ConfessionLetterNotFoundException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetThankReplyService implements GetThankReplyUseCase {

    private final LoadConfessionLetterPort loadConfessionLetterPort;
    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final LoadThankReplyPort loadThankReplyPort;

    @Override
    @Transactional(readOnly = true)
    public Optional<ConfessionThankReply> execute(Query query) {
        ConfessionLetter letter = loadConfessionLetterPort.loadLetter(query.letterId())
                .orElseThrow(ConfessionLetterNotFoundException::new);
        ConfessionRecord record = loadConfessionRecordPort.load(letter.getConfessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isAuthor(query.requesterUserId()) && letter.getSenderUserId() != query.requesterUserId()) {
            throw new ConfessionLetterNotFoundException();
        }
        return loadThankReplyPort.loadForLetter(query.letterId());
    }
}
