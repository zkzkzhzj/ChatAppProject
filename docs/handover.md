# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
>
> **이 문서는 전체 완료 상태와 핵심 설계 결정만 담는다.**
> **현재 진행 중인 작업 트랙은 `docs/handover/INDEX.md`에서 자기 트랙을 찾아 그 sub 파일을 읽는다.**
>
> - 상세 맥락·결정 이유: `docs/learning/INDEX.md` (주제별)
> - 진행 중인 트랙: `docs/handover/INDEX.md` (트랙별)
> - 병행 작업 충돌 회피: `docs/conventions/parallel-work.md`

---

## 1. 활성 트랙 인덱스

| 트랙 ID | 파일 | 상태 | 이슈 |
|---------|------|------|------|
| `ws-redis` | [handover/track-ws-redis.md](./handover/track-ws-redis.md) | Step 1·2 완료 / Step 3 진입 전 범위 결정 대기 | — |
| `ghost-session` | [handover/track-ghost-session.md](./handover/track-ghost-session.md) | 분석 단계 | #28 |

**최근 종료 트랙**: `ui-mvp-feedback` (PR #27, 2026-04-26)

> 새 트랙 시작 시 `docs/handover/INDEX.md`의 "트랙 시작 절차" 따른다. 메인 `handover.md`는 머지 시점에만 갱신.

---

## 2. 전체 완료 요약

Phase 0·1·2·3·5 구현 → AWS 배포 (ghworld.co) → CD 자동화 → 학습노트 정리까지 완료. (Phase 4 — Economy는 의도적으로 미착수.)

| 구분 | 범위 | 주요 PR | 상세 (learning) |
|------|------|---------|-----------------|
| Phase 0 | Foundation (Flyway, DDL 전략) | — | — |
| Phase 1 | Identity (회원가입, 로그인, GUEST 토큰) | PR #1 | [08](./learning/08-phase1-layer-patterns.md) |
| Phase 2 | Village (캐릭터, 공간, Outbox→Kafka) | PR #7 | [13](./learning/13-global-alert-port-pattern.md) |
| Phase 3 | Communication (마을 공개 채팅) | PR #7 | [15](./learning/15-websocket-stomp-deep-dive.md) · [21](./learning/21-village-public-chat-architecture.md) · [23](./learning/23-chatroom-structure-space-equals-room.md) · [24](./learning/24-stomp-websocket-jwt-channel-interceptor.md) · [25](./learning/25-batch-broadcast-multiuser-message-attribution.md) |
| Phase 5 | AI NPC (OpenAI GPT-4o-mini + pgvector 시맨틱) | PR #8 · #13 | [22](./learning/22-ollama-local-llm-spring-integration.md) · [28](./learning/28-llm-model-selection-and-production-strategy.md) · [29](./learning/29-vector-embedding-pgvector-semantic-search.md) · [30](./learning/30-jpa-pgvector-type-mapping.md) · [31](./learning/31-kafka-idempotency-key-design.md) · [33](./learning/33-ai-agent-evaluation-methodology.md) · [36](./learning/36-npc-conversation-engineering-patterns.md) |
| 실시간 공유 | 위치·타이핑·@멘션 NPC | PR #11 | [26](./learning/26-phaser-html-keyboard-focus-conflict.md) |
| 프론트 UI | Tailwind v4 디자인 시스템 + Phaser 월드 | PR #9 | [32](./learning/32-web-2d-game-engine-comparison.md) · [34](./learning/34-react-nextjs-production-code-patterns.md) |
| AWS 배포 | EC2 서울, nginx + Cloudflare, ghworld.co | — | [35](./learning/35-aws-ec2-first-deployment.md) |
| CI/DX | Checkstyle + Error Prone + ArchUnit + CodeRabbit | — | [18](./learning/18-java-static-analysis-stack.md) · [20](./learning/20-frontend-eslint-convention.md) · ADR [008](./architecture/decisions/008-ci-dx-tool-stack.md) |
| CD 자동화 | GHCR + SSM + OIDC (PR #15~#19) | PR #15~#19 | [37](./learning/37-cd-pipeline-design.md) · [38](./learning/38-env-var-config-migration.md) · [39](./learning/39-nextjs-docker-healthcheck-ipv6-trap.md) |
| 관측성 스택 | Prometheus + Grafana (monitor EC2), Micrometer histogram, k6 RW | PR #21~#23 | [40](./learning/40-observability-stack-decisions.md) · [42](./learning/42-grafana-jvm-dashboard-reading.md) |
| 부하 테스트 | k6 WebSocket+STOMP, Plateau Sweep, Breaking Point VU ~200 확정 | PR #23 | [41](./learning/41-k6-load-testing-setup.md) + `docs/reports/load-test-2026-04-22.md` |
| 데이터 기반 블로그 초안 | 256MB→1GB → Simple Broker 병목 서사 | — | [43](./learning/43-load-test-breaking-point-story.md) |
| RabbitMQ vs raw WS 트레이드오프 | learning/44 (대안 분석), learning/45 (B안 설계서) | — | [44](./learning/44-spring-stomp-external-broker-choice.md) · [45](./learning/45-websocket-redis-pubsub-redesign.md) |
| MVP 피드백 1차 | F-1 모바일 터치 이동 + F-2 typing 말풍선 cleanup + F-3 한글 IME 가드 | PR #27 | [49](./learning/49-react-input-ime-handling.md) · [50](./learning/50-mobile-touch-movement-tradeoffs.md) |

> 학습 노트 전체 색인: [docs/learning/INDEX.md](./learning/INDEX.md)

---

## 3. 핵심 설계 결정 (현재 활용 중 — 유지)

### 이벤트 흐름

```text
RegisterUserService
  → outbox_event 테이블 저장 (같은 트랜잭션)
  → OutboxKafkaRelay (@Scheduled 1s) → Kafka "user.registered" 토픽
  → UserRegisteredEventConsumer → InitializeUserVillageService
  → character + space 테이블 저장
```

### 게스트 정책

- `GET /api/v1/village/characters/me`: 게스트 → `Character.defaultGuest()` 반환 (DB 저장 없음)
- `GET /api/v1/village/spaces/me`: 게스트 → `GuestNoPersonalSpaceException` (403)
- `POST /api/v1/chat/messages`: 게스트 → `GuestChatNotAllowedException` (403)
- STOMP `/app/chat/village`: 게스트 → `GuestChatNotAllowedException` (ChatMessageHandler에서 Principal 검사)
- STOMP CONNECT: 토큰 없이 연결 허용 (구독은 가능, 메시지 전송 시 403)

### 채팅 흐름 (마을 공개 채팅 — 현재 운영 구조)

```text
[초기 상태]
V3 마이그레이션 → 마을 공개 채팅방 (id=1, type=PUBLIC) + NPC 참여자 고정 생성

[STOMP 경로 — 주 경로]
클라이언트 STOMP CONNECT (Authorization: Bearer {token})
  → StompAuthChannelInterceptor → JWT 파싱 → Principal 설정
클라이언트 → /app/chat/village (body만 전송)
  → ChatMessageHandler → SendMessageUseCase.Command(userId, publicChatRoomId, body)
  → getOrCreateParticipant() (첫 메시지 시 자동 참여, V4 UNIQUE 보호)
  → Message(유저) → Cassandra 저장 (message + user_message dual-write)
  → /topic/chat/village broadcast: MessageResponse(user) — 즉시 반환
  → [비동기] NpcReplyService.replyAsync()
    → 유저 메시지 임베딩 → pgvector 유사도 검색 → 맥락 주입
    → LLM 응답 생성 → Cassandra 저장
    → /topic/chat/village broadcast: MessageResponse(npc)
  → [3회 누적 시] Outbox → Kafka → 대화 요약 → pgvector 저장

[REST 경로 — fallback]
POST /api/v1/chat/messages {body: "..."}
  → 동일 UseCase 실행
  → SimpMessagingTemplate으로 /topic/chat/village broadcast (유저 메시지만)
  → REST 응답: {userMessage} (NPC 응답은 비동기 WebSocket)
```

> ⚠️ 위 STOMP 경로는 `ws-redis` 트랙에서 raw WS + Redis Pub/Sub로 교체 진행 중. 트랙 완료 전까지는 위 구조가 정답.

### WebSocket 구조 (현재)

- STOMP 엔드포인트: `/ws` (SockJS fallback)
- STOMP 인증: `StompAuthChannelInterceptor` — CONNECT 프레임 `Authorization` 헤더에서 JWT 추출
- 클라이언트 → 서버: `/app/chat/village` (고정)
- 서버 → 클라이언트: `/topic/chat/village` (Simple Broker, 고정)
- 설정 키: `village.public-chat-room-id`

### Spring Boot 4.x 주의사항
>
> 상세는 [learning/12](./learning/12-spring-boot-4x-traps.md) 참조.

- Kafka / Cassandra 자동구성: 스타터 없이 코어만 추가 시 `spring-boot-<기술>` 모듈도 함께 필요
- Cassandra 프로퍼티: `spring.cassandra.*` (3.x의 `spring.data.cassandra` 아님)
- Cassandra Testcontainers 모듈: `org.testcontainers:testcontainers-cassandra`
- Cassandra: keyspace는 앱이 만들지 않음. `CqlSession`으로 별도 생성 (테스트 static block)
- Jackson: `tools.jackson.*` 패키지 (3.x)
- JSONB 매핑: `@JdbcTypeCode(SqlTypes.JSON)` 필요

---

## 4. 다음 할 것 — 프로덕션 로드맵

### 진행 중 트랙

- **`ws-redis`** — `docs/handover/track-ws-redis.md` 참조 (Step 2 worktree 진행 중)
- **`ghost-session`** — `docs/handover/track-ghost-session.md` 참조 (presence cleanup 버그, issue #28)

### Week 7 잔여

| Step | 목표 | 산출물 | 상태 |
|------|------|--------|------|
| **D. Task 3 제출 (Performance Report)** | Notion 페이지 | 표 + 증거 10장 + Bottleneck Analysis + Recommendations | 🔧 작성 중 |
| **E. Task 1 기술 블로그** | Step C 서사 (Before/After) | Velog/Tistory | **연기** — `ws-redis` 트랙 완주 후 진짜 Before/After로 재작성. 43번은 "진단 기록"으로 유지 |
| **F. Task 2·4 README + 영상 + 에세이 + 이력서** | Week 7 나머지 산출물 | — | E 후속 |
| (선택) G. Post-Mortem | Sweep 2의 GC Death Spiral을 독립 리포트로 | — | 자료 확보됨 |

### 병행 가능한 짜투리 작업

| 작업 | 우선순위 |
|------|--------|
| hook `.claude/hooks/stop-handover-check.js` 개선 (커밋 단위로 검사 · 특정 경로 제외 · 세션당 1회 · 트랙 분리 반영) | 중 |
| learning/42 §6 PromQL 블록 갱신 — Heap `sum()` 합산, `bytes(IEC)` unit, `k6_*_p99` 실제 메트릭 이름, Row 3그룹 레이아웃 추가 | 중 |
| 포트 22 Security Group 제거 (SSM 전용) — AWS Console 직접 | 낮음 |
| learning/37 CD 구축기 실측치 업데이트 | 낮음 |
| EC2 잔존 파일 정리 (application-prod.yml 혹시 남으면) | 낮음 |
| ParseTokenPort 위치 이동 (global/security → port) | 별도 PR |

### 번외 — MVP 피드백 대응

> 상세: `docs/feedback/README.md`

- [x] F-1: 모바일 터치 이동 지원 (PR #27)
- [x] F-2: 떠난 유저 typing 말풍선 cleanup (PR #27 — 원 피드백 표 설명 정정됨)
- [x] F-3: 맥북 IME 마지막 단어 반복 입력 (PR #27, macOS 실기 미검증 — 원 제공자 재검증 대기)
- [ ] F-5: 회원가입 고도화 (닉네임 + 이름) — 별도 트랙 후보

### Phase 4 — Economy (미착수)

포인트 획득 → 아이템 구매 → 인벤토리. 낙관적 락·멱등성 직접 설계 연습.

### Phase 6+ — 공간·캐릭터 개인화 (`s3-media` 트랙 후보)

마음의 고향 핵심 가치("내 안식처") 강화용.

- **집 배경 이미지 생성** — Nano Banana(Gemini 2.5 Flash Image) API, S3 저장, `Space.backgroundImageUrl` 연결. 유해 필터·일일 쿼터·fallback 이미지 설계 필요.
- **캐릭터 생성** — 유저 프롬프트 또는 프리셋. Phaser 스프라이트 시트 자동 생성 또는 2D 아바타 라이브러리.

두 기능 모두 **이미지 생성 비용 관리**가 가장 중요한 설계 포인트.

### 보류 — 마을 운영 모델 결정 (B안 완주 후)

- 단일 마을 + Hard Cap 패턴(현재 결론) vs ZEP처럼 유저 직접 마을 생성
- 도메인 핵심 가치("안식처")와 충돌 여부 검토 필요
- 채팅 인프라(`ws-redis` 트랙)에는 영향 없음

---

## 5. 현재 기술 스택 버전

| 항목 | 버전 |
|------|------|
| Spring Boot | 4.0.3 |
| Java | 21 |
| spring-kafka | 4.0.3 |
| Testcontainers | 2.x (Spring BOM 관리) |
| Cucumber | 7.34.2 |
| JJWT | 0.12.6 |
| Flyway | Spring BOM 관리 |
| Node.js | v24.12.0 |
| Next.js | 16.2.2 |
| React | 19.2.4 |
| Phaser | 3.90.0 |

---

## 6. 패키지 구조 현황

```text
com.maeum.gohyang/
├── global/
│   ├── alert/
│   ├── config/
│   │   ├── WebSocketConfig.java
│   │   └── StompAuthChannelInterceptor.java  ← STOMP CONNECT JWT 인증
│   ├── error/
│   ├── infra/
│   │   ├── outbox/
│   │   └── idempotency/
│   └── security/
├── identity/
│   ├── domain/          ← User, LocalAuthCredentials (순수 도메인만)
│   ├── error/           ← IdentityErrorCode, DuplicateEmailException
│   ├── application/
│   └── adapter/
├── village/
│   ├── domain/          ← Character, Space, SpaceTheme (순수 도메인만)
│   ├── error/           ← VillageErrorCode, *Exception 3종
│   ├── application/
│   └── adapter/
│       └── in/websocket/ ← PositionHandler, PositionDisconnectListener, PresenceNotifier, TypingHandler
└── communication/
    ├── domain/          ← ChatRoom, Participant, Message, MentionParser, enum 5종
    ├── error/           ← CommunicationErrorCode, *Exception 4종
    ├── application/
    │   ├── port/in/ (UseCase 4종 — SendMessageUseCase, LoadChatHistoryUseCase, LoadMentionablesUseCase + 레거시 CreateChatRoomUseCase)
    │   ├── port/out/ (12종: Save/Load/Generate + Broadcast/Publish/Summarize)
    │   └── service/ (SendMessageService, NpcReplyService, LoadChatHistoryService, LoadMentionablesService)
    └── adapter/
        ├── in/
        │   ├── web/ (ChatRoomController POST /api/v1/chat/messages)
        │   ├── websocket/ (ChatMessageHandler /app/chat/village)
        │   └── messaging/ (ConversationSummaryEventConsumer)
        └── out/
            ├── persistence/ (JPA 4종 + Cassandra 6종 + ConversationMemory/ConversationSummaryOutbox)
            └── npc/ (Openai/Ollama/Hardcoded Adapter 3x3 + OpenAiProperties/OllamaProperties)
```

---

## 7. TestAdapter 구조

```text
HealthCheckSteps / IdentitySteps / VillageSteps / CommunicationSteps  ← 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter / AuthTestAdapter / VillageTestAdapter / ChatTestAdapter  ← URL, 폴링 로직
    ↓
TestAdapter              ← RestClient GET/POST, 인증 헤더
    ↓
ScenarioContext          ← lastResponse, currentAccessToken, currentEmail, currentChatRoomId
```

---

## 8. 참고 문서 위치

| 필요할 때 | 파일 |
|-----------|------|
| **진행 중인 작업 트랙** | [docs/handover/INDEX.md](./handover/INDEX.md) |
| **왜 그런 결정을 했는지 (학습 노트 전체)** | [docs/learning/INDEX.md](./learning/INDEX.md) |
| 학습 노트 번호 예약 | [docs/learning/RESERVED.md](./learning/RESERVED.md) |
| 병행 작업 충돌 회피 정책 | [docs/conventions/parallel-work.md](./conventions/parallel-work.md) |
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 패키지 구조 상세 | `docs/architecture/package-structure.md` |
| ERD | `docs/architecture/erd.md` |
| 의사결정 기록 (ADR) | `docs/architecture/decisions/` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| Git 전략 | `docs/conventions/git.md` |
| REST API 명세 | `docs/specs/api.md` + `docs/specs/api/` |
| WebSocket 명세 | `docs/specs/websocket.md` |
| Kafka 이벤트 명세 | `docs/specs/event.md` |
| AI Native 개발 지식 베이스 | `docs/knowledge/INDEX.md` |
| 인프라 트러블슈팅 | `docs/knowledge/infra/` |
| Wiki (정규 지식) | `docs/wiki/INDEX.md` |
| MVP 피드백 목록 | `docs/feedback/README.md` |
