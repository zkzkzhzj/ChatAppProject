package com.maeum.gohyang.village.domain;

import java.time.LocalDateTime;
import java.time.ZoneId;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.village.error.InvalidSuggestionContentException;

public class Suggestion {

    public static final int MAX_TITLE_LENGTH = 120;
    public static final int MAX_BODY_LENGTH = 1000;

    private final @Nullable Long id;
    private final String authorKey;
    private final DailyVisitType authorType;
    private final String title;
    private final String body;
    private final SuggestionStatus status;
    private final @Nullable String adminComment;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private Suggestion(
            @Nullable Long id,
            String authorKey,
            DailyVisitType authorType,
            String title,
            String body,
            SuggestionStatus status,
            @Nullable String adminComment,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.id = id;
        this.authorKey = requireText(authorKey, 80);
        this.authorType = authorType;
        this.title = requireText(title, MAX_TITLE_LENGTH);
        this.body = requireText(body, MAX_BODY_LENGTH);
        this.status = status;
        this.adminComment = adminComment;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Suggestion newSuggestion(
            String authorKey,
            DailyVisitType authorType,
            String title,
            String body
    ) {
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        return new Suggestion(
                null,
                authorKey,
                authorType,
                title,
                body,
                SuggestionStatus.OPEN,
                null,
                now,
                now
        );
    }

    public static Suggestion restore(
            @Nullable Long id,
            String authorKey,
            DailyVisitType authorType,
            String title,
            String body,
            SuggestionStatus status,
            @Nullable String adminComment,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        return new Suggestion(id, authorKey, authorType, title, body, status, adminComment, createdAt, updatedAt);
    }

    private static String requireText(String value, int maxLength) {
        if (value == null) {
            throw new InvalidSuggestionContentException();
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty() || trimmed.length() > maxLength) {
            throw new InvalidSuggestionContentException();
        }
        return trimmed;
    }

    public @Nullable Long getId() {
        return id;
    }

    public String getAuthorKey() {
        return authorKey;
    }

    public DailyVisitType getAuthorType() {
        return authorType;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public SuggestionStatus getStatus() {
        return status;
    }

    public @Nullable String getAdminComment() {
        return adminComment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
