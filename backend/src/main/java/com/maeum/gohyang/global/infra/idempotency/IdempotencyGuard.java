package com.maeum.gohyang.global.infra.idempotency;

import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Kafka at-least-once 환경에서 동일 이벤트의 중복 처리를 막는 멱등성 가드.
 * processed_event 테이블에 원자적 삽입(INSERT ON CONFLICT DO NOTHING)으로
 * check-then-act race condition을 방지한다.
 *
 * 사용법: tryAcquire()가 true를 반환한 경우에만 비즈니스 로직을 실행한다.
 * 삽입과 확인이 단일 쿼리로 이루어지므로 동시 요청이 들어와도 하나만 통과한다.
 */
@Component
@RequiredArgsConstructor
public class IdempotencyGuard {

    private final ProcessedEventJpaRepository repository;

    /**
     * 이벤트를 처리 완료로 원자적으로 마킹한다.
     * REQUIRES_NEW를 사용하여 호출자의 트랜잭션 유무와 무관하게 독립 커밋된다.
     * @return true면 최초 처리(비즈니스 로직 실행 가능), false면 이미 처리됨(스킵)
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public boolean tryAcquire(UUID key) {
        return repository.insertIfAbsent(key) > 0;
    }

    /**
     * 처리 실패 시 멱등성 마킹을 해제하여 재시도를 허용한다.
     * tryAcquire()로 선점한 뒤 비즈니스 로직이 실패했을 때 호출한다.
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void release(UUID key) {
        repository.deleteByEventId(key);
    }

    /** @deprecated tryAcquire()로 대체. 기존 코드 마이그레이션 후 삭제 예정. */
    @Deprecated
    public boolean isAlreadyProcessed(UUID key) {
        return repository.existsByEventId(key);
    }

    /** @deprecated tryAcquire()로 대체. 기존 코드 마이그레이션 후 삭제 예정. */
    @Deprecated
    public void markAsProcessed(UUID key) {
        repository.save(ProcessedEventJpaEntity.of(key));
    }
}
