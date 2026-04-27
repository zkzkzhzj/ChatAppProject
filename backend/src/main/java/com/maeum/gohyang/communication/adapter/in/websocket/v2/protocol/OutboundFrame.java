package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/**
 * 서버 -> 클라이언트 outbound envelope.
 *
 * 직렬화 시 record component로 갖고 있는 `type` 필드가 그대로 JSON에 들어가므로
 * 별도 Jackson polymorphism 설정은 필요 없다. sealed로 묶어두는 건 핸들러가
 * 보낼 메시지를 한 타입으로 통일해서 다루기 위한 용도.
 */
public sealed interface OutboundFrame
        permits MessageEvent, ErrorEvent, PongEvent,
                PositionUpdateEvent, TypingUpdateEvent {

    EnvelopeType type();
}
