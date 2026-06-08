package com.maeum.gohyang.communication.adapter.in.web;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.communication.domain.Message;

public record MessageResponse(
        UUID id,
        long participantId,
        @Nullable Long senderId,
        String body,
        Instant createdAt
) {

    public static MessageResponse from(Message message, @Nullable Long senderId) {
        return new MessageResponse(
                message.getId(),
                message.getParticipantId(),
                senderId,
                message.getBody(),
                message.getCreatedAt()
        );
    }
}
