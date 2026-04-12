package com.maeum.gohyang.global.infra.idempotency;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedEventJpaRepository extends JpaRepository<ProcessedEventJpaEntity, Long> {

    boolean existsByEventId(UUID eventId);
}
