package com.maeum.gohyang.confession.application.port.in;

import java.util.List;

import com.maeum.gohyang.confession.domain.ConfessionLetter;

public interface ListSentLettersUseCase {

    List<ConfessionLetter> execute(long senderUserId);
}
