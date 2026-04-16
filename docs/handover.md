# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> 현재 상태와 다음 할 일이 여기 있다.

---

## 현재 상태 (2026-04-16 기준, 12차 업데이트)

### ✅ Happy Path 완료 (Phase 0 ~ Phase 3 + 마을 공개 채팅) — PR #7 머지 완료

Cucumber 검증 + 프론트엔드 채팅 UI + 단위/인수 테스트 포함, PR #7 머지 및 CI 통과 완료.

```
GUEST 토큰 발급 → 마을 공개 채팅 시도 → 403
이메일 회원가입 → Kafka → 캐릭터/공간 자동 생성
마을 공개 채팅방(id=1 고정) → 메시지 전송 → NPC 하드코딩 응답 → WebSocket broadcast
다중 유저 메시지 구분 (나/이웃/NPC) — senderId 기반 JWT 디코딩
```

---

### 완료된 것

**Phase 0 — Foundation** ✅
- Flyway 의존성 추가, `V1__initial_schema.sql` (전체 ERD 기반)
- 테스트 `ddl-auto: validate` 전환

**Phase 1 — Identity** ✅

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Domain | `User`, `UserType`(→global/security), `LocalAuthCredentials` | ✅ |
| Error | `IdentityErrorCode`, `DuplicateEmailException`, `InvalidCredentialsException` → `identity/error/` | ✅ |
| Port (in) | `RegisterUserUseCase`, `IssueGuestTokenUseCase`, `LoginUseCase` | ✅ |
| Port (out) | `SaveUserPort`, `CheckEmailDuplicatePort`, `IssueTokenPort`, `SaveOutboxEventPort`, `LoadUserCredentialsPort` | ✅ |
| Service | `RegisterUserService`(Outbox 포함), `IssueGuestTokenService`, `LoginService` | ✅ |
| Persistence | `UserJpaEntity`, `UserLocalAuthJpaEntity`, `UserJpaRepository`, `UserLocalAuthJpaRepository`, `UserPersistenceAdapter`, `OutboxPersistenceAdapter` | ✅ |
| Security | `JwtProvider`(Optional\<AuthenticatedUser\>), `JwtFilter`, `SecurityConfig`, `SecurityProperties` | ✅ |
| Web Adapter | `AuthController`, `RegisterRequest`, `LoginRequest`, `AuthResponse` | ✅ |
| Cucumber | 회원가입/중복/게스트 토큰 시나리오 | ✅ |

**Global Infrastructure** ✅

| 패키지 | 내용 |
|--------|------|
| `global/security/` | `UserType`(enum), `AuthenticatedUser`(record) — identity 크로스 도메인 의존 제거 |
| `global/alert/` | `AlertPort`, `AlertContext`, `LogAlertAdapter` — 운영 알람 전용 인터페이스 |
| `global/infra/outbox/` | `OutboxJpaEntity`, `OutboxJpaRepository`, `OutboxKafkaRelay`(@Scheduled 1s) |
| `global/infra/idempotency/` | `ProcessedEventJpaEntity`, `ProcessedEventJpaRepository` |
| `global/config/` | `WebSocketConfig` — STOMP/SockJS 설정 |

**Phase 2 — Village** ✅

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Domain | `Character`, `Space`, `SpaceTheme` | ✅ |
| Error | `VillageErrorCode`, 예외 3종 → `village/error/` | ✅ |
| Port (in) | `InitializeUserVillageUseCase`, `GetMyCharacterUseCase`, `GetMySpaceUseCase` | ✅ |
| Port (out) | `SaveCharacterPort`, `LoadCharacterPort`, `SaveSpacePort`, `LoadSpacePort` | ✅ |
| Service | `InitializeUserVillageService`, `GetMyCharacterService`, `GetMySpaceService` | ✅ |
| Persistence | `CharacterJpaEntity`, `SpaceJpaEntity`, `CharacterJpaRepository`, `SpaceJpaRepository`, `VillagePersistenceAdapter` | ✅ |
| Messaging | `UserRegisteredEventConsumer`(Kafka, 멱등성 보장) | ✅ |
| Web Adapter | `VillageController`, `CharacterResponse`, `SpaceResponse` | ✅ |
| Cucumber | 회원가입 → Kafka → 캐릭터/공간 생성 비동기 시나리오 | ✅ |
| Cucumber | 게스트 캐릭터 조회 200 / 공간 조회 403 시나리오 | ✅ |

