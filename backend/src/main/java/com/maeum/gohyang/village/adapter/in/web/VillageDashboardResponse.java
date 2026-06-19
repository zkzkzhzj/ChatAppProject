package com.maeum.gohyang.village.adapter.in.web;

import java.time.LocalDate;

import com.maeum.gohyang.village.application.port.in.GetVillageDashboardUseCase;

public record VillageDashboardResponse(
        LocalDate date,
        long guestCount,
        long memberCount,
        long totalCount,
        long confessionCount
) {

    public static VillageDashboardResponse from(GetVillageDashboardUseCase.Result result) {
        return new VillageDashboardResponse(
                result.date(),
                result.stats().guestCount(),
                result.stats().memberCount(),
                result.stats().totalCount(),
                result.stats().confessionCount()
        );
    }
}
