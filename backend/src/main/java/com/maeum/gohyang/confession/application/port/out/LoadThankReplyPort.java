package com.maeum.gohyang.confession.application.port.out;

import java.util.Optional;

import com.maeum.gohyang.confession.domain.ConfessionThankReply;

public interface LoadThankReplyPort {

    Optional<ConfessionThankReply> loadForLetter(long letterId);
}
