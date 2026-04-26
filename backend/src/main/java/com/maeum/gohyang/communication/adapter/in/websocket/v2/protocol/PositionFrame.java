package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/**
 * 클라이언트가 자기 캐릭터의 좌표를 보고하는 envelope.
 *
 * 비영속 — Cassandra 저장 없이 같은 방의 다른 세션들에게만 broadcast 된다.
 * 좌표 검증·clamping 은 핸들러가 책임진다.
 */
public record PositionFrame(long roomId, double x, double y) implements InboundFrame {
}
