package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionThankReply;

public interface SendThankReplyUseCase {

    ConfessionThankReply execute(Command command);

    record Command(long requesterUserId, long letterId, String body) { }
}
