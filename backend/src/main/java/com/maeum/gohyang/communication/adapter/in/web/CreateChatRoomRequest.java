package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.CreateChatRoomUseCase;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateChatRoomRequest(
        @NotBlank @Size(max = 50) String displayName
) {
    public CreateChatRoomUseCase.Command toCommand(long userId) {
        return new CreateChatRoomUseCase.Command(userId, displayName);
    }
}
