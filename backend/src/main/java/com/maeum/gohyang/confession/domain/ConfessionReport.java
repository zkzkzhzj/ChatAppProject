package com.maeum.gohyang.confession.domain;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.error.InvalidConfessionReportException;

public class ConfessionReport {

    private final @Nullable Long id;
    private final long confessionId;
    private final long reporterUserId;
    private final ConfessionReportReason reason;
    private final LocalDateTime createdAt;

    private ConfessionReport(@Nullable Long id, long confessionId, long reporterUserId,
                             ConfessionReportReason reason, LocalDateTime createdAt) {
        this.id = id;
        this.confessionId = confessionId;
        this.reporterUserId = reporterUserId;
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public static ConfessionReport newReport(long confessionId, long reporterUserId,
                                             @Nullable ConfessionReportReason reason) {
        validate(reason);
        ConfessionReportReason checkedReason = Objects.requireNonNull(reason);
        return new ConfessionReport(
                null,
                confessionId,
                reporterUserId,
                checkedReason,
                LocalDateTime.now(ZoneId.systemDefault())
        );
    }

    public static ConfessionReport restore(@Nullable Long id, long confessionId, long reporterUserId,
                                           @Nullable ConfessionReportReason reason, LocalDateTime createdAt) {
        validate(reason);
        return new ConfessionReport(id, confessionId, reporterUserId, Objects.requireNonNull(reason), createdAt);
    }

    private static void validate(@Nullable ConfessionReportReason reason) {
        if (reason == null) {
            throw new InvalidConfessionReportException();
        }
    }

    public @Nullable Long getId() {
        return id;
    }

    public long getConfessionId() {
        return confessionId;
    }

    public long getReporterUserId() {
        return reporterUserId;
    }

    public ConfessionReportReason getReason() {
        return reason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
