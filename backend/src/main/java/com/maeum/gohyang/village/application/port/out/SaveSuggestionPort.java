package com.maeum.gohyang.village.application.port.out;

import com.maeum.gohyang.village.domain.Suggestion;

public interface SaveSuggestionPort {

    Suggestion save(Suggestion suggestion);
}
