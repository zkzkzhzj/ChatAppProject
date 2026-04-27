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

@DisplayName("OutboundFrame Jackson 직렬화")
class OutboundFrameJsonTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void MessageEvent는_type_MESSAGE와_payload를_포함해_직렬화된다() throws Exception {
        // Given
        UUID id = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-04-26T10:00:00Z");
        Message message = Message.restore(id, 42L, 99L, "안녕", MessageType.TEXT, createdAt);
        MessageEvent event = MessageEvent.of(42L, ChatMessagePayload.fromUser(message, 101L));

        // When
        JsonNode json = objectMapper.valueToTree(event);

        // Then
        assertThat(json.get("type").asString()).isEqualTo("MESSAGE");
        assertThat(json.get("roomId").asLong()).isEqualTo(42L);
        JsonNode payload = json.get("message");
        assertThat(payload.get("id").asString()).isEqualTo(id.toString());
        assertThat(payload.get("participantId").asLong()).isEqualTo(99L);
        assertThat(payload.get("senderId").asLong()).isEqualTo(101L);
        assertThat(payload.get("senderType").asString()).isEqualTo("USER");
        assertThat(payload.get("body").asString()).isEqualTo("안녕");
    }

    @Test
    void MessageEvent의_NPC_payload는_senderId가_null이다() throws Exception {
        // Given
        Message npcMessage = Message.restore(UUID.randomUUID(), 42L, 1L, "반가워요",
                MessageType.TEXT, Instant.now());
        MessageEvent event = MessageEvent.of(42L, ChatMessagePayload.fromNpc(npcMessage));

        // When
        JsonNode json = objectMapper.valueToTree(event);

        // Then
        JsonNode payload = json.get("message");
        assertThat(payload.get("senderType").asString()).isEqualTo("NPC");
        assertThat(payload.get("senderId").isNull()).isTrue();
    }

    @Test
    void ErrorEvent는_CommunicationErrorCode의_code와_message를_그대로_노출한다() throws Exception {
        // Given
        ErrorEvent event = ErrorEvent.of(CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED);

        // When
        JsonNode json = objectMapper.valueToTree(event);

        // Then
        assertThat(json.get("type").asString()).isEqualTo("ERROR");
        assertThat(json.get("code").asString()).isEqualTo("COMM_003");
        assertThat(json.get("message").asString())
                .isEqualTo(CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED.getMessage());
    }

    @Test
    void PositionUpdateEvent는_type_POSITION_UPDATE로_displayId_좌표를_노출한다() throws Exception {
        // Given
        PositionUpdateEvent event = PositionUpdateEvent.of(1L, "user-101", "MEMBER", 100.5, 200.0);

        // When
        JsonNode json = objectMapper.valueToTree(event);

        // Then
        assertThat(json.get("type").asString()).isEqualTo("POSITION_UPDATE");
        assertThat(json.get("roomId").asLong()).isEqualTo(1L);
        assertThat(json.get("displayId").asString()).isEqualTo("user-101");
        assertThat(json.get("userType").asString()).isEqualTo("MEMBER");
        assertThat(json.get("x").asDouble()).isEqualTo(100.5);
        assertThat(json.get("y").asDouble()).isEqualTo(200.0);
    }

    @Test
    void TypingUpdateEvent는_type_TYPING_UPDATE로_displayId_상태를_노출한다() throws Exception {
        // Given
        TypingUpdateEvent event = TypingUpdateEvent.of(1L, "user-101", true);

        // When
        JsonNode json = objectMapper.valueToTree(event);

        // Then
        assertThat(json.get("type").asString()).isEqualTo("TYPING_UPDATE");
        assertThat(json.get("displayId").asString()).isEqualTo("user-101");
        assertThat(json.get("typing").asBoolean()).isTrue();
    }

    @Test
    void ChatMessagePayload_system은_senderType이_SYSTEM이고_senderId가_null이다() {
        // Given & When
        ChatMessagePayload payload = ChatMessagePayload.system("이웃이 입장하셨습니다.");

        // Then
        assertThat(payload.senderType()).isEqualTo("SYSTEM");
        assertThat(payload.senderId()).isNull();
        assertThat(payload.body()).isEqualTo("이웃이 입장하셨습니다.");
        assertThat(payload.id()).isNotNull();
    }

    @Test
    void PongEvent는_type_PONG_단일_필드만_갖는다() throws Exception {
        // Given
        PongEvent event = PongEvent.instance();

        // When
        JsonNode json = objectMapper.valueToTree(event);

        // Then
        assertThat(json.get("type").asString()).isEqualTo("PONG");
        assertThat(json.size()).isEqualTo(1);
    }
}
