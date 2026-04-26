package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.ChatMessagePayload;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.ErrorEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.InboundFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.MessageEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.OutboundFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.PingFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.PongEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.PositionFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.PositionUpdateEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.PublishFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.SubscribeFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.TypingFrame;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.TypingUpdateEvent;
import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.UnsubscribeFrame;
import com.maeum.gohyang.communication.adapter.out.messaging.redis.RoomMessageBus;
import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.error.BroadcastSerializationException;
import com.maeum.gohyang.communication.error.CommunicationErrorCode;
import com.maeum.gohyang.global.config.JwtHandshakeInterceptor;
import com.maeum.gohyang.global.error.BusinessException;
import com.maeum.gohyang.global.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * /ws/v2 raw WebSocket 핸들러.
 *
 * envelope JSON 분기:
 * - SUBSCRIBE   → RoomSubscriptionRegistry.subscribe
 * - UNSUBSCRIBE → RoomSubscriptionRegistry.unsubscribe
 * - PUBLISH     → 게스트 거부 → SendMessageUseCase.execute (Cassandra 저장) → RoomMessageBus.publish.
 *                  비즈니스 예외(빈 본문, 미참여 등)는 ErrorEvent 로 매핑되어 클라이언트에 통보.
 * - PING        → PongEvent 응답.
 *
 * NPC 응답은 의도적으로 V2 로 보내지 않는다. V1·V2 동시 운영 중에는 BroadcastChatMessagePort
 * 빈을 V1 STOMP 어댑터가 단독으로 차지하고 있어, V2 로 추가 broadcast 하면 빈 충돌 또는 V1
 * 클라이언트 이중 수신이 발생한다. Step 6 cutover 에서 V1 제거와 함께 통합한다 (learning/49).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final WebSocketSessionRegistry sessionRegistry;
    private final RoomSubscriptionRegistry subscriptionRegistry;
    private final ObjectMapper objectMapper;
    private final RoomMessageBus bus;
    private final SendMessageUseCase sendMessageUseCase;

    @Value("${village.map.max-x:2400.0}")
    private double maxX;

    @Value("${village.map.max-y:1600.0}")
    private double maxY;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessionRegistry.register(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        InboundFrame frame;
        try {
            frame = objectMapper.readValue(message.getPayload(), InboundFrame.class);
        } catch (Exception e) {
            sendError(session, CommunicationErrorCode.INVALID_MESSAGE_BODY);
            return;
        }

        switch (frame) {
            case SubscribeFrame s -> subscriptionRegistry.subscribe(s.roomId(), session.getId());
            case UnsubscribeFrame u -> subscriptionRegistry.unsubscribe(u.roomId(), session.getId());
            case PublishFrame p -> handlePublish(session, p);
            case PositionFrame p -> handlePosition(session, p);
            case TypingFrame t -> handleTyping(session, t);
            case PingFrame ignored -> sendOutbound(session, PongEvent.instance());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        subscriptionRegistry.unsubscribeAll(session.getId());
        sessionRegistry.remove(session.getId());
    }

    private void handlePublish(WebSocketSession session, PublishFrame frame) {
        AuthenticatedUser user = JwtHandshakeInterceptor.principalOf(session.getAttributes());
        if (user == null || user.isGuest()) {
            sendError(session, CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED);
            return;
        }

        SendMessageUseCase.Result result;
        try {
            result = sendMessageUseCase.execute(
                    new SendMessageUseCase.Command(user.userId(), frame.roomId(), frame.body()));
        } catch (BusinessException e) {
            sendError(session, e);
            return;
        }

        MessageEvent event = MessageEvent.of(frame.roomId(),
                ChatMessagePayload.fromUser(result.userMessage(), user.userId()));
        bus.publish(frame.roomId(), event);
    }

    /**
     * 위치 공유 — V1 PositionHandler 와 정책 동일.
     * 인증 안 된 세션은 조용히 무시 (오류 응답 X), 좌표는 맵 경계로 clamp 한다.
     * 게스트도 이동 가능 — 채팅과 달리 위치는 게스트에게도 허용된다.
     */
    private void handlePosition(WebSocketSession session, PositionFrame frame) {
        AuthenticatedUser user = JwtHandshakeInterceptor.principalOf(session.getAttributes());
        if (user == null) {
            return;
        }
        if (!Double.isFinite(frame.x()) || !Double.isFinite(frame.y())) {
            return;
        }
        double clampedX = Math.max(0, Math.min(frame.x(), maxX));
        double clampedY = Math.max(0, Math.min(frame.y(), maxY));
        String userType = user.isGuest() ? "GUEST" : "MEMBER";
        bus.publish(frame.roomId(),
                PositionUpdateEvent.of(frame.roomId(), user.displayId(), userType, clampedX, clampedY));
    }

    /** 타이핑 상태 broadcast — V1 TypingHandler 와 정책 동일. 게스트 포함 인증 유저만. */
    private void handleTyping(WebSocketSession session, TypingFrame frame) {
        AuthenticatedUser user = JwtHandshakeInterceptor.principalOf(session.getAttributes());
        if (user == null) {
            return;
        }
        bus.publish(frame.roomId(),
                TypingUpdateEvent.of(frame.roomId(), user.displayId(), frame.typing()));
    }

    private void sendError(WebSocketSession session, CommunicationErrorCode code) {
        sendOutbound(session, ErrorEvent.of(code));
    }

    private void sendError(WebSocketSession session, BusinessException e) {
        sendOutbound(session, ErrorEvent.of(e.getErrorCode(), e.getMessage()));
    }

    private void sendOutbound(WebSocketSession session, OutboundFrame frame) {
        TextMessage message;
        try {
            message = new TextMessage(objectMapper.writeValueAsString(frame));
        } catch (Exception e) {
            throw new BroadcastSerializationException(e);
        }
        if (!session.isOpen()) {
            return;
        }
        try {
            session.sendMessage(message);
        } catch (IOException e) {
            log.warn("Failed to send outbound to session {}: {}", session.getId(), e.getMessage());
        }
    }
}
