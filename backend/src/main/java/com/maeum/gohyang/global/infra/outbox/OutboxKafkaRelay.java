package com.maeum.gohyang.global.infra.outbox;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutionException;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.errors.RecordTooLargeException;
import org.apache.kafka.common.errors.TopicAuthorizationException;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Transactional Outbox 패턴의 릴레이 컴포넌트.
 *
 * 에러 분류:
 * - Transient (일시적): 네트워크 오류, Broker 일시 불가 → PENDING 유지, 다음 틱에 재시도
 * - Permanent (영구적): 메시지 크기 초과, 권한 오류 → 즉시 FAILED + critical 알람
 * - Systemic (시스템적): 연속 N개 실패 → Kafka 장애 의심 → critical 알람
 *
 * 재시도 전략:
 * - MAX_RETRY 이하: 다음 틱에 자동 재시도 (PENDING 유지)
 * - MAX_RETRY 초과: FAILED 확정 + AlertPort.critical() → 수동 개입 필요
 *
 * 한계 (MVP):
 * - 단일 인스턴스 기준. 다중 인스턴스 배포 시 동시 발행 방지를 위한 분산 락 필요.
 * - 실시간성 필요 시 Change Data Capture(CDC) 전환 검토.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxKafkaRelay {

    /** Kafka 헤더 키 — 컨슈머가 멱등성 키로 사용한다. */
    public static final String EVENT_ID_HEADER = "outbox-event-id";

    private static final int MAX_RETRY = 5;
    private static final int SYSTEMIC_FAILURE_THRESHOLD = 10;

    private final OutboxJpaRepository outboxJpaRepository;
    private final KafkaTemplate<Object, Object> kafkaTemplate;
    private final AlertPort alertPort;

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void relay() {
        List<OutboxJpaEntity> pending = outboxJpaRepository
                .findTop100ByStatusOrderByOccurredAtAsc(OutboxEventStatus.PENDING);

        int consecutiveFailures = 0;

        for (OutboxJpaEntity event : pending) {
            try {
                ProducerRecord<Object, Object> producerRecord =
                        new ProducerRecord<>(event.getEventType(), null, event.getAggregateId(), event.getPayload());
                producerRecord.headers().add(new RecordHeader(
                        EVENT_ID_HEADER,
                        event.getEventId().toString().getBytes(StandardCharsets.UTF_8)));
                kafkaTemplate.send(producerRecord).get();
                event.markPublished();
                consecutiveFailures = 0;
                log.debug("Outbox 발행 완료: type={} eventId={}", event.getEventType(), event.getEventId());

            } catch (ExecutionException e) {
                consecutiveFailures++;
                handlePublishFailure(event, e.getCause() != null ? e.getCause() : e);
            } catch (Exception e) {
                consecutiveFailures++;
                handlePublishFailure(event, e);
            }

            if (consecutiveFailures >= SYSTEMIC_FAILURE_THRESHOLD) {
                alertPort.critical(
                        AlertContext.ofDomain("outbox"),
                        "Kafka 연속 " + consecutiveFailures + "개 발행 실패. Kafka 장애 또는 설정 오류 의심."
                );
                break;
            }
        }
    }

    private void handlePublishFailure(OutboxJpaEntity event, Throwable cause) {
        boolean isPermanent = isPermanentFailure(cause);

        if (isPermanent || event.getRetryCount() + 1 >= MAX_RETRY) {
            event.incrementRetryCount();
            event.markFailed();
            alertPort.critical(
                    AlertContext.of("outbox", event.getEventId().toString(), event.getAggregateId()),
                    isPermanent
                            ? "영구 실패 (재시도 불가): " + cause.getClass().getSimpleName()
                            : "MAX_RETRY(" + MAX_RETRY + ") 초과. 수동 개입 필요."
            );
        } else {
            event.incrementRetryCount();
            log.warn("Outbox 발행 실패 (재시도 예정): type={} eventId={} retryCount={} error={}",
                    event.getEventType(), event.getEventId(), event.getRetryCount(), cause.getMessage());
        }
    }

    /**
     * 재시도해도 소용없는 영구적 실패 여부를 판단한다.
     * - RecordTooLargeException: 페이로드 크기 문제. 코드 수정 없이는 해결 불가.
     * - TopicAuthorizationException: Kafka ACL 설정 문제. 설정 변경 전까지 해결 불가.
     */
    private boolean isPermanentFailure(Throwable cause) {
        return cause instanceof RecordTooLargeException
                || cause instanceof TopicAuthorizationException;
    }
}
