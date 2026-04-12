package com.maeum.gohyang.global.infra.outbox;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OutboxJpaRepository extends JpaRepository<OutboxJpaEntity, Long> {

    List<OutboxJpaEntity> findTop100ByStatusOrderByOccurredAtAsc(OutboxEventStatus status);
}