**Phase 3 — Communication (마을 공개 채팅으로 전환)** ✅

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Domain | `ChatRoom`, `Participant`, `Message`, enum 5종 (`ChatRoomType`에 `PUBLIC` 추가) | ✅ |
| Error | `CommunicationErrorCode`, 예외 4종 → `communication/error/` (`InvalidMessageBodyException` 추가) | ✅ |
| Port (in) | `CreateChatRoomUseCase` (레거시, 미사용), `SendMessageUseCase` (Command 레벨 body 검증), `LoadChatHistoryUseCase` | ✅ |
| Port (out) | `SaveChatRoomPort`, `SaveParticipantPort`, `LoadParticipantPort`, `SaveMessagePort`, `GenerateNpcResponsePort` | ✅ |
| Service | `CreateChatRoomService` (레거시), `SendMessageService` (`getOrCreateParticipant()` 자동 참여), `NpcReplyService` (@Async), `LoadChatHistoryService` | ✅ |
| Persistence (JPA) | `ChatRoomJpaEntity`, `ParticipantJpaEntity`, 각 Repository, `CommunicationPersistenceAdapter` | ✅ |
| Persistence (Cassandra) | `MessageKey`, `MessageCassandraEntity`, `MessageCassandraRepository`, `MessageCassandraPersistenceAdapter` | ✅ |
| NPC Adapter | `HardcodedNpcResponseAdapter` — Phase 5에서 AI로 교체 예정 | ✅ |
| Web Adapter | `ChatRoomController` (`POST /api/v1/chat/messages`), `SendMessageRequest`, `SendMessageResponse`, `MessageResponse` (senderId, senderType 필드) | ✅ |
| WebSocket | `ChatMessageHandler` (`/app/chat/village`), `StompSendMessageRequest` | ✅ |
| STOMP 인증 | `StompAuthChannelInterceptor` (ChannelInterceptor 기반 JWT, `global/config/`) | ✅ |
| Migration | V2 마을 공개 채팅방 시드, V3 레거시 정리 + id=1 고정, V4 participant UNIQUE 제약조건 | ✅ |
| Cucumber | GUEST 채팅 403 / 회원 NPC 채팅 Happy Path 시나리오 | ✅ |

**4/10 — AI 하네스 구축** ✅

| 항목 | 내용 |
|------|------|
| 스킬 개선 | `/코드리뷰`, `/전체리뷰`, `/MD리뷰` SKILL.md — tail 제거→Read 도구, Codex CLI 제약 명시 |
| AGENTS.md | Codex CLI용 프로젝트 리뷰 기준 설정 |
| 문서 교정 | CLAUDE.md Rule 4 경로 교정, coding.md 예외 패키지/ByXxx 수정, village API 명세 현황 반영 |
| 학습 노트 | `learning/00-ai-harness-claude-codex.md` — Claude Code·Codex 하네스 학습 노트 |
| 리뷰 결과 | `docs/reviews/2026-04-09/` — 전체리뷰·코드리뷰·MD리뷰 초회 실행 결과 저장 |

**4/11 — 서비스 책임 경계 정제** ✅

| 항목 | 내용 |
|------|------|
| MessageData 제거 | `SendMessageUseCase.Result`가 Message 도메인 직접 보유, 어댑터에서 DTO 변환 |
| IdempotencyGuard | `global/infra/idempotency/` — `isAlreadyProcessed()`/`markAsProcessed()` 캡슐화, Kafka 컨슈머 재사용 가능 |
| UserRegisteredEventConsumer | `UserRegisteredPayload` inner record 도입, handle() 4줄로 정제 |
| 학습 노트 | `learning/16-hexagonal-refactoring-responsibility.md` |

**4/11 — PR #1 머지** ✅
- `refactor/service-responsibility-boundary` → `main` 머지 완료

**4/13 — AI Native 하네스 점검·보강** ✅

| 항목 | 내용 |
|------|------|
| 스킬 추가 | `/동시성리뷰`, `/보안리뷰`, `/테스트리뷰`, `/wiki-lint` 추가 (총 7종) |
| 에이전트 추가 | `test-quality-agent`, `context-health-agent`, `job-market-agent`, `dependency-tracker-agent` 등 총 19개 |
| 크론 트리거 | research-agent, realtime-tech-agent, job-market-agent 3개 주간 크론 등록·정상 동작 확인 |
| 지식 베이스 확장 | `docs/knowledge/` — job-market/, dependencies/, realtime/ 카테고리 추가 |
| 인프라 설정 | docker-compose, application.yml, build.gradle.kts — Cassandra/Kafka/Redis 전체 설정 구성 |
| PostToolUse Hook | `settings.json` — git commit 성공 시 review-agent 리뷰 지시 |
| Stop Hook | `settings.local.json` — 비프음 + memory 저장/handover 확인 지시 |
| Wiki | `docs/wiki/` — Karpathy LLM Wiki 패턴 적용. 11페이지 + INDEX + log.md + `/wiki-lint` 스킬 |
| 에셋 리서치 | `docs/wiki/frontend/asset-guide.md` — 32x32 픽셀, Cainos/Cup Nooble 추천, Tiled 워크플로우 |
| learning-agent | `.claude/agents/learning-agent.md` — 트레이드오프·선택지 비교 학습 노트 전담 에이전트 (총 19개) |
| `/학습노트` 스킬 | `.claude/skills/학습노트/SKILL.md` — learning-agent 트리거 (총 8종) |
| Stop Hook 보강 | 세션 종료 시 학습노트 리마인드 추가 (memory + handover + 학습노트 3종 캡처) |

**4/13 — 서브에이전트 자동화 훅 구축 + PR #6 머지** ✅

