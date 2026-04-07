package com.maeum.gohyang.global.infra.idempotency;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedEventJpaRepository extends JpaRepository<ProcessedEventJpaEntity, Long> {

    boolean existsByEventId(UUID eventId);
}
