package com.maeum.gohyang.communication.adapter.in.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class MessageResponseTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void 메시지_응답은_senderId를_포함하고_senderType을_노출하지_않는다() {
        UUID id = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-04-08T12:00:00Z");
        Message message = Message.restore(id, 1L, 10L, "hello", MessageType.TEXT, createdAt);
        MessageResponse response = MessageResponse.from(message, 42L);

        JsonNode json = objectMapper.valueToTree(response);

        assertThat(json.get("senderId").asLong()).isEqualTo(42L);
        assertThat(json.get("senderType")).isNull();
    }
}
