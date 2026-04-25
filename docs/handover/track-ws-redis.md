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
| **2** | **백엔드 `WebSocketHandler` 구현** — handshake JWT, 세션 레지스트리, Redis Pub/Sub 어댑터, JSON 파서, UseCase 연동 | ⏭️ **대기 (사용자 설계 승인 후 착수)** |
| 3 | 클라이언트 재작성 — `@stomp/stompjs` 제거, raw WS 클라이언트 | 대기 |
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

## 4. Step 2 — 다음 착수 (대기)

### 작업 범위 (1~1.5일)

기존 STOMP 코드는 건드리지 않고 **병렬로 신규 경로 추가**.

**구현 항목:**

- `JwtHandshakeInterceptor` — WebSocket 핸드셰이크 시 쿼리 토큰 검증
- `ChatWebSocketHandler` — raw WebSocket 핸들러. JSON envelope 파싱 + 세션에 Principal 바인딩
- `SessionRegistry` — `ConcurrentHashMap<sessionId, WebSocketSession>` + `ConcurrentHashMap<roomId, Set<sessionId>>` 역인덱스 + cleanup
- `RedisPubSubBroadcastAdapter` — `MessageBroadcastPort` 구현체. 방별 `chat:room:{id}` 채널 SUBSCRIBE/UNSUBSCRIBE 동적 관리
- `WebSocketConfig` 신규 (기존 STOMP config와 별도, 엔드포인트 `/ws/v2`)
- 기존 `SendMessageUseCase`·게스트 정책·NPC 응답 로직 그대로 재사용

**지키지 말아야 할 것:**

- PSUBSCRIBE 금지 (채널톡 O(M×N) 함정)
- 글로벌 단일 채널 금지
- 모든 서버가 모든 방 구독 금지

**건드리지 않는 것:**

- 기존 STOMP 코드 (`adapter/in/websocket/ChatMessageHandler` 등) — Step 6까지 살려둠
- `SendMessageUseCase` 시그니처
- Cassandra 저장 로직
- 게스트 정책·NPC 응답 파이프라인

### 완료 기준

- [ ] 신규 WS 엔드포인트 `/ws/v2`로 연결 가능
- [ ] JWT 쿼리 토큰 검증 통과
- [ ] JSON envelope SUBSCRIBE/PUBLISH 동작
- [ ] 같은 방 구독자 간 메시지 전달 (단일 JVM)
- [ ] Redis Pub/Sub 채널 수가 "접속자 있는 방 수"와 일치 (모니터링)
- [ ] 기존 STOMP 엔드포인트 영향 없음 (회귀 없음)

### Step 2 착수 전 사용자 확인 필요

`learning/45`의 핵심 설계 결정 5가지(특히 채널 네이밍 정책·JWT 쿼리 토큰·hard cutover) 직접 읽고 OK 사인 필요. 설계 단계에서 막아야 구현 뒤집기 비용 안 듦.

→ 본 트랙 파일이 이 5가지를 §3에 요약함. **별도 정독 없이 본 파일만으로 OK 가능**.

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
