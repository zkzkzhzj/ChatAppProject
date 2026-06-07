package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.communication.adapter.out.messaging.redis.RoomMessageBus;
import com.maeum.gohyang.communication.adapter.out.messaging.redis.RoomMessageHandler;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoomSubscriptionRegistry — 0↔1 전환 시점에만 Redis 채널 생명주기 관리")
class RoomSubscriptionRegistryTest {

    @Mock RoomMessageBus bus;
    @Mock WebSocketSessionRegistry sessionRegistry;

    private RoomSubscriptionRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new RoomSubscriptionRegistry(bus, sessionRegistry);
    }

    @Test
    void 첫_세션이_방에_들어올_때만_ensureRoomSubscribed가_호출된다() {
        // Given & When
        registry.subscribe(1L, "session-A");
        registry.subscribe(1L, "session-B");
        registry.subscribe(1L, "session-C");

        // Then — Redis 채널은 한 번만 구독된다
        verify(bus, times(1)).ensureRoomSubscribed(eq(1L), any(RoomMessageHandler.class));
        assertThat(registry.sessionCount(1L)).isEqualTo(3);
    }

    @Test
    void 마지막_세션이_방을_떠날_때만_removeRoomSubscription이_호출된다() {
        // Given
        registry.subscribe(2L, "session-A");
        registry.subscribe(2L, "session-B");

        // When — 한 명만 unsubscribe
        registry.unsubscribe(2L, "session-A");

        // Then — 다른 세션이 남아있으므로 채널 해제 X
        verify(bus, never()).removeRoomSubscription(2L);
        assertThat(registry.sessionCount(2L)).isEqualTo(1);

        // When — 마지막도 unsubscribe
        registry.unsubscribe(2L, "session-B");

        // Then
        verify(bus, times(1)).removeRoomSubscription(2L);
        assertThat(registry.sessionCount(2L)).isZero();
        assertThat(registry.roomCount()).isZero();
    }

    @Test
    void 미등록_방을_unsubscribe해도_NOOP_이다() {
        // Given — 등록된 적 없는 방

        // When & Then
        registry.unsubscribe(99L, "session-X");

        verify(bus, never()).removeRoomSubscription(99L);
    }

    @Test
    void unsubscribeAll은_세션이_들어있던_모든_방에서_제거하고_각_방의_마지막일_때만_removeRoomSubscription을_부른다() {
        // Given — sessionA 가 방 10·11에, sessionB 도 방 11에 들어있음
        registry.subscribe(10L, "session-A");
        registry.subscribe(11L, "session-A");
        registry.subscribe(11L, "session-B");

        // When — sessionA 종료
        registry.unsubscribeAll("session-A");

        // Then
        verify(bus, times(1)).removeRoomSubscription(10L);   // 방 10 은 sessionA 가 마지막이었음
        verify(bus, never()).removeRoomSubscription(11L);    // 방 11 은 sessionB 가 남아있음
        assertThat(registry.sessionCount(10L)).isZero();
        assertThat(registry.sessionCount(11L)).isEqualTo(1);
    }

    @Test
    void roomsOf는_세션이_구독한_방_id_snapshot을_반환한다() {
        // Given
        registry.subscribe(10L, "session-A");
        registry.subscribe(11L, "session-A");
        registry.subscribe(11L, "session-B");

        // When & Then
        assertThat(registry.roomsOf("session-A")).containsExactlyInAnyOrder(10L, 11L);
        assertThat(registry.roomsOf("session-B")).containsExactly(11L);
        assertThat(registry.roomsOf("session-X")).isEmpty();
    }
}
