package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDateTime;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;
import com.maeum.gohyang.village.domain.SuggestionStatus;
import com.maeum.gohyang.village.error.InvalidSuggestionContentException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "suggestion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SuggestionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false, length = 80)
    private @Nullable String authorKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private @Nullable DailyVisitType authorType;

    @Column(nullable = false, length = Suggestion.MAX_TITLE_LENGTH)
    private @Nullable String title;

    @Column(nullable = false, length = Suggestion.MAX_BODY_LENGTH)
    private @Nullable String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private @Nullable SuggestionStatus status;

    @Column(length = Suggestion.MAX_BODY_LENGTH)
    private @Nullable String adminComment;

    @Column(nullable = false, updatable = false)
    private @Nullable LocalDateTime createdAt;

    @Column(nullable = false)
    private @Nullable LocalDateTime updatedAt;

    public static SuggestionJpaEntity from(Suggestion suggestion) {
        SuggestionJpaEntity e = new SuggestionJpaEntity();
        e.id = suggestion.getId();
        e.authorKey = suggestion.getAuthorKey();
        e.authorType = suggestion.getAuthorType();
        e.title = suggestion.getTitle();
        e.body = suggestion.getBody();
        e.status = suggestion.getStatus();
        e.adminComment = suggestion.getAdminComment();
        e.createdAt = suggestion.getCreatedAt();
        e.updatedAt = suggestion.getUpdatedAt();
        return e;
    }

    public Suggestion toDomain() {
        if (
                authorKey == null
                        || authorType == null
                        || title == null
                        || body == null
                        || status == null
                        || createdAt == null
                        || updatedAt == null
        ) {
            throw new InvalidSuggestionContentException();
        }
        return Suggestion.restore(
                id,
                authorKey,
                authorType,
                title,
                body,
                status,
                adminComment,
                createdAt,
                updatedAt
        );
    }
}
