package com.maeum.gohyang.communication.adapter.out.messaging.redis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.ChatMessagePayload;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.MessageEvent;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.support.BaseTestContainers;

/**
 * Redis Pub/Sub 어댑터의 통합 테스트.
 *
 * 검증 대상:
 * - 방 단위 exact SUBSCRIBE 가 정확히 자기 채널 메시지만 수신한다 (O(M×N) 회피의 경계)
 * - {@code removeRoomSubscription} 후엔 더 이상 수신하지 않는다 (마지막 세션 종료 시 채널 정리)
 * - 멱등성: 미등록 방을 unsubscribe 해도 예외 없이 NOOP
 */
@SpringBootTest
@DisplayName("RedisChatRelay — 방 단위 Pub/Sub")
class RedisChatRelayTest extends BaseTestContainers {

    /** Spring Data Redis MessageListenerContainer 가 SUBSCRIBE 명령을 활성화하는 데 걸리는 대기시간. */
    private static final long SUBSCRIBE_PROPAGATION_MILLIS = 300L;
    private static final long RECEIVE_TIMEOUT_SECONDS = 5L;
    private static final long NEGATIVE_WAIT_SECONDS = 1L;

    @Autowired
    RoomMessageBus bus;

    private final java.util.Set<Long> subscribedRoomsToCleanup = new java.util.HashSet<>();

    @AfterEach
    void cleanup() {
        subscribedRoomsToCleanup.forEach(bus::removeRoomSubscription);
        subscribedRoomsToCleanup.clear();
    }

    @Test
    void 방을_구독한_뒤_같은_방으로_publish하면_handler가_raw_payload를_받는다() throws InterruptedException {
        // Given
        long roomId = 1001L;
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<byte[]> received = new AtomicReference<>();
        bus.ensureRoomSubscribed(roomId, (id, payload) -> {
            received.set(payload);
            latch.countDown();
        });
        subscribedRoomsToCleanup.add(roomId);
        Thread.sleep(SUBSCRIBE_PROPAGATION_MILLIS);

        MessageEvent event = sampleMessageEvent(roomId, "안녕");

        // When
        bus.publish(roomId, event);

        // Then
        boolean delivered = latch.await(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(delivered).as("같은 방 메시지는 수신되어야 한다").isTrue();
        String json = new String(received.get(), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(json)
                .contains("\"MESSAGE\"")
                .contains("\"roomId\":" + roomId)
                .contains("\"body\":\"안녕\"");
    }

    @Test
    void 다른_방으로_publish된_메시지는_수신되지_않는다() throws InterruptedException {
        // Given
        long subscribedRoom = 1002L;
        long otherRoom = 9999L;
        CountDownLatch latch = new CountDownLatch(1);
        bus.ensureRoomSubscribed(subscribedRoom, (id, event) -> latch.countDown());
        subscribedRoomsToCleanup.add(subscribedRoom);
        Thread.sleep(SUBSCRIBE_PROPAGATION_MILLIS);

        // When
        bus.publish(otherRoom, sampleMessageEvent(otherRoom, "다른 방"));

        // Then — exact SUBSCRIBE 이므로 다른 채널 메시지는 절대 들어오면 안 된다
        boolean leaked = latch.await(NEGATIVE_WAIT_SECONDS, TimeUnit.SECONDS);
        assertThat(leaked).as("다른 방 메시지가 새어들어오면 O(M×N) 회피가 깨진다").isFalse();
    }

    @Test
    void 구독을_해제한_뒤_publish된_메시지는_수신되지_않는다() throws InterruptedException {
        // Given
        long roomId = 1003L;
        CountDownLatch latch = new CountDownLatch(1);
        bus.ensureRoomSubscribed(roomId, (id, event) -> latch.countDown());
        Thread.sleep(SUBSCRIBE_PROPAGATION_MILLIS);
        bus.removeRoomSubscription(roomId);
        Thread.sleep(SUBSCRIBE_PROPAGATION_MILLIS);

        // When
        bus.publish(roomId, sampleMessageEvent(roomId, "구독 해제 후 메시지"));

        // Then
        boolean leaked = latch.await(NEGATIVE_WAIT_SECONDS, TimeUnit.SECONDS);
        assertThat(leaked).as("removeRoomSubscription 후엔 listener가 더 이상 호출되면 안 된다").isFalse();
    }

    @Test
    void 같은_방을_두_번_ensureRoomSubscribed해도_listener는_한_번만_등록된다() throws InterruptedException {
        // Given
        long roomId = 1004L;
        CountDownLatch latch = new CountDownLatch(2);
        // 첫 등록은 latch.countDown 을 부르는 handler
        bus.ensureRoomSubscribed(roomId, (id, event) -> latch.countDown());
        // 두 번째 호출은 다른 handler 인데, 멱등이라면 첫 번째 handler 만 살아있어야 한다.
        bus.ensureRoomSubscribed(roomId, (id, event) -> latch.countDown());
        subscribedRoomsToCleanup.add(roomId);
        Thread.sleep(SUBSCRIBE_PROPAGATION_MILLIS);

        // When
        bus.publish(roomId, sampleMessageEvent(roomId, "한 번"));

        // Then — 만약 두 번 등록됐다면 latch 가 2회 countDown 되어 0 이 됨. 멱등이면 1회로 남음.
        boolean reachedTwo = latch.await(NEGATIVE_WAIT_SECONDS, TimeUnit.SECONDS);
        assertThat(reachedTwo).as("멱등 등록이면 listener 가 한 번만 호출되어야 한다").isFalse();
        assertThat(latch.getCount()).isEqualTo(1);
    }

    @Test
    void 미등록_방을_removeRoomSubscription해도_예외가_발생하지_않는다() {
        // Given — 등록한 적 없는 방
        long unsubscribedRoom = 7777L;

        // When & Then
        assertThatCode(() -> bus.removeRoomSubscription(unsubscribedRoom))
                .doesNotThrowAnyException();
    }

    private MessageEvent sampleMessageEvent(long roomId, String body) {
        Message message = Message.restore(
                UUID.randomUUID(), roomId, 99L, body,
                MessageType.TEXT, Instant.now());
        return MessageEvent.of(roomId, ChatMessagePayload.fromUser(message, 1L));
    }
}
