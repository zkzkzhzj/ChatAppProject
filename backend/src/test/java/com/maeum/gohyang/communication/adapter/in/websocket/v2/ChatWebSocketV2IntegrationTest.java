package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.awaitility.Awaitility;
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
    /** Redis SUBSCRIBE 활성화 + 세션 라이프사이클 콜백 propagate 폴링 상한. */
    private static final Duration PROPAGATION_AT_MOST = Duration.ofSeconds(2);
    private static final Duration EVENT_AT_MOST = Duration.ofSeconds(10);
    private static final Duration PROPAGATION_POLL_INTERVAL = Duration.ofMillis(50);

    @LocalServerPort
    int port;

    @MockitoBean
    SendMessageUseCase sendMessageUseCase;

    @Autowired
    IssueTokenPort issueTokenPort;

    @Autowired
    RoomSubscriptionRegistry subscriptionRegistry;

    @Autowired
    WebSocketSessionRegistry sessionRegistry;

    private final List<WebSocketSession> openSessions = new ArrayList<>();

    @AfterEach
    void cleanup() throws IOException {
        for (WebSocketSession s : openSessions) {
            if (s.isOpen()) {
                s.close();
            }
        }
        openSessions.clear();
        Awaitility.await()
                .atMost(EVENT_AT_MOST)
                .pollInterval(PROPAGATION_POLL_INTERVAL)
                .untilAsserted(() -> {
                    assertThat(subscriptionRegistry.roomCount()).isZero();
                    assertThat(sessionRegistry.size()).isZero();
                });
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
        // 두 세션의 SUBSCRIBE 가 RoomSubscriptionRegistry 에 반영될 때까지 폴링
        Awaitility.await()
                .atMost(PROPAGATION_AT_MOST)
                .pollInterval(PROPAGATION_POLL_INTERVAL)
                .untilAsserted(() -> assertThat(subscriptionRegistry.sessionCount(roomId))
                        .as("두 세션이 같은 방을 구독한 상태")
                        .isEqualTo(2));

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

        // Then — 방의 세션 카운트가 0 → Redis 채널 unsubscribe 도 호출됐다는 의미
        Awaitility.await()
                .atMost(PROPAGATION_AT_MOST)
                .pollInterval(PROPAGATION_POLL_INTERVAL)
                .untilAsserted(() -> assertThat(subscriptionRegistry.sessionCount(roomId))
                        .as("마지막 세션까지 떠나면 방 자체가 registry 에서 제거되어 sessionCount 가 0")
                        .isZero());
    }

    @Test
    void 게스트는_PUBLISH_시도시_COMM_003_ERROR를_받고_publish는_차단된다() throws Exception {
        // Given — 토큰 없이 핸드셰이크. handlePublish 는 게스트 체크가 publicChatRoomId 가드보다 먼저
        // 잡히므로 roomId 와 무관하게 거부된다. roomId=1 은 SUBSCRIBE 까지 정상 통과시키기 위한 값.
        // publicChatRoomId 가드 자체는 회원 케이스에서 별도 검증.
        long roomId = 1L;
        BlockingQueue<String> queue = new LinkedBlockingQueue<>();
        WebSocketSession session = connectWithoutToken(queue);

        session.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        Awaitility.await()
                .atMost(PROPAGATION_AT_MOST)
                .pollInterval(PROPAGATION_POLL_INTERVAL)
                .untilAsserted(() -> assertThat(subscriptionRegistry.sessionCount(roomId))
                        .as("게스트 세션이 SUBSCRIBE 처리되어 방에 등록된 상태")
                        .isEqualTo(1));

        // When
        session.sendMessage(new TextMessage(
                "{\"type\":\"PUBLISH\",\"roomId\":" + roomId + ",\"body\":\"hi\"}"));

        // Then — ERROR 만 오고 MESSAGE 는 안 와야 한다
        String received = queue.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(received).contains("\"ERROR\"").contains("COMM_003");
        String shouldBeNull = queue.poll(NEGATIVE_WAIT_SECONDS, TimeUnit.SECONDS);
        assertThat(shouldBeNull).as("게스트 publish가 broker 를 통과하면 안 된다").isNull();
    }

    @Test
    void 게스트_토큰_POSITION은_Redis_경로로_POSITION_UPDATE를_broadcast한다() throws Exception {
        // Given
        long roomId = 1L;
        String memberToken = issueTokenPort.issueMemberToken(1001L);
        String guestToken = issueTokenPort.issueGuestToken();

        BlockingQueue<String> memberQueue = new LinkedBlockingQueue<>();
        BlockingQueue<String> guestQueue = new LinkedBlockingQueue<>();
        WebSocketSession memberSession = connect(memberToken, memberQueue);
        WebSocketSession guestSession = connect(guestToken, guestQueue);

        memberSession.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        guestSession.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        awaitSessionCount(roomId, 2);
        drain(memberQueue);

        // When
        guestSession.sendMessage(new TextMessage(
                "{\"type\":\"POSITION\",\"roomId\":" + roomId + ",\"x\":100.0,\"y\":200.0}"));

        // Then
        String received = memberQueue.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(received)
                .contains("\"POSITION_UPDATE\"")
                .contains("\"userType\":\"GUEST\"")
                .contains("\"x\":100.0")
                .contains("\"y\":200.0");
    }

    @Test
    void 토큰_없는_POSITION은_조용히_무시되어_broadcast되지_않는다() throws Exception {
        // Given
        long roomId = 1L;
        BlockingQueue<String> queue = new LinkedBlockingQueue<>();
        WebSocketSession session = connectWithoutToken(queue);

        session.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        awaitSessionCount(roomId, 1);
        drain(queue);

        // When
        session.sendMessage(new TextMessage(
                "{\"type\":\"POSITION\",\"roomId\":" + roomId + ",\"x\":100.0,\"y\":200.0}"));

        // Then
        String received = queue.poll(NEGATIVE_WAIT_SECONDS, TimeUnit.SECONDS);
        assertThat(received).as("Principal 없는 POSITION은 ERROR 없이 silent ignore 되어야 한다").isNull();
    }

    @Test
    void 회원_TYPING은_Redis_경로로_TYPING_UPDATE를_broadcast한다() throws Exception {
        // Given
        long roomId = 1L;
        String tokenA = issueTokenPort.issueMemberToken(1001L);
        String tokenB = issueTokenPort.issueMemberToken(2002L);

        BlockingQueue<String> queueA = new LinkedBlockingQueue<>();
        BlockingQueue<String> queueB = new LinkedBlockingQueue<>();
        WebSocketSession sessionA = connect(tokenA, queueA);
        WebSocketSession sessionB = connect(tokenB, queueB);

        sessionA.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        sessionB.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        awaitSessionCount(roomId, 2);
        drain(queueB);

        // When
        sessionA.sendMessage(new TextMessage(
                "{\"type\":\"TYPING\",\"roomId\":" + roomId + ",\"typing\":true}"));

        // Then
        String received = queueB.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(received)
                .contains("\"TYPING_UPDATE\"")
                .contains("\"displayId\":\"user-1001\"")
                .contains("\"typing\":true");
    }

    @Test
    void 구독_세션이_disconnect되면_같은_방_다른_세션은_LEAVE_POSITION_UPDATE를_받는다() throws Exception {
        // Given
        long roomId = 1L;
        String tokenA = issueTokenPort.issueMemberToken(1001L);
        String tokenB = issueTokenPort.issueMemberToken(2002L);

        BlockingQueue<String> queueA = new LinkedBlockingQueue<>();
        BlockingQueue<String> queueB = new LinkedBlockingQueue<>();
        WebSocketSession sessionA = connect(tokenA, queueA);
        WebSocketSession sessionB = connect(tokenB, queueB);

        sessionA.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        sessionB.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
        awaitSessionCount(roomId, 2);
        drain(queueB);
        sessionA.sendMessage(new TextMessage(
                "{\"type\":\"POSITION\",\"roomId\":" + roomId + ",\"x\":10.0,\"y\":20.0}"));
        awaitMessageContaining(queueB,
                "\"POSITION_UPDATE\"",
                "\"displayId\":\"user-1001\"",
                "\"userType\":\"MEMBER\"",
                "\"x\":10.0",
                "\"y\":20.0");
        drain(queueB);

        // When
        sessionA.close();

        // Then
        awaitMessageContaining(queueB,
                "\"POSITION_UPDATE\"",
                "\"displayId\":\"user-1001\"",
                "\"userType\":\"LEAVE\"",
                "\"x\":0.0",
                "\"y\":0.0");
        awaitSessionCount(roomId, 1);
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

    private void awaitSessionCount(long roomId, int expected) {
        Awaitility.await()
                .atMost(PROPAGATION_AT_MOST)
                .pollInterval(PROPAGATION_POLL_INTERVAL)
                .untilAsserted(() -> assertThat(subscriptionRegistry.sessionCount(roomId))
                        .isEqualTo(expected));
    }

    private void drain(BlockingQueue<String> queue) {
        queue.clear();
    }

    private void awaitMessageContaining(BlockingQueue<String> queue, String... fragments) {
        Awaitility.await()
                .atMost(EVENT_AT_MOST)
                .pollInterval(PROPAGATION_POLL_INTERVAL)
                .untilAsserted(() -> assertThat(queue)
                        .anySatisfy(message -> assertThat(message).contains(fragments)));
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
