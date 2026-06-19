package com.maeum.gohyang.village.application.port.in;

import java.util.List;

import com.maeum.gohyang.village.domain.Suggestion;

public interface ListSuggestionsUseCase {

    List<Suggestion> execute(int limit);
}
