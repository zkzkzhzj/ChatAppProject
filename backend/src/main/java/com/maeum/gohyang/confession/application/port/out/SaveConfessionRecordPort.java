package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionRecord;

public interface SaveConfessionRecordPort {

    ConfessionRecord save(ConfessionRecord confessionRecord);
}
