package com.maeum.gohyang.confession.adapter.in.web;

import java.time.LocalDateTime;
import java.util.Objects;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;

public record ConfessionLetterResponse(
        long id,
        long confessionId,
        String body,
        ConfessionLetterStatus status,
        @Nullable LocalDateTime authorReadAt,
        LocalDateTime createdAt
) {

    public static ConfessionLetterResponse from(ConfessionLetter letter) {
        return new ConfessionLetterResponse(
                Objects.requireNonNull(letter.getId()),
                letter.getConfessionId(),
                letter.getBody(),
                letter.getStatus(),
                letter.getAuthorReadAt(),
                letter.getCreatedAt()
        );
    }
}
