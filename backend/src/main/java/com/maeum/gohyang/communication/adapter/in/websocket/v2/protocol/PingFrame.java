package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/** keep-alive heartbeat. 서버는 PongEvent로 응답한다. */
public record PingFrame() implements InboundFrame {
}
