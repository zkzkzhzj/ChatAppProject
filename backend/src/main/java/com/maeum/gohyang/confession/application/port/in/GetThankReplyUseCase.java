package com.maeum.gohyang.confession.application.port.in;

import java.util.Optional;

import com.maeum.gohyang.confession.domain.ConfessionThankReply;

public interface GetThankReplyUseCase {

    Optional<ConfessionThankReply> execute(Query query);

    record Query(long requesterUserId, long letterId) { }
}
