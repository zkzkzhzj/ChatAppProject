package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;

public record SendMessageResponse(MessageResponse userMessage, MessageResponse npcMessage) {

    public static SendMessageResponse from(SendMessageUseCase.Result result, long senderId) {
        return new SendMessageResponse(
                MessageResponse.fromUser(result.userMessage(), senderId),
                MessageResponse.fromNpc(result.npcMessage())
        );
    }
}
