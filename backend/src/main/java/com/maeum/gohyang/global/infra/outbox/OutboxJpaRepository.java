package com.maeum.gohyang.global.infra.outbox;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxJpaRepository extends JpaRepository<OutboxJpaEntity, Long> {

    List<OutboxJpaEntity> findTop100ByStatusOrderByOccurredAtAsc(OutboxEventStatus status);
}
