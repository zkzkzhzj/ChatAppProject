package com.maeum.gohyang.global.infra.idempotency;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "processed_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProcessedEventJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID eventId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime processedAt;

    public static ProcessedEventJpaEntity of(UUID eventId) {
        ProcessedEventJpaEntity e = new ProcessedEventJpaEntity();
        e.eventId = eventId;
        e.processedAt = LocalDateTime.now();
        return e;
    }
}
