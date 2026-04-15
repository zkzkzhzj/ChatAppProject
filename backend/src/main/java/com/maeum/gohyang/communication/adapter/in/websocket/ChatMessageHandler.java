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

/**
 * 마을 공개 채팅 STOMP 핸들러.
 *
 * 클라이언트가 `/app/chat/village` 로 메시지를 보내면
 * 마을 공개 채팅방(고정 ID)에 저장하고 유저 메시지를 즉시 broadcast한다.
 * NPC 응답은 비동기로 생성되어 별도 broadcast된다.
 *
 * 채널 개념 도입 전까지 마을 = 1개, 채팅방 = 1개로 운영한다.
 */
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
                MessageResponse.fromUser(result.userMessage(), user.userId()));
    }
}
