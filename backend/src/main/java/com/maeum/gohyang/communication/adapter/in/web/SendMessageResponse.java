package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;

public record SendMessageResponse(MessageResponse userMessage, MessageResponse npcMessage) {

    public static SendMessageResponse from(SendMessageUseCase.Result result) {
        return new SendMessageResponse(
                MessageResponse.from(result.userMessage()),
                MessageResponse.from(result.npcMessage())
        );
    }
}
