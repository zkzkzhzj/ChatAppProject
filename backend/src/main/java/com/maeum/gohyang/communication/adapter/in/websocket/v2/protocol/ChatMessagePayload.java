package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.communication.domain.Message;

public record ChatMessagePayload(
        UUID id,
        long participantId,
        @Nullable Long senderId,
        String body,
        Instant createdAt
) {

    public static ChatMessagePayload fromUser(Message message, long senderId) {
        return new ChatMessagePayload(
                message.getId(),
                message.getParticipantId(),
                senderId,
                message.getBody(),
                message.getCreatedAt()
        );
    }

    public static ChatMessagePayload system(String body) {
        return new ChatMessagePayload(
                UUID.randomUUID(),
                0L,
                null,
                body,
                Instant.now()
        );
    }
}
