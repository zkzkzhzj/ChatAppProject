package com.maeum.gohyang.global.config;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Kafka 컨슈머 에러 핸들링 설정.
 *
 * - 일시적 오류(LLM 타임아웃, DB 장애 등) 시 최대 3회 재시도 (1초 간격)
 * - 재시도 소진 시 AlertPort.critical()로 운영 알람을 발송하고 해당 레코드를 건너뛴다.
 * - DLT(Dead Letter Topic)는 모니터링 인프라 구축 후 추가한다.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class KafkaConsumerConfig {

    private static final long RETRY_INTERVAL_MS = 1_000L;
    private static final long MAX_RETRIES = 3L;

    private final AlertPort alertPort;

    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        DefaultErrorHandler handler = new DefaultErrorHandler(
                (record, exception) -> {
                    ConsumerRecord<?, ?> consumerRecord = (ConsumerRecord<?, ?>) record.value();
                    String topic = consumerRecord.topic();
                    String key = String.valueOf(consumerRecord.key());

                    alertPort.critical(
                            AlertContext.of("kafka-consumer", key, topic),
                            String.format("Kafka 이벤트 재시도 소진 — topic=%s, key=%s, error=%s",
                                    topic, key, exception.getMessage())
                    );
                    log.error("Kafka 이벤트 영구 실패 — topic={}, key={}, offset={}",
                            topic, key, consumerRecord.offset(), exception);
                },
                new FixedBackOff(RETRY_INTERVAL_MS, MAX_RETRIES)
        );
        return handler;
    }
}
