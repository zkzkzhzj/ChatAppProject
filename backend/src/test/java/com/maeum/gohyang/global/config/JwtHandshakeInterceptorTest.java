package com.maeum.gohyang.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.ParseTokenPort;
import com.maeum.gohyang.global.security.UserType;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtHandshakeInterceptor — /ws/v2 핸드셰이크 인증")
class JwtHandshakeInterceptorTest {

    @Mock ParseTokenPort parseTokenPort;
    @Mock ServerHttpRequest request;
    @Mock ServerHttpResponse response;
    @Mock WebSocketHandler wsHandler;
    @InjectMocks JwtHandshakeInterceptor interceptor;

    @Test
    void 유효한_토큰이면_attributes에_AuthenticatedUser를_바인딩하고_핸드셰이크를_통과시킨다() {
        // Given
        AuthenticatedUser user = new AuthenticatedUser(42L, UserType.MEMBER);
        given(request.getURI()).willReturn(URI.create("ws://host/ws/v2?access_token=valid-token"));
        given(parseTokenPort.parse("valid-token")).willReturn(Optional.of(user));
        Map<String, Object> attributes = new HashMap<>();

        // When
        boolean result = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        // Then
        assertThat(result).isTrue();
        assertThat(attributes.get(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY)).isEqualTo(user);
    }

    @Test
    void 만료되거나_위조된_토큰이면_401을_세팅하고_핸드셰이크를_거부한다() {
        // Given
        given(request.getURI()).willReturn(URI.create("ws://host/ws/v2?access_token=bad-token"));
        given(parseTokenPort.parse("bad-token")).willReturn(Optional.empty());
        Map<String, Object> attributes = new HashMap<>();

        // When
        boolean result = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        // Then
        assertThat(result).isFalse();
        verify(response).setStatusCode(HttpStatus.UNAUTHORIZED);
        assertThat(attributes).doesNotContainKey(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY);
    }

    @Test
    void 토큰이_없으면_핸드셰이크는_통과하되_Principal은_바인딩되지_않는다() {
        // Given — 게스트가 access_token 없이 연결 시도. 핸들러가 PUBLISH 시 거부할 책임.
        given(request.getURI()).willReturn(URI.create("ws://host/ws/v2"));
        Map<String, Object> attributes = new HashMap<>();

        // When
        boolean result = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        // Then
        assertThat(result).isTrue();
        assertThat(attributes).doesNotContainKey(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY);
        verify(parseTokenPort, never()).parse(anyString());
    }

    @Test
    void 빈_토큰_문자열도_게스트로_간주되어_파싱을_시도하지_않는다() {
        // Given
        given(request.getURI()).willReturn(URI.create("ws://host/ws/v2?access_token="));
        Map<String, Object> attributes = new HashMap<>();

        // When
        boolean result = interceptor.beforeHandshake(request, response, wsHandler, attributes);

        // Then
        assertThat(result).isTrue();
        verify(parseTokenPort, never()).parse(anyString());
    }

    @Test
    void principalOf_헬퍼는_저장된_AuthenticatedUser를_반환하거나_null을_돌려준다() {
        // Given
        Map<String, Object> withUser = new HashMap<>();
        AuthenticatedUser user = new AuthenticatedUser(7L, UserType.MEMBER);
        withUser.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);

        // When & Then
        assertThat(JwtHandshakeInterceptor.principalOf(withUser)).isEqualTo(user);
        assertThat(JwtHandshakeInterceptor.principalOf(new HashMap<>())).isNull();
    }
}
