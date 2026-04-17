package com.maeum.gohyang.global.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import lombok.RequiredArgsConstructor;

/**
 * STOMP over WebSocket 설정.
 *
 * - /ws        : STOMP 엔드포인트 (SockJS fallback 포함)
 * - /app       : 클라이언트 → 서버 메시지 prefix (@MessageMapping 라우팅)
 * - /topic     : 서버 → 클라이언트 broadcast (1:N, 채팅방 구독)
 * - /queue     : 서버 → 특정 클라이언트 전송 (1:1, 추후 개인 알림용)
 *
 * Phase 3: 인메모리 Simple Broker 사용.
 * 스케일아웃이 필요해지면 RabbitMQ 또는 Redis Pub/Sub 외부 브로커로 교체한다.
 * 경로들은 API 계약의 일부이므로 환경별로 다르지 않다. 코드에 정의한다.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new))
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}
