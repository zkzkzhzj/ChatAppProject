package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * 클라이언트 -> 서버 inbound envelope.
 *
 * Jackson은 `type` 필드를 디스패치 키로 사용해 적절한 record 구현체로 역직렬화한다.
 * sealed interface + record 조합으로 핸들러는 Java 21 패턴 매칭 switch로
 * exhaustive 분기를 강제할 수 있다.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = SubscribeFrame.class, name = "SUBSCRIBE"),
    @JsonSubTypes.Type(value = UnsubscribeFrame.class, name = "UNSUBSCRIBE"),
    @JsonSubTypes.Type(value = PublishFrame.class, name = "PUBLISH"),
    @JsonSubTypes.Type(value = PositionFrame.class, name = "POSITION"),
    @JsonSubTypes.Type(value = TypingFrame.class, name = "TYPING"),
    @JsonSubTypes.Type(value = PingFrame.class, name = "PING")
})
public sealed interface InboundFrame
        permits SubscribeFrame, UnsubscribeFrame, PublishFrame,
                PositionFrame, TypingFrame, PingFrame {
}
