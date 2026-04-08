package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.CreateChatRoomUseCase;

public record ChatRoomResponse(Long chatRoomId, Long participantId) {

    public static ChatRoomResponse from(CreateChatRoomUseCase.Result result) {
        return new ChatRoomResponse(result.chatRoomId(), result.participantId());
    }
}
