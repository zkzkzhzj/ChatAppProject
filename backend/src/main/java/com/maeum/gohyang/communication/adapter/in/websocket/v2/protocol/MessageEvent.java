package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/**
 * 서버 -> 클라이언트 채팅 메시지 broadcast.
 *
 * 같은 record 모양으로 Redis Pub/Sub에 publish되고, 받은 서버는 파싱 없이
 * 그대로 WebSocket 텍스트 프레임으로 포워딩할 수 있다 (직렬화 1회).
 */
public record MessageEvent(
        EnvelopeType type,
        long roomId,
        ChatMessagePayload message
) implements OutboundFrame {

    public static MessageEvent of(long roomId, ChatMessagePayload message) {
        return new MessageEvent(EnvelopeType.MESSAGE, roomId, message);
    }
}
