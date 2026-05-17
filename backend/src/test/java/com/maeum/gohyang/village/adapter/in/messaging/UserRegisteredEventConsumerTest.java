package com.maeum.gohyang.village.adapter.in.messaging;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.IdempotencyGuard;
import com.maeum.gohyang.village.application.port.in.InitializeUserVillageUseCase;

import tools.jackson.databind.ObjectMapper;

/**
 * UserRegisteredEventConsumer 회귀 방지 테스트 (트랙 harden-village-ops Step 1).
 *
 * 핵심 검증 (PR #91 full-review-agent R1):
 *   execute() 예외 시 idempotency marker leak 차단 — catch 블록에서
 *   IdempotencyGuard.release() 호출되는지 보장.
 *
 * 이전 코드 (release 누락) 결박 Kafka 재배달 시 marker 잔존 → 비즈니스 로직 영구 스킵
 * → character/space 미생성 → 첫 로그인 500.
 *
 * 패턴 출처: ConversationSummaryEventConsumer:103-107.
 */
@ExtendWith(MockitoExtension.class)
class UserRegisteredEventConsumerTest {

    @Mock
    private InitializeUserVillageUseCase initializeUserVillageUseCase;

    @Mock
    private IdempotencyGuard idempotencyGuard;

    @Mock
    private AlertPort alertPort;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UserRegisteredEventConsumer consumer;

    @BeforeEach
    void setUp() {
        consumer = new UserRegisteredEventConsumer(
                initializeUserVillageUseCase,
                idempotencyGuard,
                alertPort,
                objectMapper);
    }

    /**
     * Header 없이 record 생성 — KafkaEventIdExtractor 가 fallback (key + offset 기반 UUID) 사용.
     */
    private ConsumerRecord<String, String> userRegisteredRecord(String key, String body) {
        return new ConsumerRecord<>("user.registered", 0, 0L, key, body);
    }

    @Test
    @DisplayName("execute() 예외 시 idempotency marker release 호출 → Kafka 재배달 허용")
    void execute_예외_시_release_호출() {
        // given
        ConsumerRecord<String, String> record = userRegisteredRecord("user-1", "{\"userId\":1}");
        when(idempotencyGuard.tryAcquire(any(UUID.class))).thenReturn(true);
        doThrow(new RuntimeException("DB 일시 장애"))
                .when(initializeUserVillageUseCase).execute(1L);

        // when + then
        assertThatThrownBy(() -> consumer.handle(record))
                .isInstanceOf(RuntimeException.class);

        verify(idempotencyGuard, times(1)).release(any(UUID.class));
        verify(alertPort, times(1)).critical(any(), any());
    }

    @Test
    @DisplayName("정상 처리 시 release 호출 안 함 — marker 보존 결박 재배달 차단")
    void 정상_처리_시_release_호출_안_함() {
        // given
        ConsumerRecord<String, String> record = userRegisteredRecord("user-1", "{\"userId\":1}");
        when(idempotencyGuard.tryAcquire(any(UUID.class))).thenReturn(true);

        // when
        consumer.handle(record);

        // then
        verify(initializeUserVillageUseCase, times(1)).execute(1L);
        verify(idempotencyGuard, never()).release(any());
    }

    @Test
    @DisplayName("중복 이벤트 (tryAcquire false) 시 execute / release 모두 호출 안 함")
    void 중복_이벤트_시_스킵() {
        // given
        ConsumerRecord<String, String> record = userRegisteredRecord("user-1", "{\"userId\":1}");
        when(idempotencyGuard.tryAcquire(any(UUID.class))).thenReturn(false);

        // when
        consumer.handle(record);

        // then
        verify(initializeUserVillageUseCase, never()).execute(any(Long.class));
        verify(idempotencyGuard, never()).release(any());
    }

    @Test
    @DisplayName("JSON 파싱 실패 시 release 호출 — marker INSERT 후 비즈니스 진입 전 예외")
    void JSON_파싱_실패_시_release_호출() {
        // given
        ConsumerRecord<String, String> record = userRegisteredRecord("user-1", "{invalid json}");
        when(idempotencyGuard.tryAcquire(any(UUID.class))).thenReturn(true);

        // when + then
        assertThatThrownBy(() -> consumer.handle(record))
                .isInstanceOf(Exception.class);

        verify(idempotencyGuard, times(1)).release(any(UUID.class));
        verify(initializeUserVillageUseCase, never()).execute(any(Long.class));
    }

    @Test
    @DisplayName("tryAcquire 자체 예외 시 release 호출 안 함 — 다른 consumer 의 marker 보호 (Codex P1)")
    void tryAcquire_자체_예외_시_release_호출_안_함() {
        // given — tryAcquire 가 DB pool 고갈 등으로 throw. 본 consumer 는 marker acquire X.
        ConsumerRecord<String, String> record = userRegisteredRecord("user-1", "{\"userId\":1}");
        when(idempotencyGuard.tryAcquire(any(UUID.class)))
                .thenThrow(new RuntimeException("DB connection pool exhausted"));

        // when + then
        assertThatThrownBy(() -> consumer.handle(record))
                .isInstanceOf(RuntimeException.class);

        // release 호출 X — 이미 다른 consumer 가 박은 marker 를 삭제하면 안 됨
        verify(idempotencyGuard, never()).release(any());
        verify(initializeUserVillageUseCase, never()).execute(any(Long.class));
    }
}
