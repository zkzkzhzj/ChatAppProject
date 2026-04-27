package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import com.maeum.gohyang.support.BaseTestContainers;

/**
 * /ws/v2 end-to-end 통합 테스트.
 *
 * 검증:
 * - 실제 WebSocket 핸드셰이크 + 쿼리 토큰 인증 (JwtProvider 가 발급한 진짜 토큰 사용)
 * - 같은 방을 SUBSCRIBE 한 두 세션 간 PUBLISH→수신 (Redis Pub/Sub 경로 통과)
 * - 게스트 PUBLISH 거부 → ERROR 수신
 * - 마지막 세션 종료 시 RoomSubscriptionRegistry 청소 + Redis 채널 unsubscribe
 *
 * SendMessageUseCase 만 {@link MockitoBean} 으로 교체해 Cassandra/JPA 의존을 제거한다.
 * JWT 는 JwtProvider 가 ParseTokenPort + IssueTokenPort 를 동시에 구현하므로 mock 으로
 * 대체하면 다른 빈의 JwtProvider 타입 주입이 깨진다 → 실제 빈 사용.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("/ws/v2 end-to-end — Redis Pub/Sub broker 경로")
class ChatWebSocketV2IntegrationTest extends BaseTestContainers {

    private static final long RECEIVE_TIMEOUT_SECONDS = 5L;
    private static final long NEGATIVE_WAIT_SECONDS = 1L;
    /** Redis SUBSCRIBE 활성화 + 세션 라이프사이클 콜백 propagate 대기. */
    private static final long PROPAGATION_MILLIS = 400L;

    @LocalServerPort
    int port;

    @MockitoBean
    SendMessageUseCase sendMessageUseCase;

    @Autowired
    IssueTokenPort issueTokenPort;

    @Autowired
    RoomSubscriptionRegistry subscriptionRegistry;

    private final List<WebSocketSession> openSessions = new ArrayList<>();

    @AfterEach
    void cleanup() throws IOException {
        for (WebSocketSession s : openSessions) {
            if (s.isOpen()) {
                s.close();
            }
        }
        openSessions.clear();
    }

    @Test
    void 같은_방을_구독한_두_세션은_PUBLISH된_메시지를_상호_수신하고_둘이_떠나면_방이_정리된다() throws Exception {
        // Given — application-test.yml 의 village.public-chat-room-id (=1) 와 일치해야 가드 통과
        long roomId = 1L;
        String tokenA = issueTokenPort.issueMemberToken(1001L);
        String tokenB = issueTokenPort.issueMemberToken(2002L);
        givenSendMessageEchoesBackInput();

        BlockingQueue<String> queueA = new LinkedBlockingQueue<>();
        BlockingQueue<String> queueB = new LinkedBlockingQueue<>();
        WebSocketSession sessionA = connect(tokenA, queueA);
        WebSocketSession sessionB = connect(tokenB, queueB);

        sessionA.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        sessionB.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        Thread.sleep(PROPAGATION_MILLIS);
        assertThat(subscriptionRegistry.sessionCount(roomId))
                .as("두 세션이 같은 방을 구독한 상태")
                .isEqualTo(2);

        // When — A가 메시지 발행
        sessionA.sendMessage(new TextMessage(
                "{\"type\":\"PUBLISH\",\"roomId\":" + roomId + ",\"body\":\"hello\"}"));

        // Then — A·B 둘 다 MESSAGE 수신 (Redis Pub/Sub 경로 통과 검증)
        String receivedB = queueB.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        String receivedA = queueA.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(receivedB).contains("\"MESSAGE\"").contains("\"body\":\"hello\"");
        assertThat(receivedA).contains("\"MESSAGE\"").contains("\"body\":\"hello\"");

        // When — 둘 다 종료
        sessionA.close();
        sessionB.close();
        Thread.sleep(PROPAGATION_MILLIS);

        // Then — 방의 세션 카운트가 0 → Redis 채널 unsubscribe 도 호출됐다는 의미
        assertThat(subscriptionRegistry.sessionCount(roomId))
                .as("마지막 세션까지 떠나면 방 자체가 registry 에서 제거되어 sessionCount 가 0")
                .isZero();
    }

    @Test
    void 게스트는_PUBLISH_시도시_COMM_003_ERROR를_받고_publish는_차단된다() throws Exception {
        // Given — 토큰 없이 핸드셰이크. publicChatRoomId(=1) 와 일치 (가드 통과해야 게스트 거부 단계까지 간다)
        long roomId = 1L;
        BlockingQueue<String> queue = new LinkedBlockingQueue<>();
        WebSocketSession session = connectWithoutToken(queue);

        session.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        Thread.sleep(PROPAGATION_MILLIS);

        // When
        session.sendMessage(new TextMessage(
                "{\"type\":\"PUBLISH\",\"roomId\":" + roomId + ",\"body\":\"hi\"}"));

        // Then — ERROR 만 오고 MESSAGE 는 안 와야 한다
        String received = queue.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(received).contains("\"ERROR\"").contains("COMM_003");
        String shouldBeNull = queue.poll(NEGATIVE_WAIT_SECONDS, TimeUnit.SECONDS);
        assertThat(shouldBeNull).as("게스트 publish가 broker 를 통과하면 안 된다").isNull();
    }

    private void givenSendMessageEchoesBackInput() {
        given(sendMessageUseCase.execute(any(SendMessageUseCase.Command.class)))
                .willAnswer(inv -> {
                    SendMessageUseCase.Command cmd = inv.getArgument(0);
                    Message saved = Message.restore(
                            UUID.randomUUID(), cmd.chatRoomId(), 99L, cmd.body(),
                            MessageType.TEXT, Instant.now());
                    return new SendMessageUseCase.Result(saved);
                });
    }

    private WebSocketSession connect(String token, BlockingQueue<String> sink) throws Exception {
        return connectInternal(URI.create(
                "ws://localhost:" + port + "/ws/v2?access_token=" + token), sink);
    }

    private WebSocketSession connectWithoutToken(BlockingQueue<String> sink) throws Exception {
        return connectInternal(URI.create("ws://localhost:" + port + "/ws/v2"), sink);
    }

    private WebSocketSession connectInternal(URI uri, BlockingQueue<String> sink) throws Exception {
        StandardWebSocketClient client = new StandardWebSocketClient();
        TextWebSocketHandler handler = new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage msg) {
                sink.add(msg.getPayload());
            }
        };
        WebSocketSession session = client.execute(handler, null, uri)
                .get(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        openSessions.add(session);
        return session;
    }
}
