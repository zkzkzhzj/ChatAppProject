package com.maeum.gohyang.village.application.port.in;

import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;

public interface CreateSuggestionUseCase {

    Suggestion execute(Command command);

    record Command(String authorKey, DailyVisitType authorType, String title, String body) {
    }
}
