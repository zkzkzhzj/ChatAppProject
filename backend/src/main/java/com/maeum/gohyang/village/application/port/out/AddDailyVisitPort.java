package com.maeum.gohyang.village.application.port.out;

import java.time.LocalDate;

import com.maeum.gohyang.village.domain.DailyVisitType;

public interface AddDailyVisitPort {

    boolean addIfAbsent(LocalDate visitDate, String visitorKey, DailyVisitType visitorType);
}
