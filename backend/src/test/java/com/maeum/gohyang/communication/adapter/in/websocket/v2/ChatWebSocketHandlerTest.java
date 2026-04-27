package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.MessageEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.OutboundFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.PositionUpdateEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.TypingUpdateEvent;
import com.maeum.gohyang.communication.adapter.out.messaging.redis.RoomMessageBus;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.error.InvalidMessageBodyException;
import com.maeum.gohyang.communication.error.NotParticipantException;
import com.maeum.gohyang.global.config.JwtHandshakeInterceptor;
import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.UserType;

import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ChatWebSocketHandler — /ws/v2 envelope 분기")
class ChatWebSocketHandlerTest {

    private static final String SESSION_ID = "session-1";

    @Mock WebSocketSession session;
    @Mock WebSocketSessionRegistry sessionRegistry;
    @Mock RoomSubscriptionRegistry subscriptionRegistry;
    @Mock RoomMessageBus bus;
    @Mock SendMessageUseCase sendMessageUseCase;

    private ChatWebSocketHandler handler;
    private Map<String, Object> sessionAttributes;

    @BeforeEach
    void setUp() {
        handler = new ChatWebSocketHandler(sessionRegistry, subscriptionRegistry,
                JsonMapper.builder().build(), bus, sendMessageUseCase);
        // @Value 주입은 단위 테스트에선 ReflectionTestUtils 로 세팅
        org.springframework.test.util.ReflectionTestUtils.setField(handler, "publicChatRoomId", 1L);
        org.springframework.test.util.ReflectionTestUtils.setField(handler, "maxX", 2400.0);
        org.springframework.test.util.ReflectionTestUtils.setField(handler, "maxY", 1600.0);
        sessionAttributes = new HashMap<>();
        given(session.getId()).willReturn(SESSION_ID);
        given(session.getAttributes()).willReturn(sessionAttributes);
    }

    @Test
    void 연결이_수립되면_sessionRegistry에_등록된다() {
        handler.afterConnectionEstablished(session);

        verify(sessionRegistry).register(session);
    }

    @Test
    void SUBSCRIBE_프레임은_RoomSubscriptionRegistry로_위임된다() throws Exception {
        // Given — publicChatRoomId 와 일치하는 방
        TextMessage frame = new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":1}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(subscriptionRegistry).subscribe(1L, SESSION_ID);
    }

    @Test
    void UNSUBSCRIBE_프레임은_RoomSubscriptionRegistry로_위임된다() throws Exception {
        // Given — publicChatRoomId 와 일치하는 방
        TextMessage frame = new TextMessage("{\"type\":\"UNSUBSCRIBE\",\"roomId\":1}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(subscriptionRegistry).unsubscribe(1L, SESSION_ID);
    }

    // ============================================================
    // publicChatRoomId 가드 (Step 3 멤버십 검증으로 일반화 예정 — issue #31)
    // ============================================================

    @Test
    void publicChatRoomId_와_다른_방_SUBSCRIBE는_NOT_PARTICIPANT_ERROR로_거부된다() throws Exception {
        // Given — publicChatRoomId 는 1L 인데 클라이언트가 다른 방 ID(42) 로 시도
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":42}");

        // When
        handler.handleTextMessage(session, frame);

        // Then — registry 호출 없음 + COMM_002 ERROR 응답
        verify(subscriptionRegistry, never()).subscribe(anyLong(), any());
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_002");
    }

    @Test
    void publicChatRoomId_와_다른_방_UNSUBSCRIBE는_NOT_PARTICIPANT_ERROR로_거부된다() throws Exception {
        // Given
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"UNSUBSCRIBE\",\"roomId\":42}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(subscriptionRegistry, never()).unsubscribe(anyLong(), any());
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_002");
    }

    @Test
    void publicChatRoomId_와_다른_방_PUBLISH는_NOT_PARTICIPANT_ERROR로_거부되고_UseCase호출_안됨() throws Exception {
        // Given — 회원이라 GUEST_CHAT_NOT_ALLOWED 보다 publicChatRoomId 가드가 먼저 잡혀야 함
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"PUBLISH\",\"roomId\":42,\"body\":\"침투\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then — UseCase 호출 X, bus publish X, COMM_002 ERROR 응답
        verify(sendMessageUseCase, never()).execute(any(SendMessageUseCase.Command.class));
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_002");
    }