| 항목 | 내용 |
|------|------|
| 훅 스크립트 | `.claude/hooks/` — Node.js 기반 4개 스크립트 |
| Stop hook | `stop-handover-check.js` — handover.md 미갱신 차단, 정확한 경로 매칭, porcelain 파싱 |
| UserPromptSubmit hook | `keyword-router.js` — 정규식 패턴 6개 (학습/PR/리서치/동시성/보안/리뷰대응) |
| PreToolUse hook | `pre-bash-guard.js` — execFileSync 인젝션 방지, Added 파일만 검출 |
| PostToolUse hook | `post-commit-review.js` — git commit regex 매칭, 별도 파일로 분리 (Windows 호환) |
| settings.json | 4개 훅 이벤트, `$CLAUDE_PROJECT_DIR` 절대 경로 |
| 서브에이전트 | `review-respond-agent.md` — PR 리뷰 코멘트 분석 및 수정 에이전트 |
| 스킬 | `/브랜치정리` — 머지 후 로컬+리모트 브랜치 정리 |
| PR | #6 머지 완료 (CodeRabbit/Codex 리뷰 3라운드 대응 후 squash merge) |

**4/13 — 백엔드 마을 공개 채팅 아키텍처 전환** 🔧 (uncommitted)

| 항목 | 내용 |
|------|------|
| 채팅 모델 변경 | per-NPC-click 채팅방 생성 → 마을 공개 채팅방 1개 고정 (id=1) |
| REST API | `POST /api/v1/chat-rooms` 제거 → `POST /api/v1/chat/messages` (body만 전송, chatRoomId는 서버 설정) |
| WebSocket | `/app/chat/village` (send), `/topic/chat/village` (subscribe) — 고정 destination |
| STOMP 인증 | `StompAuthChannelInterceptor` 추가 (ChannelInterceptor, CONNECT 프레임에서 JWT 추출) |
| MessageResponse | `senderId` (Long, nullable), `senderType` ("USER"/"NPC") 필드 추가, `fromUser()`/`fromNpc()` 팩토리 |
| 참여자 자동 생성 | `SendMessageService.getOrCreateParticipant()` — 첫 메시지 시 자동 참여, UNIQUE 제약으로 동시성 보호 |
| 입력 검증 | `SendMessageUseCase.Command` compact constructor에서 body 검증 (REST/STOMP 통합) |
| CORS | SecurityConfig `CorsConfigurationSource` + WebSocketConfig `setAllowedOrigins` — localhost:3000/3001 |
| Migration | V2 시드 → V3 레거시 정리 + id=1 고정 → V4 participant UNIQUE 제약조건 |

**4/13 — 프론트엔드 채팅 UI 구현** 🔧 (uncommitted)

| 항목 | 내용 |
|------|------|
| 레이아웃 변경 | 사이드바 방식 → ZEP/Gather.town 스타일 좌측 하단 오버레이, 게임 풀스크린 (Scale.RESIZE) |
| 채팅 컴포넌트 | ChatOverlay, ChatInput, ChatBubble, ChatMessageList, LoginPrompt (5개) |
| 상태 관리 | Zustand 스토어 — Phaser↔React 브릿지 (getState + subscribe 패턴) |
| STOMP 클라이언트 | `connectWithAuth()`, `subscribeToChatRoom('village')`, `sendVillageMessage()` |
| useStomp 훅 | 토큰 존재 시 자동 STOMP 연결 + `/topic/chat/village` 구독, cleanup 시 disconnect |
| 키보드 관리 | `document.activeElement` 기반 Phaser↔HTML 포커스 관리, Enter/Escape 토글 |
| CORS | SecurityConfig에 CorsConfigurationSource 빈 추가 (localhost:3000/3001) |
| 로그인 | LoginPrompt 팝업 — register 먼저 시도, 실패 시 login fallback |
| 블로그 에이전트 | blog-writer-agent.md — zlog 블로그 글 작성 전문, 최신 글 3개 스타일 학습, ai: true |
| 훅 업데이트 | keyword-router.js에 블로그 키워드 라우팅 추가 |
| 학습 노트 보강 | learning/21, 22에 YouTube 아티클 추가 |

**4/13 — CI/DX 5-레이어 품질 파이프라인 구축** ✅

| 항목 | 내용 |
|------|------|
| Style (백엔드) | Checkstyle — Naver Convention 기반, `maxWarnings=0`, 테스트 한글 메서드 억제 |
| Style (프론트엔드) | Prettier — Airbnb 기반, `endOfLine: lf` |
| Bugs (백엔드) | Error Prone + NullAway — 컴파일 타임 통합, warn 모드 |
| Bugs (프론트엔드) | ESLint — `typescript-eslint/strictTypeChecked` + `simple-import-sort` |
| Architecture | ArchUnit — Critical Rule #1, #2 + 레이어 의존 방향 검증 (5 rules) |
| Coverage | JaCoCo — 라인 커버리지 50% 이상 강제 |
| Process | CodeRabbit assertive + Husky + lint-staged + GitHub Actions CI |
| Version Catalog | `backend/gradle/libs.versions.toml` — 의존성 버전 중앙 관리 도입 |
| ADR | `docs/architecture/decisions/008-ci-dx-tool-stack.md` |
| 학습 노트 | `learning/18` Java 정적 분석 도구, `learning/19` Checkstyle 테스트 억제, `learning/20` 프론트엔드 ESLint |
| PR 상태 | `refactor/service-responsibility-boundary` → `main` PR 오픈 상태 (커밋 `88c80dd`, `fe4d81c`) |

---

## 핵심 설계 결정 요약

### 이벤트 흐름
```
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

### 채팅 흐름 (마을 공개 채팅)
```
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

