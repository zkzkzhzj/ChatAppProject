package com.maeum.gohyang.confession.application.port.out;

import java.util.List;
import java.util.Optional;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

public interface LoadConfessionRecordPort {

    Optional<ConfessionRecord> load(long confessionId);

    List<ConfessionRecord> loadVisible(ConfessionBookshelf bookshelf, int limit);

    List<ConfessionRecord> loadForLibrarian(ConfessionBookshelf bookshelf, int limit);
}