    @Test
    void publicChatRoomId_와_다른_방_POSITION은_NOT_PARTICIPANT_ERROR로_거부되고_publish_안됨() throws Exception {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"POSITION\",\"roomId\":42,\"x\":100.0,\"y\":200.0}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(bus, never()).publish(anyLong(), any(OutboundFrame.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_002");
    }

    @Test
    void publicChatRoomId_와_다른_방_TYPING은_NOT_PARTICIPANT_ERROR로_거부되고_publish_안됨() throws Exception {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"TYPING\",\"roomId\":42,\"typing\":true}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(bus, never()).publish(anyLong(), any(OutboundFrame.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_002");
    }

    @Test
    void 회원의_PUBLISH는_SendMessageUseCase로_저장된_뒤_RoomMessageBus로_publish된다() throws Exception {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        given(session.isOpen()).willReturn(true);
        Message saved = Message.restore(UUID.randomUUID(), 1L, 7L, "안녕",
                MessageType.TEXT, Instant.now());
        given(sendMessageUseCase.execute(new SendMessageUseCase.Command(101L, 1L, "안녕")))
                .willReturn(new SendMessageUseCase.Result(saved));
        TextMessage frame = new TextMessage("{\"type\":\"PUBLISH\",\"roomId\":1,\"body\":\"안녕\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        ArgumentCaptor<MessageEvent> captor = ArgumentCaptor.forClass(MessageEvent.class);
        verify(bus).publish(eq(1L), captor.capture());
        assertThat(captor.getValue().roomId()).isEqualTo(1L);
        assertThat(captor.getValue().message().body()).isEqualTo("안녕");
        assertThat(captor.getValue().message().senderId()).isEqualTo(101L);
        assertThat(captor.getValue().message().participantId()).isEqualTo(7L);
        verify(session, never()).sendMessage(any(TextMessage.class)); // ERROR 안 나감
    }

    @Test
    void UseCase가_빈_본문_예외를_던지면_COMM_004_ERROR로_매핑되고_publish는_차단된다() throws Exception {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        given(session.isOpen()).willReturn(true);
        // 본문이 비어있지 않은 PUBLISH 프레임 — Command 생성자가 아닌 UseCase 본문에서 던지는 케이스 시뮬레이션
        given(sendMessageUseCase.execute(any(SendMessageUseCase.Command.class)))
                .willThrow(new InvalidMessageBodyException());
        TextMessage frame = new TextMessage("{\"type\":\"PUBLISH\",\"roomId\":1,\"body\":\"hi\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload())
                .contains("\"ERROR\"")
                .contains("COMM_004");
    }

    @Test
    void UseCase가_미참여_예외를_던지면_COMM_002_ERROR로_매핑된다() throws Exception {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        given(session.isOpen()).willReturn(true);
        given(sendMessageUseCase.execute(any(SendMessageUseCase.Command.class)))
                .willThrow(new NotParticipantException());
        TextMessage frame = new TextMessage("{\"type\":\"PUBLISH\",\"roomId\":1,\"body\":\"hi\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("COMM_002");
    }

    @Test
    void 게스트의_PUBLISH는_ERROR_event가_전송되고_publish가_차단된다() throws Exception {
        // Given
        AuthenticatedUser guest = new AuthenticatedUser(null, UserType.GUEST, "guest-x");
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, guest);
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"PUBLISH\",\"roomId\":1,\"body\":\"안녕\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_003");
    }

    @Test
    void Principal이_없는_PUBLISH도_ERROR_로_거부된다() throws Exception {
        // Given — attributes에 Principal 미등록 (게스트 핸드셰이크 + 토큰 없음 케이스)
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"PUBLISH\",\"roomId\":1,\"body\":\"안녕\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then — 게스트와 동일한 GUEST_CHAT_NOT_ALLOWED(COMM_003) ERROR 가 떨어져야 한다
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_003");
    }

    @Test
    void PING은_PONG으로_응답한다() throws Exception {
        // Given
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"PING\"}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"PONG\"");
    }

    @Test
    void 잘못된_JSON은_INVALID_MESSAGE_BODY_ERROR로_응답한다() throws Exception {
        // Given
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{not-json");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("COMM_004");
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
    }

    @Test
    void 연결이_종료되면_모든_방에서_세션을_제거하고_sessionRegistry에서도_제거한다() {
        // When
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);

        // Then
        verify(subscriptionRegistry).unsubscribeAll(SESSION_ID);
        verify(sessionRegistry).remove(SESSION_ID);
    }

    @Test
    void POSITION은_좌표가_clamping된_PositionUpdateEvent로_publish된다() throws Exception {
        // Given — 회원 + maxX 초과 + 음수 y
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        TextMessage frame = new TextMessage("{\"type\":\"POSITION\",\"roomId\":1,\"x\":3000.0,\"y\":-50.0}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        ArgumentCaptor<OutboundFrame> captor = ArgumentCaptor.forClass(OutboundFrame.class);
        verify(bus).publish(eq(1L), captor.capture());
        assertThat(captor.getValue()).isInstanceOf(PositionUpdateEvent.class);
        PositionUpdateEvent event = (PositionUpdateEvent) captor.getValue();
        assertThat(event.x()).isEqualTo(2400.0);   // clamped to maxX
        assertThat(event.y()).isEqualTo(0.0);      // clamped to 0
        assertThat(event.displayId()).isEqualTo("user-101");
        assertThat(event.userType()).isEqualTo("MEMBER");
    }

    @Test
    void POSITION은_게스트도_publish된다() throws Exception {
        // Given — V1 PositionHandler 정책: 게스트도 이동 가능
        AuthenticatedUser guest = new AuthenticatedUser(null, UserType.GUEST, "guest-abc");
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, guest);
        TextMessage frame = new TextMessage("{\"type\":\"POSITION\",\"roomId\":1,\"x\":100.0,\"y\":200.0}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        ArgumentCaptor<OutboundFrame> captor = ArgumentCaptor.forClass(OutboundFrame.class);
        verify(bus).publish(eq(1L), captor.capture());
        PositionUpdateEvent event = (PositionUpdateEvent) captor.getValue();
        assertThat(event.userType()).isEqualTo("GUEST");
        assertThat(event.displayId()).isEqualTo("guest-abc");
    }

    @Test
    void Principal이_없는_POSITION은_조용히_무시된다() throws Exception {
        // Given
        TextMessage frame = new TextMessage("{\"type\":\"POSITION\",\"roomId\":1,\"x\":100.0,\"y\":200.0}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        verify(bus, never()).publish(anyLong(), any(OutboundFrame.class));
        verify(session, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    void TYPING은_TypingUpdateEvent로_publish된다() throws Exception {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
        sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
        TextMessage frame = new TextMessage("{\"type\":\"TYPING\",\"roomId\":1,\"typing\":true}");

        // When
        handler.handleTextMessage(session, frame);

        // Then
        ArgumentCaptor<OutboundFrame> captor = ArgumentCaptor.forClass(OutboundFrame.class);
        verify(bus).publish(eq(1L), captor.capture());
        assertThat(captor.getValue()).isInstanceOf(TypingUpdateEvent.class);
        TypingUpdateEvent event = (TypingUpdateEvent) captor.getValue();
        assertThat(event.typing()).isTrue();
        assertThat(event.displayId()).isEqualTo("user-101");
    }

    @Test
    void 알_수_없는_envelope_type은_INVALID_MESSAGE_BODY로_거부된다() throws Exception {
        // Given — outbound 전용 type을 클라이언트가 보내는 비정상 케이스
        given(session.isOpen()).willReturn(true);
        TextMessage frame = new TextMessage("{\"type\":\"MESSAGE\",\"roomId\":1}");

        // When
        handler.handleTextMessage(session, frame);

        // Then — Jackson polymorphic 디스패치 단계에서 INVALID_MESSAGE_BODY(COMM_004) 로 거절됨
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"ERROR\"").contains("COMM_004");
        verify(bus, never()).publish(anyLong(), any(MessageEvent.class));
    }

}