### WebSocket 구조
- STOMP 엔드포인트: `/ws` (SockJS fallback, `localhost:3000,3001`만 허용)
- STOMP 인증: `StompAuthChannelInterceptor` — CONNECT 프레임 `Authorization` 헤더에서 JWT 추출, `Principal` 설정
- 클라이언트 → 서버: `/app/chat/village` (`@MessageMapping`, 고정)
- 서버 → 클라이언트: `/topic/chat/village` (Simple Broker, 고정)
- Phase 3: 인메모리 브로커. 스케일아웃 시 Redis Pub/Sub으로 교체 예정.
- 설정 키: `village.public-chat-room-id` (`application.yml`)

### Spring Boot 4.x 주의사항
- Kafka 자동설정: `spring-boot-kafka` 별도 의존성 필요
- Cassandra 프로퍼티: `spring.cassandra.*` (spring.data.cassandra 아님)
- Cassandra Testcontainers 모듈: `org.testcontainers:testcontainers-cassandra`
- Cassandra 테스트: keyspace를 `CqlSession`으로 직접 생성 후 `schema-action: create-if-not-exists` 적용
- Cassandra: `datacenter1`은 single-node 컨테이너의 기본 datacenter 이름
- Jackson: `tools.jackson.*` 패키지 (3.x)
- JSONB 매핑: `@JdbcTypeCode(SqlTypes.JSON)` 필요

---

**4/14 — Ollama LLM 연동 + 6개 모델 비교 테스트 + 프로덕션 전략 결정** ✅

| 항목 | 내용 |
|------|------|
| Ollama 연동 | `OllamaResponseAdapter` — RestClient 직접 구현, `@ConditionalOnProperty` 전환 |
| @Async 분리 | `AsyncConfig` + `NpcReplyService` — NPC 응답 비동기 생성 → WebSocket broadcast |
| 시스템 프롬프트 | "김순이 할머니" → "다정한 마을 주민" 변경, 한국어 전용 지시 추가 |
| 게스트 STOMP | `connectAnonymous()` — 토큰 없이 STOMP 연결 허용 (읽기 전용) |
| 6개 모델 테스트 | llama3.2, phi4-mini, gemma4, qwen2.5, exaone3.5, deepseek-r1 — 72회 테스트 |
| 보안 테스트 | 8개 공격 시나리오 (DAN 인젝션, 자해유도, 서버정보 탈취 등) |
| 최종 선택 | 개발: EXAONE 3.5 (LG AI, 한국어 최고), 프로덕션: 상용 API (GPT-4o-mini/Claude) |
| 맥락 유지 전략 | pgvector (PostgreSQL 벡터 확장) — Cassandra 원본 + pgvector 요약 벡터 |
| 테스트 코드 | `llm-test/run_test.mjs`, `llm-test/run_security_test.mjs` |
| 발표 자료 | `llm-test/presentation.md` (Marp) |
| 학습 노트 | `learning/28-llm-model-selection-and-production-strategy.md` |

**4/14~15 — Phase 5 pgvector 대화 맥락 + 요약 파이프라인 구현** ✅

| 항목 | 내용 |
|------|------|
| V6 마이그레이션 | `V6__add_embedding_to_conversation_memory.sql` — `embedding vector(768)` 컬럼 추가 |
| hibernate-vector 네이티브 타입 | `NpcConversationMemoryJpaEntity` — `@JdbcTypeCode(SqlTypes.VECTOR)` + `@Array(length = 768)`, `float[]` 자동 매핑 |
| pgvector 시맨틱 검색 | `NpcConversationMemoryJpaRepository.findSimilar()` — cosine distance (`<=>`) 네이티브 쿼리. 임베딩 없으면 최신순 fallback |
| Cassandra user_message 테이블 | `UserMessageCassandraEntity`, `UserMessageKey`, `UserMessageCassandraRepository` — (chatRoomId, userId) 파티션 비정규화 테이블. dual-write |
| 임베딩 생성 | `GenerateEmbeddingPort`, `OllamaEmbeddingAdapter` (nomic-embed-text 768차원), `HardcodedEmbeddingAdapter` (테스트용) |
| 대화 요약 파이프라인 | `ConversationSummaryEventConsumer` — Kafka `npc.conversation.summarize` 수신 → user_message 조회 → LLM 요약 → 임베딩 생성 → pgvector 저장 |
| 요약 트리거 | `SendMessageService.publishSummaryEventIfNeeded()` — 유저별 3회 메시지 누적 시 Outbox 발행 |
| NPC 맥락 주입 | `NpcReplyService` — 유저 메시지 임베딩 → `loadSimilar()` 검색 → `NpcConversationContext.conversationMemories` → 시스템 프롬프트 주입 |
| 멱등성 키 전환 | `KafkaEventIdExtractor` — Outbox `eventId` 헤더 우선, 없으면 key+offset fallback |
| NPC 응답 길이 제한 | `OllamaResponseAdapter` — `num_predict: 80` |
| Port 추가 | `GenerateEmbeddingPort`, `LoadConversationMemoryPort`, `SaveConversationMemoryPort`, `PublishConversationSummaryEventPort`, `LoadMessageHistoryPort`, `BroadcastChatMessagePort`, `SummarizeConversationPort` |

**4/15 — PR #8 리뷰 대응 (CodeRabbit + Codex)** ✅

