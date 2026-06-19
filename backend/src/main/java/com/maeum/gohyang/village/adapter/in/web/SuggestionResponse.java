package com.maeum.gohyang.village.adapter.in.web;

import java.time.LocalDateTime;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;
import com.maeum.gohyang.village.domain.SuggestionStatus;
import com.maeum.gohyang.village.error.InvalidSuggestionStateException;

public record SuggestionResponse(
        long id,
        DailyVisitType authorType,
        String title,
        String body,
        SuggestionStatus status,
        @Nullable String adminComment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static SuggestionResponse from(Suggestion suggestion) {
        Long id = suggestion.getId();
        if (id == null) {
            throw new InvalidSuggestionStateException();
        }
        return new SuggestionResponse(
                id,
                suggestion.getAuthorType(),
                suggestion.getTitle(),
                suggestion.getBody(),
                suggestion.getStatus(),
                suggestion.getAdminComment(),
                suggestion.getCreatedAt(),
                suggestion.getUpdatedAt()
        );
    }
}
