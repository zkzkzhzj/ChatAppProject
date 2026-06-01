package com.maeum.gohyang.confession.application.port.in;

import com.maeum.gohyang.confession.domain.ConfessionRecord;

public interface GetConfessionDetailUseCase {

    ConfessionRecord execute(long confessionId);
}
