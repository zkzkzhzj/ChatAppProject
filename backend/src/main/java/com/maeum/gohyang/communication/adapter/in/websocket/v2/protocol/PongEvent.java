package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/** PingFrame에 대한 응답. heartbeat 확인 외 의미 없음. */
public record PongEvent(EnvelopeType type) implements OutboundFrame {

    private static final PongEvent INSTANCE = new PongEvent(EnvelopeType.PONG);

    public static PongEvent instance() {
        return INSTANCE;
    }
}
