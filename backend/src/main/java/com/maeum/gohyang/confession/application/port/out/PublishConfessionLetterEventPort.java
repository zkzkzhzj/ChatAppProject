package com.maeum.gohyang.confession.application.port.out;

public interface PublishConfessionLetterEventPort {

    void publishLetterSent(long authorUserId, long confessionId, long letterId);
}
