package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionLetter;

public interface SendConfessionLetterUseCase {

    ConfessionLetter execute(Command command);

    record Command(long senderUserId, long confessionId, String body) { }
}
