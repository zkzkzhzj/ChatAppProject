package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;

/**
 * 메시지 전송 REST 응답.
 *
 * 유저 메시지만 동기 반환한다.
 * NPC 응답은 비동기로 WebSocket을 통해 별도 전달된다.
 */
public record SendMessageResponse(MessageResponse userMessage) {

    public static SendMessageResponse from(SendMessageUseCase.Result result, long senderId) {
        return new SendMessageResponse(
                MessageResponse.fromUser(result.userMessage(), senderId));
    }
}
