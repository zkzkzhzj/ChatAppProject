package com.maeum.gohyang.confession.adapter.out.persistence;

import java.time.LocalDateTime;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.domain.ConfessionReport;
import com.maeum.gohyang.confession.domain.ConfessionReportReason;
import com.maeum.gohyang.confession.error.InvalidConfessionReportException;

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
@Table(name = "confession_report")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConfessionReportJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false)
    private @Nullable Long confessionId;

    @Column(nullable = false)
    private @Nullable Long reporterUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private @Nullable ConfessionReportReason reason;

    @Column(nullable = false, updatable = false)
    private @Nullable LocalDateTime createdAt;

    public static ConfessionReportJpaEntity from(ConfessionReport report) {
        ConfessionReportJpaEntity e = new ConfessionReportJpaEntity();
        e.id = report.getId();
        e.confessionId = report.getConfessionId();
        e.reporterUserId = report.getReporterUserId();
        e.reason = report.getReason();
        e.createdAt = report.getCreatedAt();
        return e;
    }

    public ConfessionReport toDomain() {
        if (confessionId == null || reporterUserId == null || reason == null || createdAt == null) {
            throw new InvalidConfessionReportException();
        }
        return ConfessionReport.restore(id, confessionId, reporterUserId, reason, createdAt);
    }
}
