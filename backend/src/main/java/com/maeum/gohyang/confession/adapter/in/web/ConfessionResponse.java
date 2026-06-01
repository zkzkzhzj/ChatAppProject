package com.maeum.gohyang.confession.adapter.in.web;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;

public record ConfessionResponse(
        long id,
        String title,
        String body,
        ConfessionBookshelf bookshelf,
        ConfessionStatus status,
        ConfessionRiskLevel riskLevel,
        LocalDateTime createdAt
) {

    public static ConfessionResponse from(ConfessionRecord record) {
        return new ConfessionResponse(
                record.getId(),
                record.getTitle(),
                record.getBody(),
                record.getBookshelf(),
                record.getStatus(),
                record.getRiskLevel(),
                record.getCreatedAt()
        );
    }
}
