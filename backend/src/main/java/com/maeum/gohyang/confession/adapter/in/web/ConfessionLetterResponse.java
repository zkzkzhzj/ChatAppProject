package com.maeum.gohyang.confession.adapter.in.web;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;

public record ConfessionLetterResponse(
        long id,
        long confessionId,
        String body,
        ConfessionLetterStatus status,
        LocalDateTime createdAt
) {

    public static ConfessionLetterResponse from(ConfessionLetter letter) {
        return new ConfessionLetterResponse(
                letter.getId(),
                letter.getConfessionId(),
                letter.getBody(),
                letter.getStatus(),
                letter.getCreatedAt()
        );
    }
}
