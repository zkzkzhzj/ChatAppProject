package com.maeum.gohyang.communication.adapter.in.web;

import com.maeum.gohyang.communication.application.port.in.CreateChatRoomUseCase;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat-rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final CreateChatRoomUseCase createChatRoomUseCase;
    private final SendMessageUseCase sendMessageUseCase;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * NPC 채팅방 생성.
     * GUEST 접근 시 403.
     */
    @PostMapping
    public ResponseEntity<ChatRoomResponse> createChatRoom(
            @Valid @RequestBody CreateChatRoomRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }
        CreateChatRoomUseCase.Result result = createChatRoomUseCase.execute(request.toCommand(user.userId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ChatRoomResponse.from(result));
    }

    /**
     * 메시지 전송 + NPC 응답 동기 반환.
     * NPC 응답은 WebSocket으로도 broadcast된다 (실시간 UX용).
     * GUEST 접근 시 403.
     */
    @PostMapping("/{chatRoomId}/messages")
    public ResponseEntity<SendMessageResponse> sendMessage(
            @PathVariable long chatRoomId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            throw new GuestChatNotAllowedException();
        }
        SendMessageUseCase.Result result = sendMessageUseCase.execute(
                request.toCommand(user.userId(), chatRoomId));

        // NPC 응답을 해당 채팅방 구독자에게 broadcast
        messagingTemplate.convertAndSend(
                "/topic/chat/" + chatRoomId,
                MessageResponse.from(result.npcMessage())
        );

        return ResponseEntity.ok(SendMessageResponse.from(result));
    }
}
