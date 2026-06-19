package com.maeum.gohyang.village.adapter.in.web;

import java.time.LocalDate;

import com.maeum.gohyang.village.application.port.in.RecordDailyVisitUseCase;

public record DailyVisitResponse(
        LocalDate date,
        boolean added,
        long guestCount,
        long memberCount,
        long totalCount,
        long confessionCount
) {

    public static DailyVisitResponse from(RecordDailyVisitUseCase.Result result) {
        return new DailyVisitResponse(
                result.date(),
                result.added(),
                result.stats().guestCount(),
                result.stats().memberCount(),
                result.stats().totalCount(),
                result.stats().confessionCount()
        );
    }
}
