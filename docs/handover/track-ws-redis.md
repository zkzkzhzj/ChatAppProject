# Track: ws-redis — 채팅 broker B안 재설계

> 작업 영역: `communication/adapter/in/websocket/`, `global/config/`, 신규 `application/port/out/MessageBroadcastPort` 구현체, `deploy/`(Step 5), 프론트(Step 3)
> 시작일: 2026-04-24
> 활성 세션: (현재 작업 중인 세션 ID 기록 권장)

---

## 0. 한 줄 요약

Spring STOMP + Simple Broker(단일 dispatch thread, 인메모리)를 걷어내고, raw WebSocket + Redis Pub/Sub로 재설계해서 수평 확장 가능한 실시간 채팅 인프라를 만든다.

---

## 1. 배경 / 왜

- 부하 테스트 결과 (`docs/reports/load-test-2026-04-22.md` §2.8): VU 200 plateau에서 CPU 45% / Heap 44.8% / Threads 123 정상인데 `stomp_connect_latency p99 = 12.98s`. **Simple Broker 단일 dispatch thread**가 fan-out 큐 drain하느라 신규 CONNECT 프레임이 큐 뒤로 밀림.
- learning/44에서 RabbitMQ + STOMP plugin이 "교과서적 정답"임을 논증했으나, 설정 변경 수준이라 **구조적 학습 효과가 낮음**. 대신 LINE LIVE(Akka + Redis bridge), 채널톡(Socket.IO + Redis → NATS) 검증 경로를 직접 설계.
- 인메모리 단일 JVM 구조는 멀티 인스턴스 확장 원천 불가. 도메인 성장 시 반드시 부딪힐 한계.

관련 문서:

- 설계서 본체: [docs/learning/45-websocket-redis-pubsub-redesign.md](../learning/45-websocket-redis-pubsub-redesign.md)
- 부하 테스트 증거: [docs/reports/load-test-2026-04-22.md](../reports/load-test-2026-04-22.md)
- 대안 비교: [docs/learning/44-spring-stomp-external-broker-choice.md](../learning/44-spring-stomp-external-broker-choice.md)
- 빅테크 사례: [docs/knowledge/realtime/chat.md](../knowledge/realtime/chat.md)
- ADR: [docs/architecture/decisions/007-websocket-simple-broker.md](../architecture/decisions/007-websocket-simple-broker.md) (Step 6에서 Superseded 처리)

---

## 2. 전체 로드맵

| Step | 내용 | 상태 |
|------|------|------|
| 1 | 설계 문서 (`learning/45`) — O(M×N) 함정 예방 + 구조 합의 | ✅ 완료 (2026-04-24) |
| **2** | **백엔드 `WebSocketHandler` 구현** — handshake JWT, 세션 레지스트리, Redis Pub/Sub 어댑터, JSON 파서, UseCase 연동 | ✅ 완료 (2026-04-26) |
| **3** | **클라이언트 재작성** — `@stomp/stompjs` 제거, raw WS 클라이언트 | ⏭️ **다음 착수 후보** |
| 4 | 통합 테스트 마이그레이션 — Cucumber STOMP → raw WS, Redis Testcontainer | 대기 |
| 5 | 운영 배포 + Redis 추가 — `deploy/docker-compose.yml`, CD 통과 | 대기 |
| 6 | 부하 재측정 (Sweep 4) + ADR-007 Superseded + 새 ADR | 대기 |
| 7 | `learning/15·21·24·25` 레거시 표시 + `learning/46` 구현 기록 + `learning/43` 제목 확장 + Task 1 블로그 본편 | 대기 |

---

## 3. Step 1 — 설계 완료 내역 (2026-04-24)

| 항목 | 내용 |
|------|------|
| 산출물 | `docs/learning/45-websocket-redis-pubsub-redesign.md` (857줄) |
| INDEX | `docs/learning/INDEX.md` #45 엔트리 추가 완료 |
| 핵심 결정 5가지 | (1) 방당 1채널 + 각 서버는 자기 접속자 있는 방만 SUBSCRIBE (O(M×N) 회피 생명줄) (2) 로컬 fan-out = ConcurrentHashMap<roomId, Set<sessionId>> + @Async (3) 인증 = JwtHandshakeInterceptor + 쿼리 토큰 (4) 프로토콜 = `{type, payload}` JSON envelope (5) hard cutover (실유저<10명이라 듀얼 운영 생략) |
| 헥사고날 보존 | `SendMessageUseCase` 무변경. `BroadcastChatMessagePort` 시그니처 유지, 구현체만 교체. `MessageBroadcastPort`는 Redis/NATS/RabbitMQ 어느 것으로도 교체 가능하게 설계 (escape hatch) |
| ADR 처리 | ADR-007 교정은 45번 본문이 아닌 별도 ADR 업데이트(ADR-009 예상)로. Step 6 PR에서 처리 |

