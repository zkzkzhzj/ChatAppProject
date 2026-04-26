package com.maeum.gohyang.global.config;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.HttpRequestHandler;
import org.springframework.web.servlet.handler.SimpleUrlHandlerMapping;
import org.springframework.web.socket.server.support.OriginHandshakeInterceptor;
import org.springframework.web.socket.server.support.WebSocketHttpRequestHandler;

import com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandler;

import lombok.RequiredArgsConstructor;

/**
 * raw WebSocket(/ws/v2) endpoint 등록 — ws-redis Step 2.
 *
 * Spring 6/7 에서 {@code @EnableWebSocket} 과 {@code @EnableWebSocketMessageBroker} 를
 * 동시 사용하면 동일한 {@code HandlerMapping} 빈을 두 시스템이 import 하므로 한 쪽만
 * 활성화된다(공식 문서 명시). STOMP 시스템({@link WebSocketConfig})은 그대로 두고, raw WS 는
 * {@link WebSocketHttpRequestHandler} + {@link SimpleUrlHandlerMapping} 으로 직접 등록한다.
 *
 * 순환 참조 회피: {@link ChatWebSocketHandler} 는 {@code SendMessageUseCase} 를 거쳐 STOMP
 * 인프라({@code SimpMessagingTemplate})에 간접 의존하므로 {@link ObjectProvider} 로 lazy
 * resolve 한다.
 */
@Configuration
@RequiredArgsConstructor
public class WebSocketV2Config {

    private static final String ENDPOINT = "/ws/v2";

    private final ObjectProvider<ChatWebSocketHandler> chatV2HandlerProvider;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins = List.of();

    @Bean
    public SimpleUrlHandlerMapping webSocketV2HandlerMapping() {
        WebSocketHttpRequestHandler requestHandler =
                new WebSocketHttpRequestHandler(chatV2HandlerProvider.getObject());
        requestHandler.getHandshakeInterceptors().add(jwtHandshakeInterceptor);
        requestHandler.getHandshakeInterceptors().add(new OriginHandshakeInterceptor(allowedOrigins));

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(Map.<String, HttpRequestHandler>of(ENDPOINT, requestHandler));
        // STOMP 시스템의 HandlerMapping(order=1)보다 앞서 매칭되도록 0 으로 둔다.
        mapping.setOrder(0);
        return mapping;
    }
}
