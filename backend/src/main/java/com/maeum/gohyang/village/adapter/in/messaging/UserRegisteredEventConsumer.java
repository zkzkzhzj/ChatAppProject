package com.maeum.gohyang.village.adapter.in.messaging;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.ProcessedEventJpaEntity;
import com.maeum.gohyang.global.infra.idempotency.ProcessedEventJpaRepository;
import com.maeum.gohyang.village.application.port.in.InitializeUserVillageUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * user.registered 이벤트를 수신하여 유저의 기본 캐릭터와 공간을 생성한다.
 *
 * 멱등성 처리:
 * - processed_event 테이블에 eventId를 저장하여 동일 이벤트의 중복 처리를 방지한다.
 * - Kafka at-least-once 보장으로 동일 메시지가 재전달될 수 있기 때문이다.
 * - eventId는 Kafka 메시지 헤더의 outbox event_id(UUID)를 key로 사용한다.
 *   메시지 key(userId)가 아닌 이유: 재가입 같은 시나리오에서 동일 userId가 다른 이벤트일 수 있다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserRegisteredEventConsumer {

    private static final String TOPIC = "user.registered";

    private final InitializeUserVillageUseCase initializeUserVillageUseCase;
    private final ProcessedEventJpaRepository processedEventJpaRepository;
    private final AlertPort alertPort;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC)
    @Transactional
    public void handle(ConsumerRecord<String, String> record) {
        String payload = record.value();
        log.debug("user.registered 수신: key={} payload={}", record.key(), payload);

        try {
            JsonNode root = objectMapper.readTree(payload);
            long userId = root.get("userId").asLong();
            String eventId = record.key() + "-" + record.offset();

            // eventId 기반 멱등성 체크 (outbox event_id를 전달받지 않으므로 key+offset 조합 사용)
            UUID idempotencyKey = UUID.nameUUIDFromBytes(eventId.getBytes());
            if (processedEventJpaRepository.existsByEventId(idempotencyKey)) {
                log.debug("중복 이벤트 무시: eventId={} userId={}", idempotencyKey, userId);
                return;
            }

            initializeUserVillageUseCase.execute(userId);
            processedEventJpaRepository.save(ProcessedEventJpaEntity.of(idempotencyKey));

        } catch (Exception e) {
            alertPort.critical(
                    AlertContext.of("village-consumer", record.key(), record.key()),
                    "user.registered 처리 실패: " + e.getMessage()
            );
            log.error("user.registered 처리 중 오류: payload={} error={}", payload, e.getMessage(), e);
        }
    }
}
