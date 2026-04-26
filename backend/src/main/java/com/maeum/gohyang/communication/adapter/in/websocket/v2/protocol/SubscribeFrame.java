package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/** 클라이언트가 특정 방의 메시지 수신을 시작하겠다고 알리는 envelope. */
public record SubscribeFrame(long roomId) implements InboundFrame {
}
