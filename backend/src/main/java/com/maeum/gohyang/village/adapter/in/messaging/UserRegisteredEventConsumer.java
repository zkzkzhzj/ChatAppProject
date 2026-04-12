package com.maeum.gohyang.village.adapter.in.messaging;

import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.IdempotencyGuard;
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
 * - key+offset 조합으로 idempotencyKey를 생성한다.
 *   (재가입 시나리오에서 동일 userId가 다른 이벤트일 수 있으므로 메시지 key 단독 사용 불가)
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
        try {
            var payload = UserRegisteredPayload.from(record, objectMapper);
            if (idempotencyGuard.isAlreadyProcessed(payload.idempotencyKey())) {
                log.debug("중복 이벤트 무시: eventId={} userId={}", payload.idempotencyKey(), payload.userId());
                return;
            }
            initializeUserVillageUseCase.execute(payload.userId());
            idempotencyGuard.markAsProcessed(payload.idempotencyKey());
        } catch (Exception e) {
            alertPort.critical(
                    AlertContext.of("village-consumer", record.key(), record.key()),
                    "user.registered 처리 실패: " + e.getMessage()
            );
            log.error("user.registered 처리 중 오류: key={} error={}", record.key(), e.getMessage(), e);
        }
    }

    private record UserRegisteredPayload(long userId, UUID idempotencyKey) {
        static UserRegisteredPayload from(ConsumerRecord<String, String> record, ObjectMapper mapper) throws Exception {
            JsonNode root = mapper.readTree(record.value());
            long userId = root.get("userId").asLong();
            String eventId = record.key() + "-" + record.offset();
            UUID idempotencyKey = UUID.nameUUIDFromBytes(eventId.getBytes());
            return new UserRegisteredPayload(userId, idempotencyKey);
        }
    }
}
