package com.maeum.gohyang.communication.adapter.in.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.maeum.gohyang.communication.ChatTopics;
import com.maeum.gohyang.communication.adapter.in.web.MessageResponse;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.error.GuestChatNotAllowedException;
import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.UserType;

/**
 * STOMP 핸들러의 회귀 안전망. ws-redis 트랙(raw WS + Redis Pub/Sub)으로 옮겨가는 동안
 * V1 STOMP 경로의 게이트(게스트 거부) · 정상 흐름이 깨지지 않는지 검증한다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ChatMessageHandler — STOMP /app/chat/village")
class ChatMessageHandlerTest {

    private static final long PUBLIC_CHAT_ROOM_ID = 1L;

    @Mock SendMessageUseCase sendMessageUseCase;
    @Mock SimpMessagingTemplate messagingTemplate;
    @InjectMocks ChatMessageHandler handler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(handler, "publicChatRoomId", PUBLIC_CHAT_ROOM_ID);
    }

    @Test
    void 게스트는_메시지를_전송할_수_없고_UseCase와_브로드캐스트가_호출되지_않는다() {
        // Given
        AuthenticatedUser guest = new AuthenticatedUser(null, UserType.GUEST, "guest-abc");
        StompSendMessageRequest request = new StompSendMessageRequest("안녕");

        // When & Then
        assertThatThrownBy(() -> handler.handleMessage(request, guest))
                .isInstanceOf(GuestChatNotAllowedException.class);

        verify(sendMessageUseCase, never()).execute(any());
        verify(messagingTemplate, never()).convertAndSend(any(String.class), any(Object.class));
    }

    @Test
    void Principal이_null이면_게스트로_간주되어_거부된다() {
        // Given
        StompSendMessageRequest request = new StompSendMessageRequest("안녕");

        // When & Then
        assertThatThrownBy(() -> handler.handleMessage(request, null))
                .isInstanceOf(GuestChatNotAllowedException.class);

        verify(sendMessageUseCase, never()).execute(any());
    }

    @Test
    void AuthenticatedUser가_아닌_Principal은_거부된다() {
        // Given — 외부에서 다른 Principal 구현이 들어오는 비정상 경로
        Principal foreignPrincipal = () -> "anonymous";
        StompSendMessageRequest request = new StompSendMessageRequest("안녕");

        // When & Then
        assertThatThrownBy(() -> handler.handleMessage(request, foreignPrincipal))
                .isInstanceOf(GuestChatNotAllowedException.class);
    }

    @Test
    void 회원의_메시지는_UseCase로_저장되고_VILLAGE_CHAT_토픽으로_브로드캐스트된다() {
        // Given
        long userId = 42L;
        AuthenticatedUser member = new AuthenticatedUser(userId, UserType.MEMBER);
        StompSendMessageRequest request = new StompSendMessageRequest("안녕하세요");
        Message savedMessage = Message.restore(
                UUID.randomUUID(), PUBLIC_CHAT_ROOM_ID, 99L, "안녕하세요",
                MessageType.TEXT, Instant.now());
        given(sendMessageUseCase.execute(
                new SendMessageUseCase.Command(userId, PUBLIC_CHAT_ROOM_ID, "안녕하세요")))
                .willReturn(new SendMessageUseCase.Result(savedMessage));

        // When
        handler.handleMessage(request, member);

        // Then — 토픽과 payload 모양이 모두 회귀 보호 대상
        MessageResponse expected = MessageResponse.fromUser(savedMessage, userId);
        verify(messagingTemplate).convertAndSend(eq(ChatTopics.VILLAGE_CHAT), eq(expected));
        assertThat(ChatTopics.VILLAGE_CHAT).isEqualTo("/topic/chat/village");
    }
}
