package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

public interface CreateConfessionUseCase {

    ConfessionRecord execute(Command command);

    record Command(long authorUserId, String title, String body, ConfessionBookshelf bookshelf) { }
}
