package com.maeum.gohyang.confession.application.port.in;

public interface DeleteConfessionUseCase {

    void execute(Command command);

    record Command(long requesterUserId, long confessionId) { }
}
