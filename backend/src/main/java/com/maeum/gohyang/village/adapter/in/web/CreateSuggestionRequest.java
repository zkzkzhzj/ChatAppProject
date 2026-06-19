package com.maeum.gohyang.village.adapter.in.web;

import com.maeum.gohyang.village.application.port.in.CreateSuggestionUseCase;
import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSuggestionRequest(
        @NotBlank
        @Size(max = Suggestion.MAX_TITLE_LENGTH)
        String title,

        @NotBlank
        @Size(max = Suggestion.MAX_BODY_LENGTH)
        String body
) {

    public CreateSuggestionUseCase.Command toCommand(String authorKey, DailyVisitType authorType) {
        return new CreateSuggestionUseCase.Command(authorKey, authorType, title, body);
    }
}
