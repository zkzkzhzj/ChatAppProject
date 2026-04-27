# 15 — WebSocket + STOMP 동작 원리와 이 프로젝트에서의 구현

> WebSocket을 처음 접하거나 "소켓 통신이 된다는 게 정확히 무슨 의미인지" 궁금할 때 읽는 문서.
> 추상적인 설명보다 이 프로젝트 코드와 함께 설명한다.
>
> ℹ️ **시점 공지 (2026-04-27 추가)**
>
> 이 노트는 **STOMP + Simple Broker 시대**(2026년 초) 작성. 현재 트랙은 **raw WebSocket + Redis Pub/Sub** 재설계 중 ([#45](./45-websocket-redis-pubsub-redesign.md), [#59](./59-ws-server-separation-vs-monolith.md) ③ 채택).
>
> **여전히 유효**: WebSocket 핸드셰이크 / SockJS fallback / 프로토콜 레벨 동작 (메시지 계층 무관)
>
> **변경 예정**: §4 STOMP 프레임 형식 / §5 SimpleBroker 기반 구조 — cutover 후 정리 대상

---

## 1. HTTP의 한계와 WebSocket이 나온 이유

HTTP는 **요청-응답** 모델이다.

```text
클라이언트 → [요청] → 서버
클라이언트 ← [응답] ← 서버
```

클라이언트가 먼저 요청해야만 서버가 응답할 수 있다.
서버가 "지금 새 메시지가 왔어요"를 클라이언트에게 **먼저** 알릴 방법이 없다.

과거에는 이를 해결하기 위해 **Polling** 이나 **Long Polling** 을 썼다.

- Polling: 클라이언트가 0.5초마다 "새 메시지 있어요?" HTTP 요청 → 대부분 "없음"
- Long Polling: 서버가 응답을 지연시키다가 메시지 오면 응답 → 연결을 계속 재생성

둘 다 오버헤드가 크다.

**WebSocket**은 이 문제를 근본적으로 해결한다.
처음 HTTP로 핸드셰이크를 하고, 이후 **단일 TCP 연결을 유지**한다.
이 연결 위에서 서버와 클라이언트가 **언제든 양방향으로** 메시지를 주고받는다.

```text
클라이언트 ←──── 지속 연결(TCP) ────→ 서버
              (양방향, 실시간)
```

---

## 2. WebSocket 핸드셰이크 — HTTP에서 WebSocket으로 업그레이드

WebSocket 연결은 HTTP 요청으로 시작한다.

```text
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

서버가 수락하면:

```text
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

`101 Switching Protocols` 이후로 이 TCP 연결은 더 이상 HTTP가 아니다.
WebSocket 프레임을 주고받는 전용 채널이 된다.

이 프로젝트에서는 `/ws` 경로가 그 엔드포인트다.

```java
registry.addEndpoint("/ws")
        .setAllowedOriginPatterns("*")
        .withSockJS();
```

---

## 3. SockJS — WebSocket을 지원하지 않는 환경을 위한 Fallback

일부 구형 브라우저나 방화벽 환경에서는 WebSocket 핸드셰이크가 막힌다.
SockJS는 WebSocket을 먼저 시도하고, 실패하면 다른 전송 방식으로 자동 전환한다.

| 우선순위 | 전송 방식 |
|---------|---------|
| 1 | WebSocket (네이티브) |
| 2 | HTTP Streaming |
| 3 | HTTP Long Polling |

클라이언트 코드는 전송 방식이 바뀌어도 동일하다.

```javascript
const socket = new SockJS('/ws');
// 이 아래는 WebSocket이든 Long Polling이든 동일하게 동작
```

SockJS가 연결 전에 `/ws/info`로 GET 요청을 보내 서버 설정을 확인한다.
그래서 로그에 `GET /ws/info` 가 찍히는 것이 정상이다.

---

## 4. STOMP — WebSocket 위의 메시징 프로토콜

WebSocket은 단순히 "바이트를 주고받는 파이프"다.
그 파이프 위에서 **어디로 보낼지, 누가 받을지** 를 정의하는 규칙이 필요하다.

STOMP(Simple Text Oriented Messaging Protocol)는 그 규칙이다.
채팅, pub/sub, 라우팅 등을 위한 메시지 프레임 형식을 정의한다.

STOMP 프레임 구조:

```text
COMMAND
header1:value1
header2:value2

body^@
```

주요 커맨드:

| COMMAND | 방향 | 의미 |
|---------|------|------|
| CONNECT | 클라이언트 → 서버 | 연결 요청 |
| SUBSCRIBE | 클라이언트 → 서버 | 특정 목적지 구독 |
| SEND | 클라이언트 → 서버 | 메시지 전송 |
| MESSAGE | 서버 → 클라이언트 | 구독 채널에 메시지 전달 |
| DISCONNECT | 클라이언트 → 서버 | 연결 종료 |

실제 채팅 메시지 전송 프레임:

```text
SEND
destination:/app/chat/village
content-type:application/json

{"body":"안녕하세요"}^@
```

---

## 5. 이 프로젝트의 STOMP 구조

### 5.1 목적지(Destination) 설계

```text
/app/chat/village          ← 클라이언트 → 서버 (메시지 전송)
/topic/chat/village        ← 서버 → 클라이언트 (NPC 응답 broadcast)
```

`/app` prefix: Spring이 `@MessageMapping`으로 라우팅하는 영역이다.
`/topic` prefix: Simple Broker가 관리하는 구독 채널이다.

```java
// WebSocketConfig.java
config.enableSimpleBroker("/topic", "/queue");    // 브로커가 /topic, /queue 관리
config.setApplicationDestinationPrefixes("/app"); // /app으로 오면 @MessageMapping으로 라우팅
```

### 5.2 메시지 흐름 상세

클라이언트가 `/app/chat/village`로 메시지를 보낼 때 Spring 내부에서 일어나는 일:

```text
클라이언트 SEND /app/chat/village
    │
    ▼
ChannelInterceptor (인증 검사)
    │
    ▼
@MessageMapping("/chat/village")   ← /app prefix 제거 후 매핑
ChatMessageHandler.handleMessage()
    │
    ▼
SendMessageUseCase.execute()
    │
    ├─ Message(유저) → Cassandra 저장
    └─ broadcast: messagingTemplate.convertAndSend("/topic/chat/village", userMessage)
    │
    ▼ (@Async 별도 스레드)
NPC 응답 생성 → Message(NPC) → Cassandra 저장
    → 비동기 broadcast: messagingTemplate.convertAndSend("/topic/chat/village", npcMessage)
    │
    ▼
Simple Broker → /topic/chat/village 구독 중인 모든 클라이언트에게 MESSAGE 프레임 전송
```

### 5.3 REST와 WebSocket이 같은 UseCase를 공유하는 이유

현재 메시지 전송 경로가 두 개다.

```text
경로 A: REST POST /api/v1/chat/messages
경로 B: STOMP   /app/chat/village
```

둘 다 `SendMessageUseCase`를 호출한다. 비즈니스 로직은 한 곳에만 있다.

차이점:

| 항목 | REST | STOMP |
|------|------|-------|
| 응답 방식 | HTTP 응답으로 userMessage만 반환. NPC 응답은 비동기 WebSocket broadcast | 응답 없음, 구독 채널로만 수신 |
| NPC 응답 broadcast | 있음 (@Async 별도 스레드에서 비동기 broadcast) | 있음 (동일) |
| 테스트 | Cucumber Happy Path 검증 완료 | 수동 테스트 필요 |
| 주 용도 | Happy Path, 테스트 | 실시간 UX (프론트엔드) |

REST 경로도 `SimpMessagingTemplate`으로 broadcast를 하기 때문에,
REST로 메시지를 보내도 구독 중인 WebSocket 클라이언트가 NPC 응답을 받는다.

---

## 6. Simple Broker 내부 동작

Simple Broker는 Spring이 JVM 내에서 직접 관리하는 인메모리 pub/sub 시스템이다.

```text
SUBSCRIBE /topic/chat/village
    → Simple Broker: "세션 abc123이 /topic/chat/village 구독 중" 을 Map에 기록

MESSAGE /topic/chat/village
    → Simple Broker: Map에서 /topic/chat/village 구독자 목록 조회
    → 각 구독자 세션에 MESSAGE 프레임 전달
```

**단점**: 이 Map은 JVM 프로세스 안에만 있다.
서버 인스턴스를 2개 띄우면 각자 독립된 Map을 갖는다.
인스턴스 A에 연결한 클라이언트와 인스턴스 B에 연결한 클라이언트는 서로의 메시지를 받지 못한다.

스케일아웃이 필요해지면 외부 브로커(Redis Pub/Sub)로 교체한다.
브로커가 모든 인스턴스의 구독 정보를 중앙에서 관리하게 된다.

---

## 7. Spring Security와 WebSocket 인증

WebSocket에서 JWT를 어떻게 검증하는가.

### HTTP 핸드셰이크 단계

`/ws/**`는 `application.yml`에서 public path로 설정되어 있다.
핸드셰이크 자체는 인증 없이 허용한다.

```yaml
security:
  common-public-paths:
    - /ws/**
```

### CONNECT 프레임 단계

SockJS 연결 후 클라이언트가 STOMP CONNECT 프레임을 보낼 때 Authorization 헤더를 포함한다.

```javascript
stompClient.connect({ Authorization: 'Bearer ' + token }, callback);
```

Spring Security의 `JwtFilter`가 이 헤더를 읽어 `SecurityContextHolder`에 `Authentication`을 세팅한다.

### @MessageMapping 단계

이후 모든 STOMP 프레임 처리 시 `SecurityContextHolder`가 유효하다.

```java
@MessageMapping("/chat/village")
public void handleMessage(
        @Payload StompSendMessageRequest request,
        Principal principal) {  // STOMP 세션에서 주입된 Principal
    if (!(principal instanceof AuthenticatedUser user) || user.isGuest()) {
        throw new GuestChatNotAllowedException();
    }
    ...
}
```

---

## 8. 지금 당장 테스트하는 법

앱이 떠 있는 상태에서 브라우저 콘솔에 붙여넣으면 된다.

```javascript
// SockJS, StompJS CDN 로드 후 실행
const token = '<여기에 accessToken>';

const socket = new SockJS('http://localhost:8080/ws');
const client = Stomp.over(socket);

client.connect({ Authorization: 'Bearer ' + token }, () => {
  console.log('연결됨');

  // 메시지 구독 (유저 메시지 + NPC 응답 모두 이 채널로 온다)
  client.subscribe('/topic/chat/village', (msg) => {
    console.log('메시지:', JSON.parse(msg.body));
  });

  // 메시지 전송 (STOMP 경로)
  client.send('/app/chat/village', {}, JSON.stringify({ body: '안녕하세요' }));
});
```

또는 REST로 메시지를 보내도 위 구독 콜백이 발동한다 (REST도 broadcast하기 때문).

---

## 9. /queue는 왜 있는가

현재는 쓰이지 않는다. 향후 1:1 전송(개인 알림, 귓속말)을 위해 예약해뒀다.

```text
/topic/chat/village    → 채팅방 참여자 전체 broadcast (1:N)
/queue/notification    → 특정 유저에게만 전송 예정 (1:1)
```

`SimpMessagingTemplate.convertAndSendToUser(userId, "/queue/notification", payload)` 형태로 사용한다.
