package com.maeum.gohyang.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.UserType;
import com.maeum.gohyang.identity.adapter.in.security.JwtProvider;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    @Mock JwtProvider jwtProvider;
    @InjectMocks StompAuthChannelInterceptor interceptor;

    private org.springframework.messaging.Message<?> buildConnectMessage(String authHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        if (authHeader != null) {
            accessor.setNativeHeader("Authorization", authHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private org.springframework.messaging.Message<?> buildSendMessage() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("유효한 JWT로 CONNECT하면 Principal이 설정된다")
        void validToken_setsPrincipal() {
            // Given
            AuthenticatedUser user = new AuthenticatedUser(1L, UserType.MEMBER);
            given(jwtProvider.parse("valid-token")).willReturn(Optional.of(user));

            var message = buildConnectMessage("Bearer valid-token");

            // When
            var result = interceptor.preSend(message, null);

            // Then
            assertThat(result).isNotNull();
            StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
            assertThat(resultAccessor.getUser()).isNotNull();
            assertThat(resultAccessor.getUser().getName()).isEqualTo("1");
        }

        @Test
        @DisplayName("토큰 없이 CONNECT하면 게스트로 통과한다 (Principal 미설정)")
        void noToken_passesAsGuest() {
            // Given
            var message = buildConnectMessage(null);

            // When
            var result = interceptor.preSend(message, null);

            // Then
            assertThat(result).isNotNull();
            StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
            assertThat(resultAccessor.getUser()).isNull();
        }

        @Test
        @DisplayName("SEND 프레임은 인증 검사 없이 통과한다")
        void sendFrame_passesWithoutAuth() {
            // Given
            var message = buildSendMessage();

            // When
            var result = interceptor.preSend(message, null);

            // Then
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("만료된 JWT로 CONNECT하면 MessageDeliveryException")
        void expiredToken_throwsException() {
            // Given
            given(jwtProvider.parse("expired-token")).willReturn(Optional.empty());

            var message = buildConnectMessage("Bearer expired-token");

            // When & Then
            assertThatThrownBy(() -> interceptor.preSend(message, null))
                    .isInstanceOf(MessageDeliveryException.class)
                    .hasMessageContaining("Invalid or expired token");
        }

        @Test
        @DisplayName("Bearer 접두사 없는 Authorization 헤더는 게스트로 통과한다")
        void noBearerPrefix_passesAsGuest() {
            // Given
            var message = buildConnectMessage("malformed-token");

            // When
            var result = interceptor.preSend(message, null);

            // Then
            assertThat(result).isNotNull();
            StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
            assertThat(resultAccessor.getUser()).isNull();
        }
    }
}
