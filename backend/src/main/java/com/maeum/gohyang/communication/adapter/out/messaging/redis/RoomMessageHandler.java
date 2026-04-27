package com.maeum.gohyang.communication.adapter.out.messaging.redis;

/**
 * Redis 채널에서 도착한 raw JSON payload 를 로컬에서 처리하는 콜백.
 *
 * 의도적으로 역직렬화하지 않은 byte[] 를 그대로 전달한다. WebSocket fan-out 측이 동일 payload 를
 * {@code TextMessage} 로 만들어 그대로 전송하면 직렬화 비용이 1회로 끝난다 ({@code learning/45}
 * §B.3). 또한 envelope 종류(MESSAGE/POSITION_UPDATE/TYPING_UPDATE/...)에 무관하게 동작하므로
 * sealed {@code OutboundFrame} 의 polymorphic deserialize 가 불필요하다.
 */
@FunctionalInterface
public interface RoomMessageHandler {

    void onMessage(long roomId, byte[] payload);
}
