package com.maeum.gohyang.global.infra.idempotency;

import java.util.UUID;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Kafka at-least-once 환경에서 동일 이벤트의 중복 처리를 막는 멱등성 가드.
 * 이벤트 처리 완료 여부를 processed_event 테이블로 관리한다.
 */
@Component
@RequiredArgsConstructor
public class IdempotencyGuard {

    private final ProcessedEventJpaRepository repository;

    public boolean isAlreadyProcessed(UUID key) {
        return repository.existsByEventId(key);
    }

    public void markAsProcessed(UUID key) {
        repository.save(ProcessedEventJpaEntity.of(key));
    }
}
