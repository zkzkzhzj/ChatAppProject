package com.maeum.gohyang.global.infra.outbox;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.header.Header;

import lombok.extern.slf4j.Slf4j;

/**
 * Kafka 메시지 헤더에서 Outbox eventId를 추출하는 유틸리티.
 *
 * Outbox 릴레이가 발행 시 {@value OutboxKafkaRelay#EVENT_ID_HEADER} 헤더에 eventId를 넣는다.
 * 컨슈머는 이 값을 멱등성 키로 사용한다.
 *
 * 헤더가 없거나 파싱 실패 시 key+offset 조합으로 fallback한다.
 */
@Slf4j
public final class KafkaEventIdExtractor {

    private KafkaEventIdExtractor() {
    }

    public static UUID extract(ConsumerRecord<String, String> record) {
        Header header = record.headers().lastHeader(OutboxKafkaRelay.EVENT_ID_HEADER);
        if (header != null) {
            try {
                return UUID.fromString(new String(header.value(), StandardCharsets.UTF_8));
            } catch (IllegalArgumentException e) {
                log.warn("Kafka 헤더 UUID 파싱 실패 — fallback 사용: key={}", record.key());
            }
        }
        // fallback: Outbox를 거치지 않은 메시지 또는 헤더 파싱 실패
        String fallbackId = record.key() + "-" + record.offset();
        return UUID.nameUUIDFromBytes(fallbackId.getBytes(StandardCharsets.UTF_8));
    }
}