---

## 4. Step 2 — 완료 내역 (2026-04-26)

### 산출물 요약

5단계로 분할 진행. 총 production 17개 / test 7개 / 학습노트 1개 추가, V1 코드는 한 줄도 손대지 않음.

| 단계 | 산출물 | 테스트 |
|------|--------|--------|
| 2-A protocol | `EnvelopeType` enum + sealed `InboundFrame`/`OutboundFrame` (Subscribe/Unsubscribe/Publish/Ping + Message/Error/Pong record), `ChatMessagePayload` | InboundFrame 6 + OutboundFrame 4 |
| 🔴 회귀 안전망 | (V1 ChatMessageHandler·WebSocketBroadcastAdapter 회귀 보호) | ChatMessageHandlerTest 4 + WebSocketBroadcastAdapterTest 1 |
| 2-B Redis Pub/Sub | `RoomMessageBus` (어댑터 내부 인터페이스), `RedisChatRelay` 구현, `RoomChannelNaming`, `BroadcastSerializationException`(COMM_005), `RedisConfig` | RedisChatRelayTest 5 (Testcontainers Redis) |
| 2-C inbound | `JwtHandshakeInterceptor` (쿼리 토큰), `WebSocketSessionRegistry`, `RoomSubscriptionRegistry` (0↔1 전환 시 Bus 호출), `ChatWebSocketHandler` (sealed switch 분기), `WebSocketV2Config` (`SimpleUrlHandlerMapping` 직접 노출) | JwtHandshakeInterceptorTest 5 + RoomSubscriptionRegistryTest 4 + ChatWebSocketHandlerTest 12 |
| 2-D UseCase 연결 | `ChatWebSocketHandler.handlePublish` echo → `SendMessageUseCase.execute` + `BusinessException`→`ErrorEvent` 매핑 | ChatWebSocketHandlerTest +2 (UseCase 매핑) |
| 2-E 통합 검증 | `ChatWebSocketV2IntegrationTest` (`@SpringBootTest` + `StandardWebSocketClient` + `BaseTestContainers`) | 2건 — 같은 방 두 세션 메시지 전달 + 마지막 세션 종료 시 Redis 채널 정리 / 게스트 PUBLISH 거부 |

### 완료 기준 검증

- [x] `/ws/v2` 연결 가능 (실제 WebSocket 핸드셰이크)
- [x] JWT 쿼리 토큰 검증 통과
- [x] JSON envelope SUBSCRIBE/UNSUBSCRIBE/PUBLISH/PING 동작
- [x] 같은 방 구독자 간 메시지 전달 (단일 JVM, Redis 채널 경유)
- [x] Redis 채널 수가 "접속자 있는 방 수"와 일치 (`RoomSubscriptionRegistry.sessionCount` 검증)
- [x] 기존 STOMP 회귀 없음 (Cucumber `npc_chat.feature` + V1 단위 테스트 모두 통과)

### 핵심 설계 결정 (구현 중 추가/확정)

- **`RoomMessageBus`는 어댑터 내부 인터페이스** — outbound port로 끌어올리지 않음. 호출자가 application service가 아니라 inbound 어댑터이기 때문 (`learning/49`).
- **`SimpleUrlHandlerMapping` 직접 노출** — `@EnableWebSocket` + `@EnableWebSocketMessageBroker` 동시 사용 시 Spring 6/7이 한 쪽 `HandlerMapping`만 활성화. raw WS는 `WebSocketHttpRequestHandler` + `setOrder(0)`으로 STOMP 매핑보다 우선 적용. cutover 후 정리 대상.
- **`BusinessException` 통째로 → `ErrorEvent` 매핑** — 도메인 예외 추가 시 핸들러 손댈 필요 없음.
- **NPC 응답은 V2로 보내지 않음** — Step 6 cutover에서 `BroadcastChatMessagePort.broadcastUserMessage` 추가 + V1 어댑터 제거로 통합.

### Step 6 cutover 시 정리할 항목 (learning/49 검토 포인트)

1. `BroadcastChatMessagePort.broadcastUserMessage` 메서드 추가, V2 어댑터 단독 구현체로 빈 충돌 해소.
2. `SendMessageService` 내부에서 `broadcastUserMessage` 호출 (V1 ChatMessageHandler가 직접 broadcast하던 코드와 일관화).
3. `WebSocketBroadcastAdapter` 삭제, `WebSocketConfig`의 STOMP 부분 + `StompAuthChannelInterceptor`/`StompErrorHandler`/`StompSendMessageRequest`/`ChatMessageHandler`/`ChatTopics` 제거.
4. `WebSocketV2Config`의 `SimpleUrlHandlerMapping` 우회 제거 → `@EnableWebSocket` + 표준 `WebSocketConfigurer`로 정리.
5. `RoomMessageBus`를 `BroadcastChatMessagePort`로 흡수할지 재평가 (호출자가 application으로 정리되면 outbound port로 끌어올림이 정합).

