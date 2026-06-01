package com.maeum.gohyang.confession.application.service;

import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.SendConfessionLetterUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.PublishConfessionLetterEventPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionLetterPort;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SendConfessionLetterService implements SendConfessionLetterUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final SaveConfessionLetterPort saveConfessionLetterPort;
    private final PublishConfessionLetterEventPort publishConfessionLetterEventPort;

    @Override
    @Transactional
    public ConfessionLetter execute(Command command) {
        ConfessionRecord record = loadConfessionRecordPort.load(command.confessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isVisible() || record.isAuthor(command.senderUserId())) {
            throw new ConfessionAccessDeniedException();
        }
        ConfessionLetter letter = saveConfessionLetterPort.save(
                ConfessionLetter.newLetter(command.confessionId(), command.senderUserId(), command.body())
        );
        publishConfessionLetterEventPort.publishLetterSent(
                record.getAuthorUserId(),
                letter.getConfessionId(),
                Objects.requireNonNull(letter.getId())
        );
        return letter;
    }
}
