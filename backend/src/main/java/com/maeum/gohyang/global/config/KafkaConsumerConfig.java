package com.maeum.gohyang.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import lombok.extern.slf4j.Slf4j;

/**
 * Kafka 컨슈머 에러 핸들링 설정.
 *
 * - 일시적 오류(LLM 타임아웃, DB 장애 등) 시 최대 3회 재시도 (1초 간격)
 * - 재시도 소진 시 Spring Kafka가 로그를 남기고 해당 레코드를 건너뛴다.
 * - DLT(Dead Letter Topic)는 모니터링 인프라 구축 후 추가한다.
 */
@Slf4j
@Configuration
public class KafkaConsumerConfig {

    private static final long RETRY_INTERVAL_MS = 1_000L;
    private static final long MAX_RETRIES = 3L;

    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        return new DefaultErrorHandler(new FixedBackOff(RETRY_INTERVAL_MS, MAX_RETRIES));
    }
}
