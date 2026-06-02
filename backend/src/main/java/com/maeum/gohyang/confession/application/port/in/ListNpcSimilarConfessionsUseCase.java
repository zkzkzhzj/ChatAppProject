package com.maeum.gohyang.confession.application.port.in;

import java.util.List;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

public interface ListNpcSimilarConfessionsUseCase {

    List<ConfessionRecord> execute(Query query);

    record Query(ConfessionBookshelf bookshelf, int limit) { }
}
