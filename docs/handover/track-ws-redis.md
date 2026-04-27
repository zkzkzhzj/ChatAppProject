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
| **2.5** | **토폴로지 결정 ② → ③ 자기정정** — WS 서버 분리(③) 채택. learning/59 작성 | ✅ 완료 (2026-04-27) |
| **3** | **클라이언트 재작성 + WS 모듈 분리(a)** — `@stomp/stompjs` 제거, raw WS 클라이언트 + envelope `version` 필드 + 재연결 backoff + WS 어댑터 별도 Gradle 모듈 분리 | ⏭️ **다음 착수 후보** |
| 4 | RPC 경계 설계 + 통합 테스트 마이그레이션 — gRPC/Kafka 도메인 호출 경로, Cucumber STOMP → raw WS, Redis Testcontainer | 대기 |
| 5 | 운영 배포 + WS 서버 분리(b) — `deploy/docker-compose.yml`에 `ws-server` 컨테이너, ALB sticky, CD 두 서비스 분기, 분산 trace 도입 | 대기 |
| 6 | 부하 재측정 (Sweep 4) — ③(b) 토폴로지 검증. ADR-007 Superseded + 새 ADR(③ 채택) | 대기 |
| 7 | `learning/47` 구현 기록 + `learning/43` 제목 확장 + Task 1 블로그 본편 *(learning/15·21·24·25 레거시 표시 + #44 박스 확장 + #59 §9 매핑 부록은 2026-04-27 미리 처리)* | 대기 |

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
| 2026-04-27 | **토폴로지 ②(모놀리스 + Redis) 채택 → 자기정정 후 ③(WS 서버 분리) 채택** | 사용자 재질문("이건 당연히 분리하는 거 아니냐") 받고 다시 보니 신규 채팅 서비스 설계의 일반 default가 ③. 채널톡·LINE도 "트래픽 자라서 분리"가 아니라 처음부터 분리였음. 모놀리스 즉시 비용(sticky session·재연결 폭풍·heap 분리 불가) 과소평가. 학습+실서비스 양립 목표에도 ③이 부합. 상세: [learning/59](../learning/59-ws-server-separation-vs-monolith.md) |
| 2026-04-27 | **learning 노트 39개 전수 점검 + 시나리오 B 정리 완료** | 사용자 피드백("노트가 많이 쌓였다") 받고 ws 9개 + ws 외 30개 교차 점검. 결과: 폐기·병합 0건(노트들 건강함), 진짜 작업은 메타데이터 정리. ws 노트 6개 시점 공지 배너 + #44 박스 확장 + #59 §9 매핑 부록 + ws 외 4개 시점 마크(02·20·34·39) + 헥사고날 3부작 cross-ref + INDEX 6건 갱신. Step 7의 "15·21·24·25 레거시 표시" 작업을 미리 처리한 셈. |

---

## 8. ③ 채택에 따른 Step 3~5 작업 합의 (2026-04-27)

### 8.1 분리 깊이 — 단계적 진행

| 단계 | 내용 | 시점 |
|------|------|------|
| (a) 패키지 분리 | `communication/adapter/in/websocket/` → 별도 Gradle 모듈 | Step 3와 병행 |
| (b) 같은 EC2의 별도 컨테이너 | docker-compose에 `app`, `ws-server` 두 컨테이너 분리. host network로 RPC | **Step 5 (목표)** |
| (c) 별도 EC2 풀 | WS 서버를 별도 EC2 풀로. ALB target group 분리 | 트래픽이 분리 비용 정당화 시 (learning/59 §7) |

지금 목표는 (b)까지. (c)는 추후.

### 8.2 RPC 경계 설계 (Step 3~4 작업)

WS 서버 → 도메인 서버 호출 경로 명확히:
- **동기 ack 필요** (`SendMessageUseCase`가 영속화 성공 응답을 클라이언트에 전달) → **gRPC**
- **async event publish** (NPC 트리거, 알림) → **Kafka**
- 잘못 그으면 마이크로서비스 헬 (분산 트랜잭션, 일관성 지옥). learning/59 §6 참조

### 8.3 서비스 간 호환성

- 메시지 envelope에 `version` 필드 명시
- WS 서버 / 도메인 서버 배포 시점 불일치 대비 — forward/backward 호환 N+1 호환 1주기

### 8.4 Step 3 클라이언트 작업

- 재연결 폭풍 대비 — exponential backoff + jitter 필수 (③도 폭풍을 줄일 뿐 없애지 못함)
- envelope `version` 필드 추가
- 운영 환경 분산 trace ID를 envelope으로 전파 (zipkin/jaeger/grafana tempo 검토)

### 8.5 Step 5 운영 배포 작업 추가량

- `deploy/docker-compose.yml`에 `ws-server` 컨테이너 추가
- ALB sticky session 정책 (cookie-based 또는 IP hash) — WS 컨테이너에 라우팅
- CD 파이프라인에 두 서비스 배포 분기
- 분산 trace 인프라 도입 (zipkin/jaeger/grafana tempo 중 택일 — 별도 ADR)

### 8.6 Step 6 부하 재측정의 역할

**②/③ 결정은 이미 났음.** Step 6는 ③(b)단계 토폴로지가 VU 200 p99 < 500ms 목표를 통과하는지 **검증** 도구. 부족하면 broker 교체(④) 또는 ③(c)단계 검토.

### 8.7 Step 5 후 운영 검증 (1개월)

- REST 핫픽스 시 WS 영향 0이면 ③ 가치 입증
- incident 리포트 누적 후 6개월 회고 (learning/59 §7)

---

## 9. 다음 세션 인수인계 (2026-04-27 자정 시점)

### 9.1 워크트리·브랜치 상태

- 워크트리: `C:\Users\zkzkz\IdeaProjects\ChatAppProject-ws-redis\`
- 브랜치: `feat/ws-redis-step2`
- 원격 대비: **ahead 4 / behind 1** (`origin/feat/ws-redis-step2` 갱신 필요. f183c47 → 로컬 2e1598a로 같은 의미 다른 SHA)

### 9.2 미커밋 변경 (working tree, 17개 파일)

**신규**: `docs/learning/59-ws-server-separation-vs-monolith.md` (이번 세션 작성)

**수정 (시점 공지 배너 / 부분 갱신)**:
- ws 6개: `learning/15·21·24·25·27·44`
- ws 외 4개: `learning/02·20·34·39`
- 헥사고날 3부작 cross-ref: `learning/08·16·53`
- INDEX·RESERVED: `learning/INDEX.md`, `learning/RESERVED.md`
- 트랙 파일: `docs/handover/track-ws-redis.md` (이 파일 자체)

### 9.3 미푸시 커밋 (4건, 누적)

```text
8a1fbbe docs(ws-redis): learning/53 헥사고날 outbound port 호출자 룰
0832b40 feat(ws-redis): Step 2 백엔드 raw WS broker + Step 3-B-1 envelope 확장
2e1598a docs(ws-redis): learning/46 마을·서버 확장 모델 결정 기록
eae1759 feat(ui): MVP 피드백 F-1·F-2·F-3 (#27, main 머지 동기화)
```

### 9.4 PR #26 상태

- 제목: "docs(ws-redis): learning/46 마을·서버 확장 모델 결정 기록" (작은 변경 이름인데 실제로는 거대 변경 묶음)
- 실제 내용: Step 2 백엔드 + Step 3-B-1 envelope + ③ 토폴로지 결정 + 학습노트 정리
- **다음 세션 우선 작업**: PR #26 닫고 **3개로 분할 재편성** 권장
  1. `feat/ws-redis-step2-backend` — Step 2 백엔드 + Step 3-B-1 envelope (커밋 0832b40)
  2. `docs/ws-redis-topology-decision` — learning/46·53·59 + RESERVED + INDEX (이번 세션 학습노트)
  3. `docs/learning-notes-cleanup` — ws 외 4개 + 헥사고날 cross-ref (이번 세션 메타데이터 정리)
- 또는 한 PR에 다 담되 제목·본문 다시 쓰기 (사용자가 어느 쪽 선호하는지 물어보기)

### 9.5 다음 세션 가장 먼저 할 일 (순서대로)

1. **CLAUDE.md §1 — `/docs/wiki/INDEX.md` + `/docs/knowledge/INDEX.md` 정독** + `docs/handover/INDEX.md` + 본 트랙 파일 정독
2. **워크트리·브랜치 확인** — `pwd` 가 `ChatAppProject-ws-redis` 인지, 브랜치 `feat/ws-redis-step2` 인지
3. **PR 분할 결정 받기** — 사용자에게 "PR #26 그대로 살려서 본문만 갱신할까, 3개로 쪼갤까" 묻기
4. 결정대로 커밋·PR 정리. **사용자 명시 승인 없이 push 금지** (memory `feedback_no_push_without_ask`)
5. ghost-session 트랙 SessionRegistry 영역 동시 수정 여부 확인 → 다중 세션 정책 합의 (memory `project_status.md` §"다른 세션이 알아야 할 핵심")
6. **Step 3 착수** — 클라이언트 재작성 + WS 모듈 분리(a). §8.4 작업 항목 그대로 진행

### 9.6 Step 3 착수 시 핵심 체크 (다시 한 번)

- **토폴로지 ③ 채택 전제** — 모듈 분리(a) 작업 포함 (단순 클라이언트 재작성만이 아님)
- **재연결 폭풍 대비 — 클라이언트 exponential backoff + jitter** 필수
- **envelope `version` 필드** 추가 (서비스 간 호환성)
- **분산 trace 도입 검토** — Step 5 ADR 별도, Step 3에서는 trace ID envelope 전파 인터페이스만 마련

### 9.7 보류 사항 (트랙 외부)

- 사용자 워크트리(`ChatAppProject/`) 미커밋 docs 정합성 변경 — 별도 PR로 머지 예정. 그 머지 후 RESERVED.md 충돌 해결 필요
- ghost-session 트랙 — 다중 세션 정책 ws-redis와 합의 후 진행

### 9.8 hook 보강 보류

`stop-handover-check.js` 가 병행 트랙 정책을 모르고 매 턴 메인 `handover.md` 갱신 요구. 활성 트랙 인식하도록 보강하는 작업 사용자 결정 보류 상태. 본 트랙 머지 후 별도 작업.
