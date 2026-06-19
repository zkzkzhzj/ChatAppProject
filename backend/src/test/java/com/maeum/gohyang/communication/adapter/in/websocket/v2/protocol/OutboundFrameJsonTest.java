package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.error.CommunicationErrorCode;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("OutboundFrame JSON")
class OutboundFrameJsonTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void 메시지_이벤트는_senderType_없이_사용자_페이로드를_직렬화한다() {
        UUID id = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-04-26T10:00:00Z");
        Message message = Message.restore(id, 42L, 99L, "hello", MessageType.TEXT, createdAt);
        MessageEvent event = MessageEvent.of(42L, ChatMessagePayload.fromUser(message, 101L));

        JsonNode json = objectMapper.valueToTree(event);

        assertThat(json.get("type").asString()).isEqualTo("MESSAGE");
        assertThat(json.get("roomId").asLong()).isEqualTo(42L);
        JsonNode payload = json.get("message");
        assertThat(payload.get("id").asString()).isEqualTo(id.toString());
        assertThat(payload.get("participantId").asLong()).isEqualTo(99L);
        assertThat(payload.get("senderId").asLong()).isEqualTo(101L);
        assertThat(payload.get("senderType")).isNull();
        assertThat(payload.get("body").asString()).isEqualTo("hello");
    }

    @Test
    void 에러_이벤트는_코드와_메시지를_직렬화한다() {
        ErrorEvent event = ErrorEvent.of(CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED);

        JsonNode json = objectMapper.valueToTree(event);

        assertThat(json.get("type").asString()).isEqualTo("ERROR");
        assertThat(json.get("code").asString()).isEqualTo("COMM_003");
        assertThat(json.get("message").asString())
                .isEqualTo(CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED.getMessage());
    }

    @Test
    void 위치_업데이트_이벤트는_좌표를_직렬화한다() {
        PositionUpdateEvent event = PositionUpdateEvent.of(1L, "user-101", "MEMBER", 100.5, 200.0, 0.6);

        JsonNode json = objectMapper.valueToTree(event);

        assertThat(json.get("type").asString()).isEqualTo("POSITION_UPDATE");
        assertThat(json.get("roomId").asLong()).isEqualTo(1L);
        assertThat(json.get("displayId").asString()).isEqualTo("user-101");
        assertThat(json.get("userType").asString()).isEqualTo("MEMBER");
        assertThat(json.get("x").asDouble()).isEqualTo(100.5);
        assertThat(json.get("y").asDouble()).isEqualTo(200.0);
        assertThat(json.get("z").asDouble()).isEqualTo(0.6);
    }

    @Test
    void 타이핑_업데이트_이벤트는_타이핑_상태를_직렬화한다() {
        TypingUpdateEvent event = TypingUpdateEvent.of(1L, "user-101", true);

        JsonNode json = objectMapper.valueToTree(event);

        assertThat(json.get("type").asString()).isEqualTo("TYPING_UPDATE");
        assertThat(json.get("displayId").asString()).isEqualTo("user-101");
        assertThat(json.get("typing").asBoolean()).isTrue();
    }

    @Test
    void 시스템_페이로드는_senderId가_null이다() {
        ChatMessagePayload payload = ChatMessagePayload.system("entered");

        assertThat(payload.senderId()).isNull();
        assertThat(payload.body()).isEqualTo("entered");
        assertThat(payload.id()).isNotNull();
    }

    @Test
    void PONG_이벤트는_type_필드만_직렬화한다() {
        PongEvent event = PongEvent.instance();

        JsonNode json = objectMapper.valueToTree(event);

        assertThat(json.get("type").asString()).isEqualTo("PONG");
        assertThat(json.size()).isEqualTo(1);
    }
}
