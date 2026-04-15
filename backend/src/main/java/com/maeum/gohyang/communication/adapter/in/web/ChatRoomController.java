package com.maeum.gohyang.communication.adapter.in.web;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 마을 공개 채팅 REST Controller.
 *
 * STOMP가 주 경로이지만, REST fallback을 유지한다.
 * 유저 메시지를 즉시 브로드캐스트하고, NPC 응답은 비동기로 별도 전달된다.
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatRoomController {

    private static final int DEFAULT_HISTORY_LIMIT = 10;

    private final SendMessageUseCase sendMessageUseCase;
    private final LoadChatHistoryUseCase loadChatHistoryUseCase;
    private final LoadParticipantPort loadParticipantPort;
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
                MessageResponse.fromUser(result.userMessage(), user.userId()));

        return ResponseEntity.ok(SendMessageResponse.from(result, user.userId()));
    }

    /**
     * 채팅방 진입 시 이전 대화 10개를 조회한다.
     * participant 정보로 USER/NPC를 구분하여 senderId, senderType을 매핑한다.
     */
    @GetMapping("/messages")
    public ResponseEntity<List<MessageResponse>> getChatHistory(
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }

        Map<Long, Participant> participantMap = loadParticipantPort.loadAll(publicChatRoomId).stream()
                .collect(Collectors.toMap(Participant::getId, p -> p));

        List<Message> messages = loadChatHistoryUseCase.execute(publicChatRoomId, DEFAULT_HISTORY_LIMIT);

        List<MessageResponse> response = messages.stream()
                .map(msg -> toMessageResponse(msg, participantMap))
                .toList();

        return ResponseEntity.ok(response);
    }

    private MessageResponse toMessageResponse(Message message, Map<Long, Participant> participantMap) {
        Participant participant = participantMap.get(message.getParticipantId());
        if (participant != null && participant.getUserId() == null) {
            return MessageResponse.fromNpc(message);
        }
        long senderId = (participant != null && participant.getUserId() != null)
                ? participant.getUserId() : message.getParticipantId();
        return MessageResponse.fromUser(message, senderId);
    }
}
