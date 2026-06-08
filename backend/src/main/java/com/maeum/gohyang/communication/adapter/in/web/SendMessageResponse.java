package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;

public record SendMessageResponse(MessageResponse userMessage) {

    public static SendMessageResponse from(SendMessageUseCase.Result result, long senderId) {
        return new SendMessageResponse(MessageResponse.from(result.userMessage(), senderId));
    }
}
