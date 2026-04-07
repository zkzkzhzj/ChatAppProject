package com.maeum.gohyang.global.infra.idempotency;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

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
