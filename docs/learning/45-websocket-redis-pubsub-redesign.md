# 45. Raw WebSocket + Redis Pub/Sub 재설계 — 착수 전 설계서

> 작성 시점: 2026-04-24
> 문서 유형: **설계서 (implementation 착수 전)**. 구현 중 바뀌는 내용은 `46-websocket-redis-pubsub-implementation.md` 에 변경 이력으로 기록한다.
> 관련: [15. WebSocket + STOMP 딥다이브](./15-websocket-stomp-deep-dive.md) · [21. 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md) · [24. STOMP JWT ChannelInterceptor](./24-stomp-websocket-jwt-channel-interceptor.md) · [25. 배치 브로드캐스트 · 멀티유저 attribution](./25-batch-broadcast-multiuser-message-attribution.md) · [43. 부하 테스트 서사](./43-load-test-breaking-point-story.md) · [44. STOMP 외부 Broker 선택](./44-spring-stomp-external-broker-choice.md) · [ADR-007](../architecture/decisions/007-websocket-simple-broker.md)

---

## 0. 왜 이 작업을 하는가 — 세 줄 요약이 필요한 독자용

1. **구조적 병목이 실측됐다.** 부하 테스트 [Sweep 3 (§2.8)](../reports/load-test-2026-04-22.md#28-sweep-3--인프라-증설-후-재측정-2026-04-22-2220-kst) 에서 리소스 (CPU 45%·Heap 44.8%·Threads 123/400) 는 모두 여유인데 `stomp_connect_latency p99 = 12.98s`. Simple Broker 단일 dispatch 쓰레드가 `VU × VU × 2Hz ≈ 80k dispatch/s` 를 처리하는 동안 신규 CONNECT 프레임도 같은 큐 뒤에 밀린다.

2. **인메모리 단일 JVM 은 수평 확장이 원천 불가.** 마을 수가 늘면 한 서버로 수용 불가능한 지점이 반드시 온다.

3. **Spring 공식 레일(`enableStompBrokerRelay` + RabbitMQ) 대신 "자체 설계한 raw WebSocket + Redis Pub/Sub" 로 간다.** [learning/44](./44-spring-stomp-external-broker-choice.md) 는 이 프로젝트에 가장 안전한 선택이 RabbitMQ 임을 논증했지만, 실전에서 검증된 다른 경로(LINE LIVE Akka+Redis, 채널톡 Socket.IO+Redis→NATS)를 직접 설계·구현하는 것이 **구조적 학습 가치** 가 더 크다. 설정 변경으로 끝나는 RabbitMQ 경로는 "Spring 공식 레일 안에서의 최적화" 지, "실시간 시스템을 내 손으로 짜봤다" 는 경험을 주지 않는다.

> learning/44 가 "교과서적 정답 (RabbitMQ)" 을 남긴 것이라면, 이 문서(45) 는 **그 정답 대신 의도적으로 raw WS 경로를 택한 이유와 함정 회피 설계** 를 남긴다. 두 문서는 상호 배타적이지 않다. 프로젝트 진행 중 raw WS 경로가 유지 불가능하다고 판단되면 learning/44 의 RabbitMQ 경로가 **즉시 실행 가능한 대안** 으로 남아있다는 뜻이다.

---

## 1. 채널톡 실패 사례 심층 — 우리가 같은 함정을 밟지 않으려면

채널톡이 "Socket.IO + Redis Pub/Sub (socket.io-redis-adapter) → NATS" 로 이주한 서사가 2편짜리 블로그로 공개되어 있다. 이걸 정독하지 않으면 "Redis Pub/Sub 으로 간다" 는 결정 자체가 위험하다. 핵심 메커니즘을 설계 제약으로 번역해둔다.

### 1.1 socket.io-redis-adapter 의 publish/subscribe 패턴

공식 문서 + 블로그 본문 종합:

- 각 socket.io 서버 인스턴스는 Redis 에 **pattern subscribe** 로 붙는다.
  - 채널 네이밍: `socket.io#/{namespace}#{room}#` (예: `socket.io#/chat#room42#`)
  - `PSUBSCRIBE socket.io#/chat#*` 패턴으로 모든 room 의 메시지를 받는다.
- 서버가 broadcast 할 때는 해당 채널로 `PUBLISH` 한다.
- **핵심 문제**: Redis 내부가 `pubsub_patterns` dict 를 순회하면서 매칭되는 모든 pattern subscriber 에게 메시지를 push 한다.

### 1.2 O(M×N) 증상이 어느 지점에서 터지는가

```text
M = Redis 에 붙은 socket.io 인스턴스 수 (서버 수)
N = 그 인스턴스들이 구독하고 있는 pattern/room 의 총합
```

- 인스턴스 하나가 한 메시지를 발행하면, Redis 는 **M 개 인스턴스 전원에게** 그 메시지를 push 한다.
  - 그 메시지를 받을 구독자가 없는 서버도 "혹시 있을지" 확인하기 위해 메시지를 받아야 한다.
- 각 인스턴스는 자기에게 속한 로컬 구독자를 다시 순회해서 fan-out 한다.
- 즉 "한 번의 publish 당 Redis CPU 부하 = M × (평균 패턴 수 + 평균 구독자 수)" 로 증가.

채널톡은 **파티션 당 Redis 1개 + 소켓 인스턴스 20개+** 환경에서 이 패턴이 터졌다고 기록했다. 메시지 1건 publish 에 Redis 가 최소 20개 인스턴스를 순회하며 메시지 전달 → Redis CPU 피크 43% → 개선 후 33% · 네트워크 110MB → 98% 감소.

### 1.3 NATS 로 이주하면서 해결된 구조적 차이

- NATS 는 **subject 기반 pub/sub** 이고, subject 매칭이 Redis 의 KEYS/pattern 보다 훨씬 효율적이다 (trie 기반).
- 더 중요한 차이: NATS 는 **구독자가 실제로 있는 노드에만** 메시지를 전달한다. Redis Pub/Sub 은 subscriber 가 있든 없든 패턴 매칭되는 모든 인스턴스에 일단 보낸다.
- NATS JetStream 으로 가면 영속·재생도 가능하지만, 채널톡 케이스는 Core NATS (영속 X) 만으로도 Redis Pub/Sub 대비 CPU·네트워크 이득이 나왔다.

### 1.4 이 설계가 흡수해야 할 제약 — 함정 회피 규칙

채널톡 서사에서 추출한 **우리 프로젝트의 설계 제약**:

1. **Pattern Subscribe 금지.** Redis `PSUBSCRIBE` 는 쓰지 않는다. 오직 **exact channel 매칭** 만 사용 (`SUBSCRIBE chat:room:42`).
2. **방 단위 채널을 유지하되, 인스턴스는 "그 서버에 접속자가 있는 방" 만 구독한다.** 모든 서버가 모든 채널을 구독하면 M×N 폭발.
3. **전역 broadcast (예: "전체 공지") 는 Redis Pub/Sub 경로에 태우지 않는다.** 별도 경로 (DB + 푸시 또는 관리자 전용 API).
4. **방당 구독자 수가 수백을 넘는 단계가 보이면 즉시 재설계 검토 지점.** 채널톡이 Redis 에서 NATS 로 간 이유는 여기.
5. **메시지 페이로드에 큰 본문을 싣지 않는다.** Redis Pub/Sub 은 모든 subscriber 에게 본문을 복제한다. 본문은 Cassandra 에 저장하고 **메시지 ID 만** publish 하는 옵션도 검토 대상. (단, 이 프로젝트는 이미 Cassandra 저장과 broadcast 를 분리하고 있어 양쪽 경로가 공존한다. §A 채널 설계에서 본문 크기 상한을 명시.)

### 1.5 LINE LIVE 의 3층 actor + Redis bridge — 우리 버전

LINE LIVE 는 **Akka actor** 로 각 JVM 내부의 fan-out 을 감당하고, Redis Pub/Sub 은 **서버 간 브릿지** 로만 쓴다.

```text
[JVM A]                                 [JVM B]
  UserActor ─┐                        ┌─ UserActor
  UserActor ─┼─▶ ChatRoomActor ──┐    │
  UserActor ─┘   (로컬 fan-out)  │    │
                                 ▼    ▼
                          ┌──────────────────┐
                          │  Redis Pub/Sub   │  ◀── bridge only
                          │  chat:room:42    │
                          └──────────────────┘
                                 ▲    ▲
                                 │    │
                                 └─ ChatRoomActor ─▶ UserActor ...
                                    (로컬 fan-out)
```

핵심: **"로컬 fan-out" 과 "서버 간 동기화" 를 명확히 분리** 한다. Redis 는 후자만 한다.

**우리는 Akka 가 아니다.** 그 자리를 채우는 것은:

- Spring `@Async` + `ThreadPoolTaskExecutor` 로 로컬 fan-out 담당
- Java `ConcurrentHashMap<Long, Set<WebSocketSession>>` 로 `roomId → 로컬 세션 집합` 레지스트리
- Redis Pub/Sub message listener 는 받은 메시지를 **위 레지스트리만 조회해서** 로컬 세션에 `sendMessage` 호출

이 구조의 장점은 **"Redis 와 WebSocket 세션 사이에 직접 매핑이 없다"** 는 점. Redis 는 어떤 클라이언트가 있는지 전혀 모르고, 각 JVM 이 자기 세션만 알고 있다. 덕분에 Redis 부하가 방 수(M)와 서버 수(N) 에만 의존하고, 세션 수(K)에는 의존하지 않는다. O(M×N×K) 가 O(M×N) 으로 내려간다.

---

## 2. 구조 그림 — Before / After

### 2.1 Before (현재 · Simple Broker)

```text
  [Client A] ─WS─┐                              ┌─WS─ [Client B]
                 │                              │
                 ▼                              ▼
             ┌──────────────────────────────────────┐
             │   Spring STOMP (단일 JVM)           │
             │                                      │
             │  /app prefix → @MessageMapping      │
             │  /topic/** → SimpleBrokerMessageHdlr│
             │  (단일 dispatch thread)              │
             │  SubscriptionRegistry (in-memory)    │
             └──────────────────────────────────────┘
```

부하 테스트 §2.7: VU 200 plateau 에서 CONNECT latency p99 = 12.98s. dispatch thread 가 fan-out 큐 drain 에 막혀서 신규 CONNECT 프레임이 뒤로 밀림.

### 2.2 After (목표 · Raw WS + Redis Pub/Sub)

```text
  [Client A] ─WS(JSON)─┐                        ┌─WS(JSON)─ [Client B]
                       │                        │
                       ▼                        ▼
                ┌─────────────────┐      ┌─────────────────┐
                │   JVM 인스턴스 1  │      │   JVM 인스턴스 2  │
                │                 │      │                 │
                │ SessionRegistry │      │ SessionRegistry │
                │ RoomRegistry    │      │ RoomRegistry    │
                │ InboundHandler  │      │ InboundHandler  │
                │ OutboundFanOut  │      │ OutboundFanOut  │
                └────────┬────────┘      └────────┬────────┘
                         │                        │
                         │  publish(chat:room:X)  │
                         └──────┐          ┌──────┘
                                ▼          ▼
                           ┌────────────────────┐
                           │   Redis Pub/Sub    │
                           │  chat:room:{id}    │
                           │  chat:room:{id}:rt │
                           │  chat:npc:queue    │
                           └────────────────────┘
```

- **로컬 fan-out** 은 각 JVM 의 `RoomRegistry` 가 담당 (O(1) 로컬 조회).
- **서버 간 동기화** 만 Redis Pub/Sub 으로. 채널은 **방 단위 exact subscribe** (pattern subscribe 금지 — §1.4).
- 영속은 Cassandra (기존 구조 유지).

---

## 3. 설계 항목별 결정

### A. Redis Pub/Sub 채널 네이밍 규약

#### A.1 방별 1개 채널 vs 글로벌 단일 채널

| | A-1. 방당 1채널 (`chat:room:{id}`) | A-2. 글로벌 1채널 + 필터링 |
|--|----------------------------------|--------------------------|
| 개념 | 방 하나당 Redis 채널 하나. 서버는 자기 JVM 에 접속자가 있는 방만 `SUBSCRIBE`. | `chat:messages` 하나의 채널에 모든 메시지 publish. 서버가 받은 뒤 payload 의 `roomId` 로 필터링. |
| 장점 | Redis 가 구독자가 있는 인스턴스에만 전달. 채널톡의 "publish 1건 = 모든 인스턴스 순회" 함정 회피. | Redis subscribe 커넥션 수가 항상 1. 운영 단순. |
| 단점 | 채널 수가 방 수에 비례 (수천~수만). Redis 서버의 메모리·메타데이터 부담. | **모든 서버가 모든 메시지 수신** → 네트워크 O(M × total msg rate). 채널톡이 맞은 바로 그 함정. |
| 적합 | 방 수 10K 이하 · 서버당 구독하는 방 수가 접속자 있는 방에 한정되는 경우. | 방 수가 매우 적고(<10), 방 간 격리가 불필요한 경우. |

**선택: A-1 (방당 1채널)**

근거:

- §1.4 의 제약 "모든 서버가 모든 채널을 구독하면 M×N 폭발" 을 피하려면 서버가 **접속자가 있는 방만** 구독해야 한다. 그러려면 방 단위로 채널이 분리되어 있어야 한다.
- Redis Pub/Sub 채널은 메모리 상 거의 무료다 (subscriber 없으면 0 cost). 방 수가 늘어도 문제 없음.
- 방당 동시 접속 수백 규모까지는 LINE LIVE 패턴이 검증된 영역.

#### A.2 비영속 이벤트 채널 분리

위치·타이핑처럼 영속 안 하고 휘발성이 강한 메시지는 영속 채팅과 채널을 나눈다.

| 채널 이름 | 용도 | 영속 여부 | 본문 상한 |
|---------|-----|---------|---------|
| `chat:room:{roomId}` | 채팅 메시지 (유저/NPC/시스템) | Cassandra 영속 | 1000자 (기존 `SendMessageUseCase.MAX_BODY_LENGTH`) |
| `room:{roomId}:position` | 좌표 공유 | 휘발 | ~64B (displayId + x + y + userType) |
| `room:{roomId}:typing` | 타이핑 상태 | 휘발 | ~32B (displayId + boolean) |
| `room:{roomId}:presence` | 입/퇴장 알림 | 휘발 | ~32B |
| `chat:npc:reply` | NPC 응답 비동기 전파 | Cassandra 영속 (응답 자체는 메시지) | 1000자 |

**분리 근거:**

1. 채팅과 position 은 트래픽 특성이 다르다. position 은 초당 2~10회/유저, 채팅은 분당 수 회/유저. 한 채널로 묶으면 채팅 메시지가 position 트래픽에 밀릴 수 있다.
2. 향후 rate limit 을 채널별로 다르게 걸어야 한다 (채팅은 초당 2건, position 은 초당 10건 식).
3. subscribe listener 가 메시지 타입을 분기할 필요 없이, 채널 이름만 보고 라우팅 가능 → 코드 단순.

**트레이드오프:**

- 채널 수가 방당 4~5개로 증가. 방 10,000개면 Redis 채널 40,000개. Redis 메타데이터 관점에서는 여전히 무시할 수준이지만, **서버당 subscribe 커넥션 최대치** 를 확인해야 함. Lettuce 의 Pub/Sub connection 은 기본 1개라서, 한 커넥션에 여러 채널 subscribe 가능. 이슈 아님.
- 클라이언트가 "방 하나에 입장" 하려면 4~5개 채널을 동시 구독해야 함 → 우리 프로토콜에선 서버가 1개의 `SUBSCRIBE roomId=42` 명령으로 받아서 내부적으로 4~5개 Redis 채널을 subscribe 하도록 추상화 (§B.3).

#### A.3 NPC 응답 전파

현재 구조에서 NPC 응답은 `@Async` 스레드가 생성 → Cassandra 저장 → `BroadcastChatMessagePort.broadcastNpcReply()` 호출. 이 포트가 Redis publish 로 바뀐다.

```text
[유저 메시지 수신]
  → SendMessageService (sync path)
    → Cassandra 저장 + Redis publish(chat:room:42, userMessage)
  → @Async NpcReplyService (별도 스레드)
    → LLM 호출 → Cassandra 저장 → Redis publish(chat:room:42, npcMessage)
```

NPC 응답 전용 채널을 별도로 두지 않는다. 같은 `chat:room:{id}` 에 publish 하되, payload 의 `senderType` 필드로 구분.

**근거**: 수신 클라이언트 입장에서 "유저 메시지" 와 "NPC 응답" 은 같은 타임라인에 표시된다. 채널을 나누면 클라이언트가 두 채널에서 오는 메시지를 merge 하고 순서를 조정해야 하는데, 한 채널이면 그냥 도착 순서대로 렌더하면 된다. (순서 보장 이슈는 §E 에서 다룸.)

---

### B. 세션·구독 레지스트리 (JVM 내부)

#### B.1 자료구조

```java
// SessionRegistry — sessionId → WebSocketSession 매핑
final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

// RoomRegistry — roomId → sessionId 집합 (로컬 fan-out 용)
final Map<Long, Set<String>> roomToSessions =
    new ConcurrentHashMap<>();
// 값 Set 은 ConcurrentHashMap.newKeySet() 사용 (thread-safe Set)

// Principal 바인딩
final Map<String, AuthenticatedUser> sessionToUser = new ConcurrentHashMap<>();
```

3개 Map 이 모두 `ConcurrentHashMap` 인 이유:

- WebSocket 콜백은 원래 여러 스레드에서 동시 호출될 수 있다.
- `afterConnectionEstablished`, `handleTextMessage`, `afterConnectionClosed` 가 같은 세션에 대해선 순차 호출되지만, **서로 다른 세션끼리는 병렬**.
- Redis 메시지 리스너도 별도 스레드에서 콜백.

#### B.2 세션 종료·타임아웃 시 cleanup

```text
afterConnectionClosed(session, closeStatus):
  userId = sessionToUser.remove(session.id).userId()
  sessions.remove(session.id)
  foreach (roomId, sessionSet) in roomToSessions:
     sessionSet.remove(session.id)
     if sessionSet.isEmpty():
         roomToSessions.remove(roomId)
         redisPubSubContainer.removeMessageListener(roomId)   // 마지막 구독자면 Redis SUBSCRIBE 해제
  presence.broadcastLeave(userId, roomId들)
```

**중요 디테일**: 한 방에 그 서버의 마지막 구독자가 나가면 Redis 채널 구독도 해제한다. 그래야 "접속자 없는 서버에 해당 방 메시지가 계속 들어오는" 채널톡 함정을 회피한다.

#### B.3 Redis → Local fan-out 경로

```text
RedisMessageListener.onMessage(channel="chat:room:42", payload=bytes):
  roomId = 42  (채널 이름 파싱)
  msg = jsonMapper.readValue(payload, ChatBroadcastPayload.class)
  sessionSet = roomToSessions.get(roomId)
  if sessionSet == null: return   // 이 서버엔 구독자 없음 (경주 조건)
  foreach sid in sessionSet:
     ws = sessions.get(sid)
     if ws == null || !ws.isOpen(): continue
     ws.sendMessage(new TextMessage(payload))    // bytes 그대로 재사용 가능
```

최적화 포인트:

- Redis 가 보낸 JSON payload 를 **파싱 없이 그대로 WebSocket 으로 포워딩** 하면 직렬화 비용 0. 다만 클라이언트와 Redis payload 형식이 1:1 이어야 함 → §C 프로토콜에서 이걸 전제로 설계.
- `ws.sendMessage` 는 동기 호출. 한 메시지가 수백 세션에 fan-out 되면 Redis listener 스레드가 오래 블로킹될 수 있음. → Spring `TaskExecutor` 에 submit 하는 비동기 fan-out 고려. 초기엔 동기로 시작하고 프로파일링 후 분기.

---

### C. JSON 메시지 프로토콜 스펙

#### C.1 클라이언트 → 서버

```json
// SUBSCRIBE
{"type": "SUBSCRIBE", "roomId": 42}

// UNSUBSCRIBE
{"type": "UNSUBSCRIBE", "roomId": 42}

// PUBLISH (채팅 메시지 전송)
{"type": "PUBLISH", "roomId": 42, "body": "안녕하세요"}

// POSITION (좌표 공유)
{"type": "POSITION", "roomId": 42, "x": 1200.5, "y": 800.0}

// TYPING
{"type": "TYPING", "roomId": 42, "typing": true}

// PING (heartbeat)
{"type": "PING"}
```

#### C.2 서버 → 클라이언트

```json
// MESSAGE (채팅 브로드캐스트 — 유저·NPC·시스템 모두 같은 형식)
{
  "type": "MESSAGE",
  "roomId": 42,
  "message": {
    "id": "01HZX...",
    "senderId": 101,             // NPC 는 null
    "senderType": "USER",        // USER | NPC | SYSTEM
    "body": "안녕하세요",
    "createdAt": "2026-04-23T10:30:00Z"
  }
}

// PRESENCE (입/퇴장)
{"type": "PRESENCE", "roomId": 42, "event": "JOIN", "displayId": "guest-abcd12", "userType": "GUEST"}
{"type": "PRESENCE", "roomId": 42, "event": "LEAVE", "displayId": "guest-abcd12"}

// POSITION_UPDATE
{"type": "POSITION_UPDATE", "roomId": 42, "displayId": "user-101", "userType": "MEMBER", "x": 1200.5, "y": 800.0}

// TYPING_UPDATE
{"type": "TYPING_UPDATE", "roomId": 42, "displayId": "user-101", "typing": true}

// ERROR
{"type": "ERROR", "code": "COMM_003", "message": "게스트는 채팅 기능을 사용할 수 없습니다"}

// PONG
{"type": "PONG"}
```

#### C.3 기존 STOMP destination 매핑표

| 기존 STOMP | 새 프로토콜 | 비고 |
|-----------|-----------|------|
| `SEND /app/chat/village` | `{"type":"PUBLISH","roomId":42,"body":"..."}` | roomId 는 현재 `village.public-chat-room-id` 에 매핑 |
| `SUBSCRIBE /topic/chat/village` | `{"type":"SUBSCRIBE","roomId":42}` | MESSAGE 도 여기로 수신 |
| `SEND /app/village/position` | `{"type":"POSITION","roomId":42,"x":..,"y":..}` | |
| `SUBSCRIBE /topic/village/positions` | 위 SUBSCRIBE 에 포함 | 채널 분리는 서버 내부만. 클라이언트는 방 단위로만 구독 |
| `SEND /app/village/typing` | `{"type":"TYPING","roomId":42,"typing":true}` | |
| `SUBSCRIBE /topic/village/typing` | 위 SUBSCRIBE 에 포함 | 동상 |
| STOMP ERROR 프레임 | `{"type":"ERROR","code":"...","message":"..."}` | `CommunicationErrorCode` 재사용 |

**결정**: 클라이언트는 "방" 단위로만 SUBSCRIBE. 서버가 내부적으로 chat/position/typing/presence 4개 Redis 채널을 동시에 구독하고, 한 WebSocket 세션으로 4종 메시지를 모두 흘려보낸다. 클라이언트가 채널 개수를 알 필요 없음.

**근거**: STOMP 에선 topic destination 이 클라이언트 입장에서 구독 단위였지만, raw WS 에선 우리가 프로토콜을 직접 설계하므로 **클라이언트 인지 부하를 줄이는 쪽** 으로 추상화한다. 서버 측 채널 분리는 운영/모니터링 필요상 유지.

---

### D. 인증·세션 수립

#### D.1 핸드셰이크 시 JWT 검증

```text
[HTTP GET /ws?access_token=eyJ...]
  HandshakeInterceptor.beforeHandshake:
    token = request.queryParam("access_token")
    AuthenticatedUser user = parseTokenPort.parse(token)
        .orElseThrow(AuthException)
    attributes.put("user", user)
    return true   // 핸드셰이크 허용
  ↓
101 Switching Protocols
  ↓
WebSocketHandler.afterConnectionEstablished(session):
    user = (AuthenticatedUser) session.attributes.get("user")
    sessionToUser.put(session.id, user)
    session.setPrincipal(user)   // Principal 바인딩
```

**왜 쿼리 파라미터인가 — SockJS 와 비교**:

[learning/24](./24-stomp-websocket-jwt-channel-interceptor.md) 에서 "SockJS 는 HTTP 핸드셰이크에 커스텀 헤더를 넣을 수 없다" 는 이유로 STOMP CONNECT 프레임에서 JWT 를 받았다. **이번엔 SockJS 를 버린다.** raw WebSocket API (`new WebSocket(url)`) 는 브라우저 표준상 **어차피 커스텀 HTTP 헤더를 지정할 수 없다**. 쿼리 파라미터가 사실상 유일한 선택.

**쿼리 파라미터 토큰의 보안 리스크와 대응**:

| 리스크 | 대응 |
|-----|-----|
| access log 에 토큰 기록 | nginx/ALB `log_format` 에서 query string 을 마스킹. Spring `CommonsRequestLoggingFilter` 로그에도 mask. |
| Referer 헤더 유출 | WebSocket 핸드셰이크엔 Referer 안 붙음 (브라우저 표준). |
| browser history | WebSocket URL 은 history 에 안 남음. |
| 토큰 짧은 수명 | JWT access token 은 1h. 충분히 짧음 (load test 에서 1h 넘으면 만료되는 걸 이미 확인 — §[load-test §2.4](../reports/load-test-2026-04-22.md#24-근본-원인-분석--jwt-만료--토큰-풀-재사용)). |
| 쿠키 옵션? | `HttpOnly` + `SameSite=Strict` 쿠키로 대체 가능하나, 서브도메인 설정 필요 + 크로스 오리진 시 복잡. 일단 query param 으로 시작하고 쿠키 전환은 향후 검토. |

**대안 고려됨**: "일단 연결 허용 → 첫 메시지로 `{"type":"AUTH","token":"..."}` 수신 → 그 전까진 모든 요청 거부" 패턴. 장점: URL 에 토큰 안 들어감. 단점: 인증 안 된 WS 연결이 리소스를 잠깐 점유 — 연결 폭탄 공격 취약. **핸드셰이크 인증이 더 안전해서 선택.**

#### D.2 게스트 정책 유지

[wiki/identity/guest-policy.md](../wiki/identity/guest-policy.md) 의 정책은 그대로:

- 게스트도 `/api/v1/auth/guest` 에서 게스트 JWT 를 받아 핸드셰이크 시 제출
- 구독(SUBSCRIBE)·position·presence 는 게스트도 가능
- PUBLISH 는 `AuthenticatedUser.isGuest() == true` 면 `ERROR COMM_003` 응답 후 해당 메시지 drop (세션은 유지)

```java
void handlePublish(WebSocketSession session, PublishCommand cmd) {
    AuthenticatedUser user = sessionToUser.get(session.id);
    if (user == null || user.isGuest()) {
        sendError(session, CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED);
        return;   // 세션은 유지. 게스트가 계속 구경할 수 있게
    }
    ...
}
```

#### D.3 Principal 바인딩

`WebSocketSession.setPrincipal()` 은 Spring 공식 API 에 없다. 대신 세션 attributes 와 `sessionToUser` 맵 둘 다에 보관.

- `session.getAttributes().get("user")` 는 Spring Session 직렬화에 포함됨 (향후 Spring Session 도입 시)
- `sessionToUser` 맵은 O(1) 조회용

---

### E. Reconnect · Heartbeat · ACK

#### E.1 Heartbeat 전략

WebSocket 자체 `Ping/Pong` 프레임을 쓸 수도, JSON 레벨 `PING/PONG` 을 쓸 수도 있다.

**선택: JSON 레벨 + WebSocket Ping 둘 다**

| 방식 | 역할 |
|-----|-----|
| 브라우저 → 서버 WebSocket Ping 프레임 | 브라우저는 직접 Ping 프레임을 보낼 수 없음 (JS API 한계) → 쓸 수 없음 |
| 서버 → 브라우저 WebSocket Ping 프레임 | Spring `ConcurrentWebSocketSessionDecorator` 에 interval ping 설정 가능 → idle 세션 감지 |
| 브라우저 → 서버 JSON `{"type":"PING"}` | 브라우저가 30초마다 전송. 서버는 `PONG` 응답. idle 서버 timeout 방지 (프록시·CF 가 60초 idle 시 끊음) |

**구체적 설정:**

- 클라이언트: 30초마다 JSON PING
- 서버: PING 수신 시 즉시 PONG 응답. 60초간 PING 없으면 세션 close
- 서버: 45초마다 WebSocket Ping 프레임 발송 (CF idle timeout 100초 대응)

#### E.2 재연결 시 누락 메시지 처리

현재 구조에서 "서버 A 에서 broadcast 된 메시지를 클라이언트가 막 끊긴 순간에 놓치는" 시나리오:

```text
T+0:  Client C 가 방 42 SUBSCRIBE 상태
T+1:  Client C 네트워크 끊김 (아직 서버는 모름)
T+2:  User U 가 "안녕" publish → Redis → 서버 A → C 의 WS 에 write 시도 → 실패
T+3:  Client C 재연결 → 방 42 SUBSCRIBE
T+4:  "안녕" 메시지는 이미 지나갔음
```

해결 경로:

1. **Cassandra 영속 재조회** — Client 가 재연결 후 SUBSCRIBE 할 때 `lastSeenMessageId` 를 동봉. 서버는 Cassandra 에서 그 이후 메시지를 조회해서 먼저 MESSAGE 프레임으로 밀어준 뒤, 이후는 라이브 스트림.
2. **Redis 는 영속 없음** — 재연결 직전 1~2초짜리 메시지도 Redis Pub/Sub 엔 없다. 오직 Cassandra 에서만 복구.
3. **비영속 이벤트 (position·typing·presence) 는 재전송 안 함** — 의미가 없다. position 은 다음 업데이트(~500ms) 에 새 값이 오고, typing 은 휘발.

SUBSCRIBE 프로토콜:

```json
{"type": "SUBSCRIBE", "roomId": 42, "lastSeenMessageId": "01HZX..."}
```

서버 처리:

```java
void handleSubscribe(SubscribeCommand cmd) {
    addToRoomRegistry(cmd.roomId, session);
    subscribeRedisChannelIfNeeded(cmd.roomId);
    if (cmd.lastSeenMessageId != null) {
        List<Message> missed = loadMessageHistoryPort
            .loadAfter(cmd.roomId, cmd.lastSeenMessageId, MAX_REPLAY);
        missed.forEach(m -> sendJson(session, toMessage(m)));
    }
}
```

**트레이드오프**: SUBSCRIBE 응답 레이턴시가 약간 증가 (Cassandra 쿼리 1회). 그러나 빈번한 SUBSCRIBE 가 아니므로 영향 작음. 기존 [21. 마을 공개 채팅 아키텍처 §3. REST + WebSocket 이중 채널](./21-village-public-chat-architecture.md) 의 "REST 히스토리 + WS 실시간" 모델이 유지된다. 다만 "재연결 시 누락" 이라는 별도 케이스는 이번에 서버 사이드로 흡수하는 것이 차이.

#### E.3 ACK 정책

- **서버 → 클라이언트 MESSAGE 는 ACK 없음.** 각 메시지는 Cassandra 에 영속. 놓쳐도 `lastSeenMessageId` 로 복구.
- **클라이언트 → 서버 PUBLISH 는 ACK 있음.** Redis publish 성공 여부는 클라이언트가 알아야 한다 (재시도/에러 표시).
  - 동일 세션에 `{"type":"PUBLISH_ACK","tempId":"...","messageId":"01HZX..."}` 로 응답
  - 클라이언트는 `tempId` 로 optimistic UI 업데이트 후 ACK 수신하면 실제 id 로 교체

```json
// Client
{"type":"PUBLISH","roomId":42,"body":"hi","tempId":"cli-1"}
// Server (성공)
{"type":"PUBLISH_ACK","tempId":"cli-1","messageId":"01HZX..."}
// Server (실패)
{"type":"ERROR","code":"COMM_001","message":"...","tempId":"cli-1"}
```

---

### F. 헥사고날 레이어 매핑

#### F.1 기존 구조 (STOMP)

```text
adapter/in/websocket/
  ChatMessageHandler.java          (@MessageMapping /chat/village)
  StompSendMessageRequest.java
  PositionHandler.java
  TypingHandler.java
  PositionDisconnectListener.java  (@EventListener SessionDisconnect)
  PresenceNotifier.java            (@EventListener SessionConnect/Disconnect)

adapter/out/messaging/
  WebSocketBroadcastAdapter.java   (SimpMessagingTemplate 기반)

application/port/out/
  BroadcastChatMessagePort.java    (broadcastNpcReply)

global/config/
  WebSocketConfig.java             (@EnableWebSocketMessageBroker + SimpleBroker)
  StompAuthChannelInterceptor.java (CONNECT 프레임 JWT 검증)
```

#### F.2 새 구조

```text
global/websocket/                            (재사용 가능한 WS 인프라)
  RawWebSocketConfig.java                    (@EnableWebSocket + registerHandlers)
  JwtHandshakeInterceptor.java               (HTTP 핸드셰이크 JWT)
  WebSocketSessionRegistry.java              (sessionId → session + user)
  RoomSubscriptionRegistry.java              (roomId → Set<sessionId>)
  WebSocketMessageRouter.java                (텍스트 프레임 → 타입별 Handler 디스패치)

communication/adapter/in/websocket/
  VillageChatWebSocketHandler.java           (TextWebSocketHandler 구현, 채팅 파트)
  ChatInboundCommand.java                    (sealed: Subscribe / Unsubscribe / Publish)
  ChatOutboundPayload.java                   (MessageResponse 랩핑)

communication/adapter/out/messaging/
  RedisChatBroadcastAdapter.java             (BroadcastChatMessagePort 구현. Redis publish)
  RedisChatSubscribeAdapter.java             (Redis MessageListener. 받아서 RoomSubscriptionRegistry 에 fan-out)

communication/application/port/out/
  BroadcastChatMessagePort.java              (기존 유지 — 시그니처 변경 없음)

village/adapter/in/websocket/
  PositionWebSocketHandler.java              (Position/Typing inbound)
  PositionBroadcast.java                     (기존 유지)
  PresencePublisher.java                     (Connect/Disconnect 이벤트 → Redis publish)

village/adapter/out/messaging/
  RedisPositionBroadcastAdapter.java         (BroadcastPositionPort 구현)
  RedisTypingBroadcastAdapter.java
```

**포트 신설 또는 유지:**

| 포트 | 기존/신설 | 비고 |
|-----|---------|-----|
| `BroadcastChatMessagePort` | 기존 유지 | 시그니처 변경 없음. 구현체만 WebSocketBroadcastAdapter → RedisChatBroadcastAdapter |
| `BroadcastPositionPort` | 신설 | Village 에서 새로 정의. 현재는 PositionHandler 가 SimpMessagingTemplate 직접 호출이라 포트가 없음 |
| `BroadcastTypingPort` | 신설 | 동상 |
| `BroadcastPresencePort` | 신설 | 동상 |

**Escape hatch**: 모든 outbound Port 는 Redis Pub/Sub / NATS / RabbitMQ 어느 것으로도 교체 가능하도록 설계. 구현체 `RedisChatBroadcastAdapter` 는 "Redis 로 publish" 라는 한 가지 책임만 가진다. 프로토콜 직렬화는 Port 가 아니라 Adapter 내부 책임.

#### F.3 UseCase 재사용

- `SendMessageUseCase` **변경 없음.** Command / Result 그대로. REST와 WebSocket 두 경로가 동일한 UseCase 를 호출한다는 기존 합의 유지 ([learning/15 §5.3](./15-websocket-stomp-deep-dive.md)).
- `LoadChatHistoryUseCase` **변경 없음.** 재연결 replay (§E.2) 에서 재사용.
- Outbound Port 시그니처 보존 → 도메인·어플리케이션 계층 영향 **0**.

#### F.4 헥사고날 원칙 검토

- **Domain Entity 에 인프라 의존 없음**: `Message`, `Participant` 는 Redis 를 모른다. ✓
- **도메인 간 직접 참조 금지**: Village 의 `PositionWebSocketHandler` 가 Communication 의 `Message` 를 import 하지 않음. Village 는 자기 도메인 안에서 Position broadcast. ✓
- **포트 뒤에 어댑터**: 모든 Redis 접근이 `Broadcast*Port` 뒤에. ✓

---

### G. O(M×N) 함정 회피 체크리스트

§1 분석을 프로젝트 제약으로 번역한 최종 리스트. 이 항목들은 구현 중 PR 셀프 체크에 포함해야 한다.

| # | 제약 | 위반하면 생기는 문제 |
|---|-----|------------------|
| G-1 | Redis `PSUBSCRIBE` 사용 금지 (`SUBSCRIBE` 만) | 패턴 매칭 O(N) 순회. 채널톡 케이스 |
| G-2 | 서버는 "로컬에 접속자 있는 방" 만 Redis 채널 구독 | 서버당 채널 수가 방 수에 비례 → M×N 폭발 |
| G-3 | 마지막 로컬 구독자 나가면 Redis 채널 unsubscribe | G-2 와 같은 이유. session cleanup 시 반드시 |
| G-4 | 전역 broadcast (전체 유저 공지) 는 Redis Pub/Sub 경로 금지 | 모든 서버가 수신. 별도 API + Outbox + FCM 경로 |
| G-5 | 한 Redis 메시지 페이로드는 ≤ 4KB 목표, 10KB hard limit | 본문 복제가 모든 subscriber 에. 네트워크 폭증 |
| G-6 | 방당 동시 접속 모니터링. 500 초과 지속 시 경보 | 방 하나의 fan-out 이 단일 JVM 처리 한계 초과 시점 |
| G-7 | Position broadcast 는 서버 측에서 throttle (≥200ms 간격) | 초당 100건 × 200명 = 20,000건/s. Redis·네트워크 폭발 |
| G-8 | Redis Pub/Sub 채널에 메시지 넣기 전 본문 길이 체크 | `SendMessageUseCase.MAX_BODY_LENGTH` 를 어댑터에서도 assert |
| G-9 | subscribe listener 콜백은 블로킹 연산 금지 (DB·외부 API) | 한 스레드가 막히면 해당 Redis 커넥션의 다음 메시지도 지연 |
| G-10 | 초기 배포는 단일 인스턴스로 운영 → 멀티 인스턴스 확장 시 Chaos/Fault 테스트 | Redis 다운 시 폴백 전략 부재 시 서비스 전면 중단 |

---

### H. 기존 기능 회귀 방지 매핑

| 기능 | 현재 구현 | 새 구조에서의 동작 | 리스크 | 검증 방법 |
|-----|---------|------------------|------|---------|
| 마을 공개 채팅 broadcast | `ChatMessageHandler` + `SimpMessagingTemplate` | `VillageChatWebSocketHandler.handlePublish` → Cassandra 저장 → `RedisChatBroadcastAdapter.broadcast` → Redis channel `chat:room:42` → 모든 서버의 `RedisChatSubscribeAdapter` → 로컬 세션 fan-out | payload 형식 불일치로 클라이언트 파싱 실패 | Cucumber `npc_chat.feature` + 프론트 수동 |
| NPC 응답 비동기 전파 ([learning/25](./25-batch-broadcast-multiuser-message-attribution.md)) | `@Async` NPC 생성 → `BroadcastChatMessagePort.broadcastNpcReply` | 동일. Port 시그니처 유지. Adapter 만 교체 | 비동기 스레드에서 Redis connection 누수 | 통합 테스트 + 프로덕션 connection pool 모니터링 |
| 게스트 정책 ([wiki/identity/guest-policy.md](../wiki/identity/guest-policy.md)) | `ChatMessageHandler` 에서 `user.isGuest()` 체크 | `VillageChatWebSocketHandler.handlePublish` 에서 동일 체크. PUBLISH 거부, SUBSCRIBE 허용 | 게스트가 PUBLISH 가능해지는 regression | Cucumber `guest_policy.feature` + 새 테스트 |
| 멀티유저 메시지 attribution ([learning/25](./25-batch-broadcast-multiuser-message-attribution.md)) | `MessageResponse.fromUser(msg, userId)` 에 senderId 포함 | MESSAGE payload 에 `senderId` 유지. 클라이언트 판별 로직 변경 없음 | senderId 누락 | unit test + 프론트 E2E |
| JWT 인증 ([learning/24](./24-stomp-websocket-jwt-channel-interceptor.md)) | `StompAuthChannelInterceptor` (CONNECT 프레임) | `JwtHandshakeInterceptor` (HTTP 핸드셰이크) | 토큰 만료 타이밍 달라짐 (handshake 1회 vs CONNECT 1회 — 사실상 동일) | k6 로드 테스트 재측정 |
| 마을 위치 공유 | `PositionHandler` | `PositionWebSocketHandler.handlePosition` → Redis channel `room:42:position` → 동일 fan-out | position throttle 누락 시 부하 증가 | k6 Sweep 3 동일 프로파일 재측정 |
| Typing 상태 | `TypingHandler` | `PositionWebSocketHandler` (같은 핸들러에 병합 or 별도) | 없음 (단순 치환) | 프론트 수동 |
| Presence (입/퇴장) | `PresenceNotifier` (`@EventListener SessionConnectedEvent`) | `VillageChatWebSocketHandler.afterConnectionEstablished/Closed` 에서 직접 Redis publish | 세션 이벤트 API 가 달라서 누락 가능성 | 단위 테스트로 개별 검증 |
| 재연결 누락 메시지 | 없음 (클라이언트가 REST `/history` 호출) | `SUBSCRIBE` 에 `lastSeenMessageId` 포함 → 서버가 Cassandra 재조회 후 MESSAGE 프레임 리플레이 | 과도한 replay 시 Cassandra 부하 | MAX_REPLAY 상한 + 테스트 |

---

### I. 통합 테스트 전략

#### I.1 기존 Cucumber 시나리오 변환

현재 `npc_chat.feature` 는 HTTP POST `/api/v1/chat/messages` 기반이라 **STOMP 에 의존하지 않는다**. 그대로 유지 가능.

STOMP 직접 테스트하는 시나리오는 현재 없음 (load test 의 k6 는 통합 테스트 아님). 새로 추가할 것:

```gherkin
# features/communication/websocket_chat.feature
Feature: 마을 공개 채팅 — raw WebSocket

  Scenario: 회원은 WebSocket 으로 SUBSCRIBE 후 자기 메시지를 다시 수신한다
    Given 회원 "ws_user@test.com" 로 로그인한다
    When WebSocket 으로 /ws?access_token={token} 에 연결한다
    And {"type":"SUBSCRIBE","roomId":1} 을 전송한다
    And {"type":"PUBLISH","roomId":1,"body":"안녕","tempId":"t1"} 을 전송한다
    Then PUBLISH_ACK tempId="t1" 를 수신한다
    And MESSAGE senderType="USER" body="안녕" 를 수신한다

  Scenario: 게스트는 SUBSCRIBE 는 되지만 PUBLISH 는 거부당한다
    Given 게스트 토큰을 발급받는다
    When WebSocket 으로 연결 후 SUBSCRIBE roomId=1
    And PUBLISH roomId=1 body="hi"
    Then ERROR code="COMM_003" 을 수신한다
    And 세션은 OPEN 상태를 유지한다
```

#### I.2 Redis Testcontainer setup

```java
@Container
static final GenericContainer<?> redis = new GenericContainer<>(
    DockerImageName.parse("redis:7-alpine"))
    .withExposedPorts(6379);

@DynamicPropertySource
static void overrideProps(DynamicPropertyRegistry r) {
    r.add("spring.data.redis.host", redis::getHost);
    r.add("spring.data.redis.port", redis::getFirstMappedPort);
}
```

Spring Data Redis 가 이미 의존성에 있는지 확인 필요. 현재 `spring-boot-starter-data-redis` 가 없다면 추가.

#### I.3 멀티 인스턴스 통합 테스트

단일 인스턴스 테스트는 로컬 fan-out 만 검증한다. 실제 목표(다중 JVM 간 Redis 경유 fan-out) 를 검증하려면:

```java
@Test
void 두_인스턴스_간_메시지가_전파된다() {
    // given
    ServerInstance inst1 = startInstance(redisPort);
    ServerInstance inst2 = startInstance(redisPort);
    WebSocketClient c1 = connect(inst1, tokenA);
    WebSocketClient c2 = connect(inst2, tokenB);
    c1.send(subscribe(roomId=1));
    c2.send(subscribe(roomId=1));

    // when
    c1.send(publish(roomId=1, body="hi"));

    // then
    assertThat(c2.waitForMessage()).containsBody("hi");
}
```

이건 Cucumber 가 아닌 JUnit + Testcontainers 로 쓴다. Cucumber 의 "1서버 1DB" 전제를 벗어나기 때문.

#### I.4 로드 재측정 계획

Sweep 3 과 동일한 k6 시나리오를 raw WS 프로토콜로 포팅. 예상 변화:

| 지표 | Sweep 3 (STOMP Simple Broker) | 목표 (raw WS + Redis, 1 인스턴스) | 목표 (2 인스턴스) |
|-----|-------------------------------|----------------------------------|------------------|
| `stomp_connect_latency p99` | 12.98s | < 500ms | < 500ms |
| checks 성공률 | 99.93% | > 99.9% | > 99.9% |
| CPU / Heap / Threads | 여유 | 여유 | 각 인스턴스 ~절반 |
| Redis CPU | - | < 30% | < 30% |
| Fan-out rate | 80k disp/s (내부) | 80k 로컬 + Redis 8k publish/s | 각 40k 로컬 + Redis 8k |

k6 시나리오는 STOMP 프레임 수동 조립 대신 JSON 프레임 전송으로 재작성. `loadtest/village-mixed-raw.js`.

---

### J. 단계별 이주 순서

#### J.1 옵션 비교

| | J-1. 한 번에 스위칭 (hard cutover) | J-2. 듀얼 운영 후 스위칭 (blue/green) |
|--|----------------------------------|--------------------------------------|
| 개념 | PR 한 번에 STOMP 제거 + raw WS 추가. `/ws` 엔드포인트 자체를 교체 | `/ws` 는 STOMP 유지, `/ws/v2` 에 raw WS 추가. 프론트가 feature flag 로 전환. 안정되면 `/ws` 제거 |
| 장점 | 구조 단순. 코드 중복 없음. 리뷰 포인트 집중 | rollback 쉬움. 프로덕션에서 점진 검증 가능 |
| 단점 | 프로덕션 배포 시 다운타임 위험. 버그 1개만 나와도 채팅 전면 중단 | 코드 두 벌 유지. 프론트 분기 필요. 일정 길어짐 |
| 이 프로젝트 맥락 | MVP 단계. 실유저 < 10명. 다운타임 수용 가능. | 오버엔지니어링 |

**선택: J-1 (hard cutover)**

근거:

- 현재 실유저 수가 한 자릿수라 다운타임 영향 미미 (`reference_aws_deployment.md` · MVP 피드백 단계)
- 듀얼 운영은 코드 중복과 테스트 부담 2배. 학습 중심 프로젝트에서 감당할 이유 없음
- rollback 이 필요하면 Git revert 로 충분. 인프라 (Redis 컨테이너) 는 그대로 유지

#### J.2 실행 순서

```text
Step 1. Redis 인프라 준비
  ├─ docker-compose 에 redis 서비스 확인 (이미 있음)
  ├─ application.yml 에 spring.data.redis.* 확인
  └─ Lettuce connection pool 튜닝 (pub/sub 전용 1~2 connection + 커맨드용 pool)

Step 2. 새 WS 인프라 레이어 구축 (PR 1)
  ├─ global/websocket/ 패키지 생성
  ├─ RawWebSocketConfig + JwtHandshakeInterceptor + Registry 2종
  ├─ 단위 테스트 (세션 등록·제거·방 구독)
  └─ 이 단계는 도메인 영향 0. 기존 STOMP 는 그대로 운영

Step 3. Redis Pub/Sub 어댑터 (PR 2)
  ├─ RedisChatBroadcastAdapter + RedisChatSubscribeAdapter
  ├─ BroadcastChatMessagePort 구현체 교체 (@Primary / @Profile 전환)
  ├─ 통합 테스트 (Testcontainers Redis)
  └─ 이 단계도 STOMP 는 유지. Redis 쪽은 아직 비활성 (아무도 publish 안 함)

Step 4. 새 WS 엔드포인트 (PR 3)
  ├─ VillageChatWebSocketHandler / PositionWebSocketHandler / presence 로직
  ├─ /ws/v2 에 노출 (임시. 마지막 단계에서 /ws 로 리네이밍)
  ├─ Cucumber + 멀티 인스턴스 JUnit 테스트
  └─ STOMP /ws 와 새 /ws/v2 가 공존

Step 5. 프론트 이주 (PR 4)
  ├─ @stomp/stompjs 제거. 순수 WebSocket + 경량 프로토콜 래퍼
  ├─ useStomp → useVillageSocket 리네이밍
  ├─ lastSeenMessageId 재연결 로직 추가
  └─ 프론트 수동 테스트

Step 6. STOMP 제거 + 엔드포인트 리네이밍 (PR 5)
  ├─ /ws/v2 → /ws. 구 /ws (STOMP) 삭제
  ├─ WebSocketConfig / StompAuthChannelInterceptor / ChatMessageHandler (구) / PositionHandler (구) 삭제
  ├─ 의존성 spring-boot-starter-websocket 은 유지, spring-messaging 의 STOMP 지원은 제거 검토
  └─ ADR-007 Superseded 처리 + 새 ADR 추가

Step 7. 부하 재측정 + 블로그
  ├─ k6 raw WS 시나리오
  ├─ Sweep 3 재실행 (동일 프로파일)
  ├─ 멀티 인스턴스 확장 테스트 (2 EC2)
  └─ 46번 learning 에 "실측 결과 + 실제로 부딪친 문제" 작성
```

**PR 분할 원칙**: 각 PR 은 기존 기능 깨지지 않는 상태로 독립 배포 가능. Step 6 PR 만 사용자 영향 있음.

---

## 4. ADR 처리 방침 (TBD)

[ADR-007](../architecture/decisions/007-websocket-simple-broker.md) 는 "Redis Pub/Sub 기반 외부 브로커로 교체" 라는 문구를 가지고 있는데, [learning/44 §5](./44-spring-stomp-external-broker-choice.md#5-rabbitmq--rabbitmq_stomp-가-표준이-되는-이유) 에서 지적했듯 `enableStompBrokerRelay()` 에 Redis 를 직결할 수 없다. 이번 설계는 STOMP 자체를 걷어내는 방향이라 ADR-007 의 전제가 더 이상 유효하지 않다.

**처리 방침:**

1. 이 노트(45)에서는 ADR 본문을 고치지 않는다. 설계서일 뿐 아직 구현 안 됨.
2. Step 6 PR (STOMP 제거) 에서 ADR-007 을 Superseded 처리하고 새 ADR (`ADR-009 — Raw WebSocket + Redis Pub/Sub` 형식) 을 추가한다.
3. learning/44 도 교차 참조 갱신 (아래 §"더 공부할 거리" 참고).

---

## 5. 실전에서 주의할 점 (구현 중 미리 눈여겨 볼 것)

- **Spring Data Redis 의 `RedisMessageListenerContainer` 는 thread pool 을 쓴다.** 기본 1 thread 이면 메시지 처리가 직렬화됨. `setTaskExecutor` 로 커스텀 executor 주입. fan-out 콜백이 블로킹되면 전체 지연.
- **Lettuce 는 단일 connection 에서 여러 channel subscribe 가능.** connection pool 에 pub connection + sub connection 을 **분리** 해야 함. (Jedis 도 동일.)
- **WebSocketSession.sendMessage 는 thread-safe 가 보장되지 않는다.** 같은 세션에 여러 스레드가 동시에 쓰면 프레임이 깨진다. `ConcurrentWebSocketSessionDecorator` 로 감싸거나 세션별 lock.
- **재연결 폭풍 (reconnect storm)**: 서버 재시작하면 모든 클라이언트가 동시에 재연결 시도. 클라이언트 측에 **exponential backoff + jitter** 필수.
- **Cloudflare WebSocket idle 타임아웃 100초.** §E.1 의 heartbeat 설정이 이 값보다 짧아야 함.
- **JSON 파싱 비용.** 현재 Jackson 기본 설정이면 PUBLISH 1건당 ~50μs. 초당 10k 메시지면 500ms/s CPU — 무시 못 할 수준. `afterburner` 모듈 또는 바이트 그대로 포워딩 (§B.3) 고려.
- **프론트 @stomp/stompjs 걷어낼 때 번들 사이즈 이득**: 약 20KB gzipped. 작지만 의미 있음.

---

## 6. 나중에 돌아보면

### 이 선택이 틀렸다고 느낄 시점

- **Redis Pub/Sub 네트워크 트래픽이 Redis 인스턴스 한계 근처** (보통 10Gbps NIC 기준 초당 수백만 메시지). 채널톡이 맞은 지점.
  - 대응: NATS JetStream 또는 Redis 샤딩 (채널톡 2편이 다룬 방향).
- **방 수가 10만 이상**: Redis 채널 메타데이터 부담 + 서버별 subscribe 개수 관리 복잡.
  - 대응: 방 단위 채널 → 파티션 단위 채널로 변경 (해시 기반). 하지만 payload 안에서 필터링 비용.
- **재연결 시 replay 쿼리가 Cassandra 에 몰려서 읽기 부하 급등**.
  - 대응: Redis Streams 로 최근 N 건 캐싱하거나, replay 자체를 클라이언트가 REST 로 해결.

### 스케일이 바뀌면 어떤 선택지가 더 나은가

| 스케일 | 추천 |
|-------|-----|
| 현재 (실유저 < 10) | 이 설계 (raw WS + Redis Pub/Sub) · 단일 인스턴스로도 충분 |
| 방당 접속 수십 / 서버 1~3대 | 동일. 최적 |
| 방당 접속 수백 / 서버 5~10대 | Redis 샤딩 검토. 또는 learning/44 의 RabbitMQ 전환 (성능이 아니라 운영 안정성 목적) |
| 방당 접속 수천 / 서버 수십대 | NATS 또는 자체 라우터 (LINE LIVE actor 패턴 · Slack Channel Server 패턴) |
| 초대규모 (Discord 스케일) | 전용 스택 (Erlang/Elixir + 자체 프로토콜) |

### 이 설계의 "학습 가치" 를 최대화하려면

구현 중 아래 포인트를 46번 노트에 반드시 기록:

1. "설계서와 실제 구현이 달라진 지점" — 특히 §B, §E.2 는 실전에서 항상 변한다
2. "Redis CPU 가 실제로 얼마나 올랐는가" — 채널톡 서사와 우리 수치 비교
3. "멀티 인스턴스에서 처음 만난 버그" — 세션 cleanup race, 메시지 순서, connection pool 고갈 등 교과서에서 못 배우는 것들
4. "k6 스크립트 포팅 과정의 함정" — STOMP 프레임 조립 대신 JSON 으로 바꿀 때의 차이

---

## 7. 더 공부할 거리

### 직접 관련 (이 프로젝트)

- [learning/15 — WebSocket + STOMP 딥다이브](./15-websocket-stomp-deep-dive.md)
- [learning/21 — 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md)
- [learning/24 — STOMP JWT ChannelInterceptor](./24-stomp-websocket-jwt-channel-interceptor.md)
- [learning/25 — 배치 브로드캐스트 · 멀티유저 attribution](./25-batch-broadcast-multiuser-message-attribution.md)
- [learning/43 — 부하 테스트 서사](./43-load-test-breaking-point-story.md)
- [learning/44 — STOMP 외부 broker 선택](./44-spring-stomp-external-broker-choice.md) (이 설계의 "의도적으로 선택하지 않은 경로" 의 기록)
- [부하 리포트 2026-04-22](../reports/load-test-2026-04-22.md)
- [ADR-007 — WebSocket Simple Broker](../architecture/decisions/007-websocket-simple-broker.md) (Step 6 에서 Superseded 예정)

### 빅테크·대규모 서비스 레퍼런스

- [채널톡 — 실시간 채팅 서버 개선 여정 1편 · 레디스의 Pub/Sub](https://channel.io/ko/blog/real-time-chat-server-1-redis-pub-sub)
- [채널톡 — 실시간 채팅 서버 개선 여정 2편 · NATS 로 Redis 대체](https://channel.io/ko/blog/real-time-chat-server-2-redis-pub-sub)
- [채널톡 — Socket.io Redis Adapter 구현을 통한 트래픽 개선](https://channel.io/ko/blog/articles/93f2dd92)
- [LINE — The architecture behind chatting on LINE LIVE](https://engineering.linecorp.com/en/blog/the-architecture-behind-chatting-on-line-live/)
- [Slack Engineering — Real-time Messaging](https://slack.engineering/real-time-messaging/)
- [Discord — Tracing Discord's Elixir Systems](https://discord.com/blog/tracing-discords-elixir-systems-without-melting-everything)

### Redis Pub/Sub · Socket.IO 어댑터

- [Socket.IO 공식 — Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Socket.IO 공식 — Redis Streams Adapter](https://socket.io/docs/v4/redis-streams-adapter/) (O(M×N) 문제의 공식 해법)
- [socket.io-redis-adapter GitHub](https://github.com/socketio/socket.io-redis-adapter)

### Raw WebSocket + Spring

- [Spring Framework — WebSocket API (raw)](https://docs.spring.io/spring-framework/reference/web/websocket/server.html) — `TextWebSocketHandler`, `HandshakeInterceptor`
- [Spring Data Redis — Pub/Sub Messaging](https://docs.spring.io/spring-data/redis/reference/redis/pubsub.html) — `RedisMessageListenerContainer` 설정
- [Lettuce — Pub/Sub 사용법](https://redis.github.io/lettuce/user-guide/pubsub/) — 커넥션 분리 원칙

### 관련 트렌드

- NATS JetStream — 채널톡 2편에서 넘어간 대상. Redis Pub/Sub 을 넘어선 이후의 선택지
- Centrifugo — raw WebSocket + managed broker 느낌의 오픈소스 (STOMP 호환 아님이지만 설계 참고용)
- Phoenix Channels (Elixir) — Erlang 런타임이 actor-native 이라서 우리 Java 버전과 비교할 가치가 큼

---

> 이 문서는 **설계서** 다. 실제 구현하면서 부딪친 것·설계가 바뀐 것은 **46번 learning 노트** 에 구현 이력으로 이어서 쓴다.
