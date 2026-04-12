package com.maeum.gohyang.communication.adapter.in.websocket;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import com.maeum.gohyang.communication.adapter.in.web.MessageResponse;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;

/**
 * STOMP 메시지 핸들러.
 *
 * 클라이언트가 `/app/chat/{roomId}` 로 STOMP 메시지를 보내면
 * NPC 응답을 생성해 `/topic/chat/{roomId}` 로 broadcast한다.
 *
 * REST POST /chat-rooms/{id}/messages 와 동일한 UseCase를 공유한다.
 * 실시간 UI를 위한 WebSocket 경로. Happy Path 테스트는 REST로 수행한다.
 */
@Controller
@RequiredArgsConstructor
public class ChatMessageHandler {

    private final SendMessageUseCase sendMessageUseCase;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/{roomId}")
    public void handleMessage(
            @DestinationVariable long roomId,
            @Payload StompSendMessageRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user == null || user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }
        SendMessageUseCase.Result result = sendMessageUseCase.execute(
                new SendMessageUseCase.Command(user.userId(), roomId, request.body()));

        messagingTemplate.convertAndSend(
                "/topic/chat/" + roomId,
                MessageResponse.from(result.npcMessage())
        );
    }
}