| 항목 | 내용 |
|------|------|
| Kafka 재시도 | `KafkaConsumerConfig` — `DefaultErrorHandler` + `FixedBackOff(1초, 3회)`. 컨슈머에서 예외 rethrow |
| lint-staged | `package.json` — backend `*.java` 변경 시 `checkstyleMain/checkstyleTest` 자동 실행 |
| 토픽 상수화 | `ChatTopics.VILLAGE_CHAT` — 3곳 매직 스트링 제거 (Controller, Handler, BroadcastAdapter) |
| Port 리네임 | `loadRecentByUser` → `loadUserRecent`, `saveUserMessage` → `saveWithUser` (ByXxx/중복 컨벤션) |
| 로그 민감정보 | `NpcReplyService` — 대화 원문 INFO → DEBUG 전환 |
| RestClient timeout | `OllamaEmbeddingAdapter`, `OllamaResponseAdapter` — `JdkClientHttpRequestFactory` 적용 |
| AsyncConfig | 스레드풀 설정 `@Value`로 `application.yml` 분리 |
| 방어적 복사 | `NpcConversationContext` — `List.copyOf()` compact constructor |
| Cassandra 쿼리 | `UserMessageCassandraRepository` — `findTop10ByKey...` → `findRecent(limit)` 파라미터화 |
| Javadoc | `ChatRoomController` 중복 제거, `GenerateEmbeddingPort` 타입 불일치 수정 |
| userId 검증 | `UserRegisteredEventConsumer` — JSON 필드 null 체크 추가 |
| 학습노트 | 28번 코드블록 언어 지정 (MD040) |

---

## 완료된 최근 작업

