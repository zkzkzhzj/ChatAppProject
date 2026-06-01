package com.maeum.gohyang.confession.adapter.in.web;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

public record ConfessionSummaryResponse(
        long id,
        String title,
        String preview,
        ConfessionBookshelf bookshelf,
        LocalDateTime createdAt
) {

    private static final int PREVIEW_LENGTH = 80;

    public static ConfessionSummaryResponse from(ConfessionRecord record) {
        String body = record.getBody();
        String preview = body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH);
        return new ConfessionSummaryResponse(
                record.getId(),
                record.getTitle(),
                preview,
                record.getBookshelf(),
                record.getCreatedAt()
        );
    }
}
