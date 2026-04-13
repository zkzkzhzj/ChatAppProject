package com.maeum.gohyang.communication.adapter.in.web;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.communication.domain.Message;

public record MessageResponse(
        UUID id,
        long participantId,
        @Nullable Long senderId,
        String senderType,
        String body,
        Instant createdAt
) {

    public static MessageResponse fromUser(Message message, long senderId) {
        return new MessageResponse(
                message.getId(),
                message.getParticipantId(),
                senderId,
                "USER",
                message.getBody(),
                message.getCreatedAt()
        );
    }

    public static MessageResponse fromNpc(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getParticipantId(),
                null,
                "NPC",
                message.getBody(),
                message.getCreatedAt()
        );
    }
}
