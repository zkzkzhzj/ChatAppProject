package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/** 클라이언트가 특정 방으로 채팅 메시지를 발행하는 envelope. */
public record PublishFrame(long roomId, String body) implements InboundFrame {
}
