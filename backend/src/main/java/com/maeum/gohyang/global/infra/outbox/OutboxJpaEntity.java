package com.maeum.gohyang.global.infra.outbox;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "outbox_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OutboxJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String aggregateId;

    @Column(nullable = false, length = 100)
    private String eventType;

    @Column(nullable = false, unique = true)
    private UUID eventId;

    /**
     * JSON 페이로드. PostgreSQL JSONB 컬럼에 저장.
     * @JdbcTypeCode(SqlTypes.JSON): Hibernate가 바인딩 시 JSON 타입으로 처리하도록 지시.
     * columnDefinition = "jsonb"만으로는 DDL 힌트만 제공되고, 실제 INSERT 시 varchar로 바인딩되어 PSQL 오류 발생.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OutboxEventStatus status;

    @Column(nullable = false)
    private int retryCount;

    @Column(nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    private LocalDateTime publishedAt;

    public static OutboxJpaEntity pending(String aggregateId, String eventType, String payload) {
        OutboxJpaEntity e = new OutboxJpaEntity();
        e.aggregateId = aggregateId;
        e.eventType = eventType;
        e.eventId = UUID.randomUUID();
        e.payload = payload;
        e.status = OutboxEventStatus.PENDING;
        e.retryCount = 0;
        e.occurredAt = LocalDateTime.now();
        return e;
    }

    public void markPublished() {
        this.status = OutboxEventStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
    }

    /** 상태를 FAILED로 변경한다. retryCount 갱신은 incrementRetryCount()를 별도 호출한다. */
    public void markFailed() {
        this.status = OutboxEventStatus.FAILED;
    }

    /** Transient 실패 시 재시도 횟수만 증가. 상태는 PENDING 유지. */
    public void incrementRetryCount() {
        this.retryCount += 1;
    }
}
