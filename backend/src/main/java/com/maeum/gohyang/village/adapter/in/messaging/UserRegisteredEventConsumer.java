package com.maeum.gohyang.village.adapter.in.messaging;

import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.IdempotencyGuard;
import com.maeum.gohyang.global.infra.outbox.KafkaEventIdExtractor;
import com.maeum.gohyang.village.application.port.in.InitializeUserVillageUseCase;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


/**
 * user.registered 이벤트를 수신하여 유저의 기본 캐릭터와 공간을 생성한다.
 *
 * 멱등성 처리:
 * - IdempotencyGuard가 processed_event 테이블 기반으로 중복 처리를 막는다.
 * - Outbox가 발행 시 Kafka 헤더에 넣은 eventId(UUID)를 멱등성 키로 사용한다.
 *   Kafka offset에 의존하지 않으므로 Kafka 재시작 후에도 정확히 동작한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserRegisteredEventConsumer {

    private static final String TOPIC = "user.registered";

    private final InitializeUserVillageUseCase initializeUserVillageUseCase;
    private final IdempotencyGuard idempotencyGuard;
    private final AlertPort alertPort;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC)
    @Transactional
    public void handle(ConsumerRecord<String, String> record) {
        log.debug("user.registered 수신: key={}", record.key());
        UUID idempotencyKey = null;
        boolean acquired = false;
        try {
            idempotencyKey = KafkaEventIdExtractor.extract(record);
            if (!idempotencyGuard.tryAcquire(idempotencyKey)) {
                log.debug("중복 이벤트 무시: eventId={}", idempotencyKey);
                return;
            }
            // 본 consumer 가 tryAcquire true 반환을 직접 받은 경우에만 acquired = true.
            // 이 가드 없이 catch 결박 release 하면 — tryAcquire 자체 예외 (DB pool 고갈 등) 시
            // 이미 다른 consumer instance 가 박은 marker 까지 삭제할 위험 (Codex P1, PR #95).
            acquired = true;
            JsonNode root = objectMapper.readTree(record.value());
            JsonNode userIdNode = root.get("userId");
            if (userIdNode == null || userIdNode.isNull()) {
                log.warn("user.registered 이벤트에 userId 누락: key={}", record.key());
                return;
            }
            long userId = userIdNode.asLong();
            initializeUserVillageUseCase.execute(userId);
        } catch (Exception e) {
            // 본 consumer 가 직접 acquire 한 marker 만 release.
            // ConversationSummaryEventConsumer:103-107 의 idempotencyKey != null 패턴 보다 안전.
            if (acquired) {
                idempotencyGuard.release(idempotencyKey);
            }
            alertPort.critical(
                    AlertContext.of("village-consumer", record.key(), record.key()),
                    "user.registered 처리 실패: " + e.getMessage()
            );
            log.error("user.registered 처리 중 오류: key={} error={}", record.key(), e.getMessage(), e);
            throw e;
        }
    }

}
