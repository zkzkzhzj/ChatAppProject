package com.maeum.gohyang.confession.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.ListSentLettersUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.domain.ConfessionLetter;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ListSentLettersService implements ListSentLettersUseCase {

    private final LoadConfessionLetterPort loadConfessionLetterPort;

    @Override
    @Transactional(readOnly = true)
    public List<ConfessionLetter> execute(long senderUserId) {
        return loadConfessionLetterPort.loadSent(senderUserId);
    }
}
