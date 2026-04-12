package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank @Size(max = 1000) String body
) {
    public SendMessageUseCase.Command toCommand(long userId, long chatRoomId) {
        return new SendMessageUseCase.Command(userId, chatRoomId, body);
    }
}
