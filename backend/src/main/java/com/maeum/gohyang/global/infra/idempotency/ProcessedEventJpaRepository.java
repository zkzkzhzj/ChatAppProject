package com.maeum.gohyang.global.infra.idempotency;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProcessedEventJpaRepository extends JpaRepository<ProcessedEventJpaEntity, Long> {

    boolean existsByEventId(UUID eventId);

    /**
     * 원자적 삽입: 이미 존재하면 무시하고, 삽입 성공 시 1 반환.
     * check-then-act race condition 방지용.
     */
    @Modifying
    @Query(value = "INSERT INTO processed_event (event_id, processed_at) "
            + "VALUES (:eventId, NOW()) ON CONFLICT (event_id) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("eventId") UUID eventId);
}
