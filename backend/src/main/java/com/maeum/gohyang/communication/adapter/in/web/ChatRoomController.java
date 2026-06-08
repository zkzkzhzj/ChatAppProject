package com.maeum.gohyang.communication.adapter.in.web;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.communication.ChatTopics;
import com.maeum.gohyang.communication.application.port.in.LoadChatHistoryUseCase;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatRoomController {

    private static final int DEFAULT_HISTORY_LIMIT = 10;

    private final SendMessageUseCase sendMessageUseCase;
    private final LoadChatHistoryUseCase loadChatHistoryUseCase;
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
                ChatTopics.VILLAGE_CHAT,
                MessageResponse.from(result.userMessage(), user.userId()));

        return ResponseEntity.ok(SendMessageResponse.from(result, user.userId()));
    }

    @GetMapping("/messages")
    public ResponseEntity<List<MessageResponse>> getChatHistory(
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }

        LoadChatHistoryUseCase.Result result =
                loadChatHistoryUseCase.execute(publicChatRoomId, DEFAULT_HISTORY_LIMIT);

        List<MessageResponse> response = result.messages().stream()
                .map(msg -> toMessageResponse(msg, result.participantMap()))
                .toList();

        return ResponseEntity.ok(response);
    }

    private MessageResponse toMessageResponse(Message message, Map<Long, Participant> participantMap) {
        Participant participant = participantMap.get(message.getParticipantId());
        Long senderId = participant != null ? participant.getUserId() : null;
        return MessageResponse.from(message, senderId);
    }
}
