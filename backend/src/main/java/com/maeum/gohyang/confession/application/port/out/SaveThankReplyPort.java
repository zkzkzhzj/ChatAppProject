package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionThankReply;

public interface SaveThankReplyPort {

    ConfessionThankReply save(ConfessionThankReply thankReply);
}
