package com.maeum.gohyang.village.application.port.out;

import java.util.List;

import com.maeum.gohyang.village.domain.Suggestion;

public interface LoadSuggestionsPort {

    List<Suggestion> loadRecent(int limit);
}
