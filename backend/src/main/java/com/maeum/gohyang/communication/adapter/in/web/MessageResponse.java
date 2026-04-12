package com.maeum.gohyang.communication.adapter.in.web;

import java.time.Instant;
import java.util.UUID;

import com.maeum.gohyang.communication.domain.Message;

public record MessageResponse(UUID id, long participantId, String body, Instant createdAt) {

    public static MessageResponse from(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getParticipantId(),
                message.getBody(),
                message.getCreatedAt()
        );
    }
}
