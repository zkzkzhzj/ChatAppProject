package com.maeum.gohyang.global.config;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.global.security.ParseTokenPort;

import lombok.RequiredArgsConstructor;

/**
 * STOMP CONNECT 프레임에서 JWT를 추출해 인증 정보를 설정하는 인터셉터.
 *
 * 토큰이 없거나 만료/유효하지 않으면 STOMP 연결을 거부한다.
 * 클라이언트는 STOMP ERROR 프레임을 받게 되고, onStompError 콜백이 호출된다.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final ParseTokenPort parseTokenPort;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            throw new MessageDeliveryException("Authorization header is required");
        }

        String authHeader = authHeaders.get(0);
        if (!authHeader.startsWith(BEARER_PREFIX)) {
            throw new MessageDeliveryException("Authorization header must start with 'Bearer '");
        }

        String token = authHeader.substring(BEARER_PREFIX.length());
        accessor.setUser(
                parseTokenPort.parse(token)
                        .orElseThrow(() -> new MessageDeliveryException("Invalid or expired token"))
        );

        return message;
    }
}
