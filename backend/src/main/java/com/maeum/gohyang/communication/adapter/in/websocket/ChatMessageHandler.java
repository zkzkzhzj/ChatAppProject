package com.maeum.gohyang.communication.adapter.in.websocket;

import java.security.Principal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.maeum.gohyang.communication.ChatTopics;
import com.maeum.gohyang.communication.adapter.in.web.MessageResponse;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ChatMessageHandler {

    private final SendMessageUseCase sendMessageUseCase;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${village.public-chat-room-id}")
    private long publicChatRoomId;

    @MessageMapping("/chat/village")
    public void handleMessage(
            @Payload StompSendMessageRequest request,
            Principal principal) {
        if (!(principal instanceof AuthenticatedUser user) || user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }
        SendMessageUseCase.Result result = sendMessageUseCase.execute(
                new SendMessageUseCase.Command(user.userId(), publicChatRoomId, request.body()));

        messagingTemplate.convertAndSend(
                ChatTopics.VILLAGE_CHAT,
                MessageResponse.from(result.userMessage(), user.userId()));
    }
}
