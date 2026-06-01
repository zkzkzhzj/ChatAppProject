package com.maeum.gohyang.confession.adapter.out.persistence;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;

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
@Table(name = "confession_record")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConfessionRecordJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long authorUserId;

    @Column(nullable = false, length = ConfessionRecord.MAX_TITLE_LENGTH)
    private String title;

    @Column(nullable = false, length = ConfessionRecord.MAX_BODY_LENGTH)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ConfessionBookshelf bookshelf;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ConfessionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ConfessionRiskLevel riskLevel;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static ConfessionRecordJpaEntity from(ConfessionRecord record) {
        ConfessionRecordJpaEntity e = new ConfessionRecordJpaEntity();
        e.id = record.getId();
        e.authorUserId = record.getAuthorUserId();
        e.title = record.getTitle();
        e.body = record.getBody();
        e.bookshelf = record.getBookshelf();
        e.status = record.getStatus();
        e.riskLevel = record.getRiskLevel();
        e.createdAt = record.getCreatedAt();
        e.updatedAt = record.getUpdatedAt();
        return e;
    }

    public ConfessionRecord toDomain() {
        return ConfessionRecord.restore(
                id,
                authorUserId,
                title,
                body,
                bookshelf,
                status,
                riskLevel,
                createdAt,
                updatedAt
        );
    }
}
