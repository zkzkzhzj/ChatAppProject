package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(UUID id, long participantId, String body, Instant createdAt) {

    public static MessageResponse from(SendMessageUseCase.MessageData data) {
        return new MessageResponse(data.id(), data.participantId(), data.body(), data.createdAt());
    }
}
