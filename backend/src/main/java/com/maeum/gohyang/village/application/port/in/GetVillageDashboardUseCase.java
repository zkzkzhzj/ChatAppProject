package com.maeum.gohyang.village.application.port.in;

import java.time.LocalDate;

import com.maeum.gohyang.village.domain.DailyVisitStats;

public interface GetVillageDashboardUseCase {

    Result execute();

    record Result(LocalDate date, DailyVisitStats stats) {
    }
}
