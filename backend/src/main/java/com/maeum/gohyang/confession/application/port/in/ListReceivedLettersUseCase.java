package com.maeum.gohyang.confession.application.port.in;

import java.util.List;

import com.maeum.gohyang.confession.domain.ConfessionLetter;

public interface ListReceivedLettersUseCase {

    List<ConfessionLetter> execute(Query query);

    record Query(long requesterUserId, long confessionId) { }
}
