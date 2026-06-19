package com.maeum.gohyang.village.domain;

public record DailyVisitStats(
        long guestCount,
        long memberCount,
        long totalCount,
        long confessionCount
) {
}
