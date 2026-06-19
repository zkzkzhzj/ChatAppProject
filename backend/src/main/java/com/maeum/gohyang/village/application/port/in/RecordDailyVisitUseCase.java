package com.maeum.gohyang.village.application.port.in;

import java.time.LocalDate;

import com.maeum.gohyang.village.domain.DailyVisitStats;
import com.maeum.gohyang.village.domain.DailyVisitType;

public interface RecordDailyVisitUseCase {

    Result execute(Command command);

    record Command(String visitorKey, DailyVisitType visitorType) {
    }

    record Result(LocalDate date, boolean added, DailyVisitStats stats) {
    }
}