### 알려진 한계 (Step 3·5에서 다룸)

- 통합 테스트의 "위조된 토큰 핸드셰이크 거부" 케이스는 `jakarta.websocket` 라이브러리가 401 응답을 `DeploymentException`으로 감싸는 동작 때문에 빠짐. 단위 테스트(`JwtHandshakeInterceptorTest`)에서 동일 동작 검증.
- 통합 테스트의 "단일 세션 close → 방 제거" 케이스는 401 무작위 발생으로 빠짐. 두 세션 시나리오에서 같은 동작 검증 + 단위 테스트(`ChatWebSocketHandlerTest.afterConnectionClosed`)에서 검증. **운영 클라이언트 적용 전(Step 3 또는 Step 5) 401 원인 디버깅 필요**.
- Redis listener fan-out 시 `MessageEvent` 역직렬화 → 재직렬화로 직렬화 2회 발생. `learning/45` §B.3에서 raw bytes 포워딩 최적화가 명시되어 있으나 현재는 단순함 우선. 부하 재측정(Step 6) 후 결정.

---

## 5. 충돌 위험 파일 (다른 트랙 작업 시 주의)

이 트랙이 **건드릴 예정**인 파일/디렉토리:

| 파일 | 단계 | 다른 트랙과의 충돌 |
|------|------|---------------------|
| `src/main/java/com/maeum/gohyang/global/config/WebSocketConfig.java` | Step 2 | 없음 (이 트랙 전용) |
| `src/main/java/com/maeum/gohyang/global/config/JwtHandshakeInterceptor.java` (신규) | Step 2 | 없음 |
| `src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/` (신규 핸들러 추가) | Step 2 | 없음 |
| `src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/` (신규) | Step 2 | 없음 |
| `build.gradle.kts` | Step 2 | ⚠️ S3 트랙도 의존성 추가. 머지 순서 후순위면 rebase 필요 |
| `src/main/resources/application.yml` | Step 2/5 | ⚠️ S3 트랙도 설정 추가. 같은 키 X, 섹션 다름 |
| `deploy/docker-compose.yml` | Step 5 | ⚠️ S3 트랙도 env 추가 가능 |
| `deploy/.env` | Step 5 | ⚠️ S3 트랙도 env 추가 가능 |
| `frontend/` (STOMP 클라이언트 제거) | Step 3 | ⚠️ UI 트랙과 머지 순서 협의 필요 |
| `docs/learning/46-*.md` (신규) | Step 7 | RESERVED.md에서 46 예약 |
| `docs/learning/47-*.md` (신규) | Step 7 (예비) | RESERVED.md에서 47 예약 |
| `docs/architecture/decisions/007-...md` | Step 6 | Superseded 표시 |
| `docs/architecture/decisions/009-*.md` (신규 ADR) | Step 6 | 없음 |

---

## 6. 보류 메모 (이 트랙과 무관하지만 다음 대화에서 이어갈 주제)

- **마을 운영 모델 — "유저가 마을을 직접 생성하는 모델"(ZEP 패턴) 검토 필요**
  - 현재 결론: 단일 마을 + 동시접속 상한 도달 시 새 마을 안내 (Hard Cap 패턴)
  - 사용자 의문 (2026-04-25): "젭처럼 사람이 방을 생성하고 입장하는 건?"
  - 본 트랙 채팅 설계에는 영향 없음 (마을 1개든 N개든 `chat:room:{id}` 매핑은 동일)
  - **B안 완주 후 별도 트랙으로 다룰 가치 있음.** 도메인 핵심 가치("안식처")와 충돌 여부 따져야 함

---

## 7. 최근 의사결정 기록

| 날짜 | 결정 | 근거 |
|------|------|------|
| 2026-04-24 | RabbitMQ(learning/44) 대신 raw WS + Redis Pub/Sub | 학습 가치 + LINE LIVE/채널톡 사례 직접 흡수 |
| 2026-04-24 | hard cutover (듀얼 운영 X) | 실유저 <10명, 듀얼 운영 유지 비용이 더 큼 |
| 2026-04-24 | Step 2~5 동안 기존 STOMP 코드 살려둠 | Step 6 cutover 전까지 회귀 안전망 |
| 2026-04-25 | 동적 채널 샤딩 X / 마을 다중화도 보류 | 도메인 정합성 + 오버엔지니어링 회피 |