**4/15~16 — 유저 위치 실시간 공유 + @멘션 + 타이핑** ✅ (PR #11 머지 완료)

| 항목 | 내용 |
|------|------|
| PositionHandler | `@MessageMapping("/village/position")` → `/topic/village/positions` broadcast |
| PositionDisconnectListener | STOMP 세션 종료 → `LEAVE` broadcast |
| PresenceNotifier | 접속자 목록 관리 + 주기적 presence broadcast |
| TypingHandler | `@MessageMapping("/village/typing")` → `/topic/village/typing` broadcast |
| @멘션 NPC | `MentionParser` + `LoadMentionablesService` + `LoadMentionablesUseCase` |
| 게스트 식별자 | JWT에 `guest-UUID` subject 추가. `AuthenticatedUser.displayId()` 메서드 |
| 프론트 | positionBridge (React↔Phaser 콜백), 100ms throttle 전송, lerp 보간 |
| 유저 구분 | 회원: 파란 원 "이웃", 게스트: 보라 원 "손님" |

**4/16 — CodeRabbit/Codex 리뷰 피드백 반영** ✅ (PR #11에 포함, 커밋 `6d4e086`)

| 항목 | 내용 |
|------|------|
| Critical 수정 | KafkaConsumerConfig recoverer ClassCastException 수정 — `record.value()` 캐스팅 제거, `record`를 직접 `ConsumerRecord`로 사용 |
| Critical 수정 | ConversationSummaryEventConsumer 멱등성 마킹 — 실패 시 `release()`로 Kafka 재시도 허용 |
| Critical 수정 | IdempotencyGuard — `REQUIRES_NEW` 실제 적용 (Javadoc과 구현 일치), `release()` 메서드 추가 |
| Enum 도입 | `PositionUserType` (MEMBER/GUEST/LEAVE) — PositionBroadcast, PositionHandler, PositionDisconnectListener 적용 |
| Enum 도입 | `LoadMentionablesUseCase.MentionableType` (NPC) — type String → Enum |
| 하드코딩 제거 | LoadMentionablesService — "마을 주민" → `npc.getDisplayName()` 도메인 값 사용 |
| 매직스트링 제거 | AuthenticatedUser — `GUEST_FALLBACK`, `MEMBER_PREFIX` 상수 추출 |
| Validation | PositionRequest — `@NotNull Double x, y` + PositionHandler `@Valid` 추가 |
| 설정 분리 | PositionHandler MAX_X/MAX_Y → `village.map.max-x/max-y` (application.yml) |
| 보안 | application-docker.yml — JWT secret `${JWT_SECRET:기본값}` 환경변수 주입 지원 |
| Nitpick | NpcReplyService 폴백 메시지 상수화, toMap merge function, AtomicLong ID, sendVillageMessage connected 가드 |
| 보류 | `ParseTokenPort` 위치 이동 (`global/security` → port 패키지) — 4개 파일 import 변경 필요, 별도 PR로 분리 예정 |

**4/16 — README 신규 기능 반영 + handover 업데이트** ✅ (PR #12 머지 완료)

| 항목 | 내용 |
|------|------|
| README | 실시간 위치 공유, @멘션 NPC, 타이핑 인디케이터 기능 추가 |
| 도메인 설명 | village 위치 공유, communication @멘션 반영 |
| handover | 다음 작업에 코드 분석/리팩토링 세션 추가 |

**4/15 — 문서-코드 정합성 전수 검사** ✅ (PR #10 머지 완료)

| 항목 | 내용 |
|------|------|
| 코드 | `LoadUserByEmailPort` → `LoadUserCredentialsPort` 리네임 |
| README | 전면 재작성 (Phase 0~5 현재 상태 반영) |
| 명세 | auth.md login 추가, overview.md 에러코드, websocket.md 단일 broadcast |
| Wiki | npc-conversation 구현완료 재작성, chat-architecture 비동기 NPC 반영, outbox 토픽 추가 |

**4/15 — 프론트엔드 UI 디자인 시스템 + 코드 품질 개선** ✅ (PR #9 머지 완료)

| 항목 | 내용 |
|------|------|
| 메타데이터 | Next.js metadata API + `next/font/google` (Gowun Dodum + IBM Plex Sans KR) |
| 디자인 시스템 | Tailwind v4 `@theme` 디자인 토큰 — cream/sand/bark/leaf 팔레트. 인라인 style 전면 제거 |
| 마을 씬 | 월드 2400x1600 + 카메라 팔로우 + Modern Exteriors 에셋 배경 (나무/벤치/가로등/텐트) |
| 캐릭터 | 플레이스홀더 원형 (걷기 에셋 미확보 — Modern Interiors는 실내 전용) |
| 채팅 UI | 크림 팔레트, 둥근 말풍선, 발신자별 색상, glass morphism |
| 코드 품질 | useResize 커스텀 훅, authenticate() 헬퍼, useSyncExternalStore |
| 에셋 | pixel-assets-all + frontend/public/assets/ gitignore 등록 (유료 에셋 보호) |
| 학습 노트 | `learning/32` 게임 엔진 비교, `learning/33` AI 평가, `learning/34` React 패턴 |

**4/15 — PR #8 레이스 컨디션 수정 + 리뷰 대응** ✅ (PR #8 머지 완료)

| 항목 | 내용 |
|------|------|
| CAS 수정 | `SendMessageService.publishSummaryEventIfNeeded()` — compareAndSet 루프로 이중 발행 방지 |
| 리뷰 에이전트 | concurrency-review-agent [CONC-7][CONC-8], review-agent 동시성 심화, AGENTS.md Rule #7 추가 |
| CodeRabbit 대응 | Dockerfile HEALTHCHECK, ChatInput SSR(useSyncExternalStore), VillageScene 키 캡처 누수, MD 린트 |

**4/15 — 웹 게임 엔진 비교 학습노트** ✅

| 항목 | 내용 |
|------|------|
| 기술 비교 | Phaser.js vs Three.js + 2D/3D 생태계 전체 비교 |
| 학습 노트 | `learning/32-web-2d-game-engine-comparison.md` |

**4/16 — 심층 면접 대비 기술 학습 가이드 생성** ✅

| 항목 | 내용 |
|------|------|
| 파일 | `docs/claude-deep-dive-study-guide.md` — 프로젝트 전체 코드 분석 기반 통합 학습 자료 |
| Part 1 | WebSocket/STOMP 실시간 통신 (프로토콜 근본 원리, 인증 이중 체계, 스케일아웃) |
| Part 2 | 헥사고날 아키텍처 + 이벤트 기반 시스템 (Port 설계, Outbox, 멱등성, 전체 이벤트 흐름) |
| Part 3 | 프론트엔드 아키텍처 (React 함수형, Phaser↔React 브릿지, 상태관리 3종, 위치 보간) |
| Part 4 | 데이터 인프라 (PostgreSQL + Cassandra dual-write, pgvector 시맨틱 검색, Kafka 이벤트) |
| 면접 Q&A | 주제별 면접 예상 질문 + 모범 답안 포함 |

---

## 다음 할 것 — 프로덕션 로드맵

### Step 1 — 상용 API 어댑터 (Phase 5 완성)

| 작업 | 상태 |
|------|------|
| ClaudeApiAdapter or OpenAiAdapter 구현 | 미착수 |
| `@ConditionalOnProperty`로 Ollama/상용 API 전환 | 미착수 |
| 위험 신호 감지 → 전문 상담 안내 | 미착수 |

### Step 2 — AWS 배포 (단일 서버)

| 작업 | 상태 |
|------|------|
| Docker 이미지 빌드 (backend + frontend) | 미착수 |
| AWS 인프라 구성 (EC2/ECS, RDS, ElastiCache 등) | 미착수 |
| CI/CD 파이프라인 고도화 (GitHub Actions → 자동 배포) | 미착수 |

### Step 3 — 1차 부하 테스트 (병목 찾기)

| 작업 | 상태 |
|------|------|
| k6 또는 Gatling으로 WebSocket 채팅 부하 테스트 | 미착수 |
| 병목 지점 식별 및 기록 | 미착수 |
| 현재 단일 서버 한계 수치 확보 | 미착수 |

### Step 4 — 스케일아웃 구조 전환

| 작업 | 상태 | 현재 상태 |
|------|------|----------|
| Redis 캐싱 도입 (유저/채팅방 조회) | 미착수 | Redis 설정만 있고 실제 사용 없음 |
| Redis Pub/Sub → WebSocket 브로커 교체 | 미착수 | Simple Broker (인메모리, 단일 서버) |
| 메시지 카운터 Redis INCR 전환 | 미착수 | ConcurrentHashMap (서버 재시작 시 초기화) |
| JWT 블랙리스트 (로그아웃) | 미착수 | stateless, 블랙리스트 없음 |
| 서버 2대 구성 | 미착수 | — |

### Step 5 — 2차 부하 테스트 (개선 효과 증명)

| 작업 | 상태 |
|------|------|
| 동일 시나리오로 재테스트 | 미착수 |
| Before/After 비교 기록 | 미착수 |
| 스케일아웃 효과 수치 확보 | 미착수 |

### Step 6 — 코드 분석 + Phase 4 직접 구현

| 작업 | 상태 |
|------|------|
| 백엔드 핵심 흐름 3개 코드 분석 (회원가입, 채팅, WebSocket 인증) | 미착수 |
| 면접 질문 5개 자기 말로 답 작성 | 미착수 |
| **Phase 4 (Economy) — AI 없이 직접 구현** | 미착수 |
| 프론트엔드 React 기초 학습 + 코드 분석 | 미착수 |

> Phase 4 핵심: 포인트 획득 → 아이템 구매 → 인벤토리. 낙관적 락, 멱등성 직접 설계.

### 잔여 작업

| 작업 | 상태 |
|------|------|
| ParseTokenPort 위치 이동 (global/security → port) | 별도 PR로 분리 |

---

### Phase 5 — AI NPC 고도화 (부분 완료)

| 작업 | 상태 |
|------|------|
| Ollama 로컬 LLM 연동 (EXAONE 3.5) | ✅ |
| NPC 응답 비동기 분리 (@Async) | ✅ |
| NPC 페르소나 (다정한 마을 주민) | ✅ |
| 6개 모델 비교 테스트 + 보안 테스트 | ✅ |
| 프로덕션 전략 결정 (상용 API) | ✅ |
| 대화 맥락 유지 — pgvector 테이블 설계 | ✅ |
| 대화 요약 파이프라인 (Kafka → LLM 요약 → pgvector) | ✅ |
| 상용 API 어댑터 | → Step 1로 이동 |
| 위험 신호 감지 → 전문 상담 안내 | → Step 1로 이동 |

> 상세: `docs/learning/22-ollama-local-llm-spring-integration.md`, `docs/learning/28-llm-model-selection-and-production-strategy.md`

---

### CI/DX 인프라 ✅

코드 품질 파이프라인 구축 완료. 상세 선정 이유는 `docs/architecture/decisions/008-ci-dx-tool-stack.md` 참조.

| 레이어 | 도구 | 상태 |
|--------|------|------|
| Style (백엔드) | **Checkstyle** — Naver Convention 기반, `maxWarnings=0`, 테스트 한글 메서드 억제 완료 | ✅ |
| Style (프론트엔드) | **Prettier** — Airbnb 기반, `endOfLine: lf` | ✅ |
| Bugs (백엔드) | **Error Prone + NullAway** — 컴파일 타임 통합, warn 모드 | ✅ |
| Bugs (프론트엔드) | **ESLint** — `typescript-eslint/strictTypeChecked` + `simple-import-sort` 적용 | ✅ |
| Architecture | **ArchUnit** — Critical Rule #1, #2 + 레이어 의존 방향 검증 동작 중 | ✅ |
| Coverage | **JaCoCo** — 라인 커버리지 50% 이상 강제 | ✅ |
| Process | **CodeRabbit** — assertive 프로필, 13개 `path_instructions`, tools 연동 | ✅ |
| Process | **Husky + lint-staged** — pre-commit: 프론트 Prettier+ESLint + 백엔드 Checkstyle 자동 실행 | ✅ |
| Process | **GitHub Actions CI** — push/PR 시 Gradle 빌드 + 테스트 자동 실행 | ✅ |

**미세팅 (필요 시 추가):**

| 툴 | 역할 |
|----|------|
| **Branch Protection** | main 직접 push 차단, CI 통과 필수 |
| **Dependabot** | 취약 의존성 자동 PR |

---

## 현재 기술 스택 버전

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
| Zustand | (채팅 상태 관리) |

---

## 패키지 구조 현황

```
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
│       └── in/websocket/ ← PositionHandler, PositionDisconnectListener, PresenceNotifier, TypingHandler, PositionUserType(enum)
└── communication/
    ├── domain/          ← ChatRoom, Participant, Message, MentionParser, enum 5종 (ChatRoomType에 PUBLIC 추가)
    ├── error/           ← CommunicationErrorCode, *Exception 4종 (InvalidMessageBodyException 추가)
    ├── application/
    │   ├── port/in/ (UseCase 4종 — CreateChatRoomUseCase 레거시, SendMessageUseCase, LoadChatHistoryUseCase, LoadMentionablesUseCase)
    │   ├── port/out/ (Port 12종: Save/Load/Generate 계열 + Broadcast/Publish/Summarize)
    │   └── service/ (Service 5종 — SendMessageService, NpcReplyService, LoadChatHistoryService, LoadMentionablesService, CreateChatRoomService)
    └── adapter/
        ├── in/
        │   ├── web/ (ChatRoomController POST /api/v1/chat/messages + DTO 4종)
        │   ├── websocket/ (ChatMessageHandler /app/chat/village, StompSendMessageRequest)
        │   └── messaging/ (ConversationSummaryEventConsumer)
        └── out/
            ├── persistence/ (JPA 4종 + Cassandra 6종 + ConversationMemory/ConversationSummaryOutbox)
            └── npc/ (Ollama*Adapter 3종 + Hardcoded*Adapter 3종 + OllamaProperties)
```

---

## TestAdapter 구조

```
HealthCheckSteps / IdentitySteps / VillageSteps / CommunicationSteps  ← 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter / AuthTestAdapter / VillageTestAdapter / ChatTestAdapter  ← URL, 폴링 로직
    ↓
TestAdapter              ← RestClient GET/POST, 인증 헤더
    ↓
ScenarioContext          ← lastResponse, currentAccessToken, currentEmail, currentChatRoomId
```

---

## 추가된 컨벤션 / 학습 문서

| 문서 | 추가 내용 |
|------|----------|
| `coding.md` | Port 메서드 네이밍: Port 이름에 엔티티 선언됨, 메서드는 액션만 (`load`, `save`), `ByXxx` 금지 |
| `learning/12` | Spring Boot 4.x 모듈형 자동 구성 — Flyway/Kafka/Cassandra 누락 사례 |
| `learning/13` | Global AlertPort 패턴 — 운영 알람 vs 유저 알림 분리 |
| `learning/14` | Cassandra + Spring Boot 4.x 설정 함정 4가지 |
| `learning/15` | WebSocket/STOMP 동작 원리와 프로젝트 구현 딥다이브 |
| `decisions/003` | Transactional Outbox + Kafka 이벤트 흐름 |
| `decisions/004` | Global AlertPort 설계 |
| `decisions/005` | 게스트 마을 상태 정책 |
| `decisions/006` | Cassandra 메시지 저장 선택 이유 |
| `decisions/007` | WebSocket Simple Broker 선택 및 스케일아웃 교체 계획 |
| `specs/api/` | 도메인별 REST API 명세 (auth, village, communication) |
| `specs/websocket.md` | STOMP 구조, REST↔WebSocket 관계 |
| `specs/event.md` | user.registered Kafka 이벤트 명세 |
| `AGENTS.md` | Codex CLI용 컨벤션 설정 — Critical Rules + 전체 체크리스트 (coding.md 기반) |
| `docs/reviews/` | `/코드리뷰`, `/전체리뷰` 커맨드 실행 시 날짜/시간별 리뷰 결과 자동 저장 |
| `.claude/skills/코드리뷰/SKILL.md` | Claude Code 슬래시 커맨드 — uncommitted 변경사항 Codex 리뷰 |
| `.claude/skills/전체리뷰/SKILL.md` | Claude Code 슬래시 커맨드 — 전체 프로젝트 Codex 리뷰 |
| `.claude/skills/MD리뷰/SKILL.md` | Claude Code 슬래시 커맨드 — 문서 정합성 + 코드↔명세 교차검증 |
| `.claude/skills/동시성리뷰/SKILL.md` | Claude Code 슬래시 커맨드 — 동시성·락·N+1·Kafka 전문 검증 |
| `.claude/skills/보안리뷰/SKILL.md` | Claude Code 슬래시 커맨드 — Security·OWASP Top 10 전문 검증 |
| `.claude/skills/테스트리뷰/SKILL.md` | Claude Code 슬래시 커맨드 — 테스트 품질 전문 검증 |
| `learning/00` | Claude Code·Codex 하네스 학습 노트 |
| `learning/16` | 헥사고날 리팩토링 — 서비스 책임 경계 정제 |
| `global/infra/idempotency/IdempotencyGuard` | Kafka 컨슈머 멱등성 처리 공용 컴포넌트 |
| `learning/17` | Cassandra 스키마 관리 전략 |
| `learning/18` | Java 정적 분석 도구 (Checkstyle, Error Prone, NullAway) 비교·설정 |
| `learning/19` | Checkstyle 테스트 한글 메서드 억제 전략 |
| `learning/20` | 프론트엔드 ESLint strictTypeChecked + Prettier 컨벤션 |
| `decisions/008` | CI/DX 5-레이어 도구 스택 선정 (ADR) |
| `.github/workflows/ci.yml` | GitHub Actions CI — Gradle 빌드 + 테스트 자동 실행 |
| `.coderabbit.yaml` | CodeRabbit AI 코드 리뷰 설정 (assertive, 13개 path_instructions) |
| `.husky/pre-commit` | pre-commit hook — Prettier + ESLint 자동 실행 |
| `backend/config/checkstyle/` | Checkstyle 설정 (checkstyle.xml, suppressions.xml) |
| `backend/gradle/libs.versions.toml` | Gradle Version Catalog — 의존성 버전 중앙 관리 |
| `backend/src/test/.../HexagonalArchitectureTest.java` | ArchUnit 헥사고날 아키텍처 검증 테스트 (5 rules) |
| `.claude/hooks/stop-handover-check.js` | Stop hook — 세션 종료 시 handover.md 미갱신 차단 |
| `.claude/hooks/keyword-router.js` | UserPromptSubmit hook — 키워드 → 에이전트 자동 라우팅 (5개 카테고리) |
| `.claude/hooks/pre-bash-guard.js` | PreToolUse hook — git commit docs 경고 + gh pr create 규칙 차단 |

---

## 참고 문서 위치

| 필요할 때 | 파일 |
|-----------|------|
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 패키지 구조 상세 | `docs/architecture/package-structure.md` |
| ERD | `docs/architecture/erd.md` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| 구현 로드맵 | `docs/planning/phases.md` |
