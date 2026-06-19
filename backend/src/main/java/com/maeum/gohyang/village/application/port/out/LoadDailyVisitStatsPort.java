package com.maeum.gohyang.village.application.port.out;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.maeum.gohyang.village.domain.DailyVisitStats;

public interface LoadDailyVisitStatsPort {

    DailyVisitStats load(LocalDate visitDate, OffsetDateTime startInclusive, OffsetDateTime endExclusive);
}
