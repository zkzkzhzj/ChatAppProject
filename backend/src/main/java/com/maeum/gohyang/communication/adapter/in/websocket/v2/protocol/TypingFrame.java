package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/** 클라이언트가 타이핑 중/중단을 보고하는 envelope. 비영속. */
public record TypingFrame(long roomId, boolean typing) implements InboundFrame {
}
