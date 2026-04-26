package com.maeum.gohyang.communication.adapter.out.messaging.redis;

import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.OutboundFrame;

/**
 * 방 단위 메시지 publish/subscribe 인터페이스.
 *
 * 의도적으로 application 레이어의 outbound port가 아니라 어댑터 내부 인터페이스로 둔다.
 * 호출자가 application service가 아니라 다른 어댑터(V2 WebSocket inbound 핸들러)이기
 * 때문이다. 자세한 결정 근거는 `docs/learning/49`.
 *
 * 멱등성:
 * - {@link #ensureRoomSubscribed}는 같은 방에 두 번 호출되면 한 번만 등록한다.
 * - {@link #removeRoomSubscription}은 미등록 방에 호출돼도 NOOP.
 *
 * 카운팅(이 방에 로컬 세션이 몇 개인가)은 호출자(SessionRegistry) 책임. 이 인터페이스는
 * "구독 시작/중단" 만 책임진다.
 */
public interface RoomMessageBus {

    void publish(long roomId, OutboundFrame event);

    void ensureRoomSubscribed(long roomId, RoomMessageHandler handler);

    void removeRoomSubscription(long roomId);
}
