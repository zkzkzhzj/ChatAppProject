package com.maeum.gohyang.global.config;

import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.ParseTokenPort;

import lombok.RequiredArgsConstructor;

/**
 * raw WebSocket(/ws/v2) 핸드셰이크 시 쿼리 파라미터 {@code access_token}을 검증한다.
 *
 * 정책:
 * - 토큰이 없거나 빈 문자열이면 핸드셰이크는 통과시키되 attributes에 Principal을 두지 않는다.
 *   PUBLISH 시도 시 핸들러가 게스트로 간주해 거부한다 (V1 STOMP 정책 미러).
 * - 토큰이 있으나 파싱 실패면 401로 핸드셰이크 자체를 거부한다 (CONNECT 단계에서 차단).
 */
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String AUTHENTICATED_USER_KEY = "authenticatedUser";
    private static final String ACCESS_TOKEN_PARAM = "access_token";

    private final ParseTokenPort parseTokenPort;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String token = UriComponentsBuilder.fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst(ACCESS_TOKEN_PARAM);

        if (token == null || token.isBlank()) {
            return true;
        }

        return parseTokenPort.parse(token)
                .map(user -> {
                    attributes.put(AUTHENTICATED_USER_KEY, user);
                    return true;
                })
                .orElseGet(() -> {
                    response.setStatusCode(HttpStatus.UNAUTHORIZED);
                    return false;
                });
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               @Nullable Exception exception) {
        // no-op
    }

    /**
     * 핸들러 측에서 Principal 추출을 일관되게 하기 위한 헬퍼.
     */
    public static @Nullable AuthenticatedUser principalOf(Map<String, Object> attributes) {
        Object value = attributes.get(AUTHENTICATED_USER_KEY);
        return (value instanceof AuthenticatedUser user) ? user : null;
    }
}
