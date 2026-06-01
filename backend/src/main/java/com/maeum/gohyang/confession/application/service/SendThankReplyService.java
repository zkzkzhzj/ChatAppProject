package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.SendThankReplyUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveThankReplyPort;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;
import com.maeum.gohyang.confession.error.ConfessionLetterNotFoundException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SendThankReplyService implements SendThankReplyUseCase {

    private final LoadConfessionLetterPort loadConfessionLetterPort;
    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final SaveThankReplyPort saveThankReplyPort;

    @Override
    @Transactional
    public ConfessionThankReply execute(Command command) {
        ConfessionLetter letter = loadConfessionLetterPort.loadLetter(command.letterId())
                .orElseThrow(ConfessionLetterNotFoundException::new);
        ConfessionRecord record = loadConfessionRecordPort.load(letter.getConfessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isAuthor(command.requesterUserId())) {
            throw new ConfessionLetterNotFoundException();
        }
        return saveThankReplyPort.save(
                ConfessionThankReply.newReply(command.letterId(), command.requesterUserId(), command.body())
        );
    }
}
