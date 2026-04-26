package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/**
 * 같은 방 클라이언트들에게 다른 유저의 좌표를 알리는 broadcast 메시지.
 *
 * V1 STOMP {@code /topic/village/positions} 의 {@code PositionBroadcast} 를 대체한다.
 * displayId 는 V1 그대로 "user-{userId}" 또는 게스트 sessionId.
 */
public record PositionUpdateEvent(
        EnvelopeType type,
        long roomId,
        String displayId,
        String userType,
        double x,
        double y
) implements OutboundFrame {

    public static PositionUpdateEvent of(long roomId, String displayId, String userType,
                                          double x, double y) {
        return new PositionUpdateEvent(EnvelopeType.POSITION_UPDATE, roomId, displayId, userType, x, y);
    }
}
