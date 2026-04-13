package com.maeum.gohyang.communication.adapter.in.web;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 마을 공개 채팅 REST Controller.
 *
 * STOMP가 주 경로이지만, REST fallback을 유지한다.
 * 채널 개념 도입 전까지 마을 공개 채팅방 1개를 고정 사용.
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatRoomController {

    private final SendMessageUseCase sendMessageUseCase;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${village.public-chat-room-id}")
    private long publicChatRoomId;

    @PostMapping("/messages")
    public ResponseEntity<SendMessageResponse> sendMessage(
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }
        SendMessageUseCase.Result result = sendMessageUseCase.execute(
                new SendMessageUseCase.Command(user.userId(), publicChatRoomId, request.body()));

        messagingTemplate.convertAndSend(
                "/topic/chat/village",
                List.of(
                        MessageResponse.fromUser(result.userMessage(), user.userId()),
                        MessageResponse.fromNpc(result.npcMessage())
                )
        );

        return ResponseEntity.ok(SendMessageResponse.from(result, user.userId()));
    }
}
