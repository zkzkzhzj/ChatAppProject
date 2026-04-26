package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/**
 * 같은 방 클라이언트들에게 다른 유저의 타이핑 상태를 알리는 broadcast 메시지.
 *
 * V1 STOMP {@code /topic/village/typing} 의 {@code TypingBroadcastMessage} 를 대체한다.
 */
public record TypingUpdateEvent(
        EnvelopeType type,
        long roomId,
        String displayId,
        boolean typing
) implements OutboundFrame {

    public static TypingUpdateEvent of(long roomId, String displayId, boolean typing) {
        return new TypingUpdateEvent(EnvelopeType.TYPING_UPDATE, roomId, displayId, typing);
    }
}
