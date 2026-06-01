package com.maeum.gohyang.confession.adapter.in.messaging;

import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.adapter.out.persistence.ConfessionLetterOutboxAdapter;
import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.IdempotencyGuard;
import com.maeum.gohyang.global.infra.outbox.KafkaEventIdExtractor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConfessionLetterSentEventConsumer {

    private static final String USER_MAIL_QUEUE = "/queue/mail";

    private final SimpMessagingTemplate messagingTemplate;
    private final IdempotencyGuard idempotencyGuard;
    private final AlertPort alertPort;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = ConfessionLetterOutboxAdapter.LETTER_SENT_EVENT_TYPE)
    @Transactional
    public void handle(ConsumerRecord<String, String> record) {
        UUID idempotencyKey = null;
        boolean acquired = false;
        try {
            idempotencyKey = KafkaEventIdExtractor.extract(record);
            if (!idempotencyGuard.tryAcquire(idempotencyKey)) {
                log.debug("중복 confession.letter.sent 이벤트 무시: eventId={}", idempotencyKey);
                return;
            }
            acquired = true;

            JsonNode root = objectMapper.readTree(record.value());
            long authorUserId = requireLong(root, "authorUserId");
            long confessionId = requireLong(root, "confessionId");
            long letterId = requireLong(root, "letterId");

            messagingTemplate.convertAndSendToUser(
                    String.valueOf(authorUserId),
                    USER_MAIL_QUEUE,
                    new MailNotificationMessage(confessionId, letterId)
            );
        } catch (Exception e) {
            if (acquired) {
                idempotencyGuard.release(idempotencyKey);
            }
            alertPort.warning(
                    AlertContext.of("confession-letter-consumer", record.key(), record.key()),
                    "confession.letter.sent 처리 실패: " + e.getMessage()
            );
            log.warn("confession.letter.sent 처리 중 오류: key={} error={}", record.key(), e.getMessage(), e);
            throw e;
        }
    }

    private long requireLong(JsonNode root, String fieldName) {
        JsonNode node = root.get(fieldName);
        if (node == null || node.isNull()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return node.asLong();
    }

    public record MailNotificationMessage(long confessionId, long letterId) { }
}
