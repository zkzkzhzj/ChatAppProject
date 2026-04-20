# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> 현재 상태와 다음 할 일이 여기 있다.

---

## 현재 상태 (2026-04-21 기준, 17차 업데이트)

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

**4/16 — OpenAI API 어댑터 + 설정 프로필 분리 + 보안 강화** 🔄 (PR #13 오픈, 머지 시 완료 처리)

| 항목 | 내용 |
|------|------|
| OpenAI 어댑터 | `OpenAiResponseAdapter`, `OpenAiEmbeddingAdapter`, `OpenAiSummarizeAdapter` — GPT-4o-mini + text-embedding-3-small (768차원) |
| system-prompt 공통화 | `@Value("${npc.system-prompt}")` — Ollama/OpenAI 중복 제거 |
| 설정 프로필 분리 | application.yml 최소화 (shoe-auction 패턴), local/prod gitignore 처리 |
| 삭제 | application-docker.yml, docker-compose.prod.yml — .env 기반 통합 |
| Docker | ollama 프로필 분리 (`COMPOSE_PROFILES=ollama`), JWT 기본값 추가 |
| 버그 수정 | MentionParser `CASE_INSENSITIVE` (프론트 NPC: 대문자 호환) |
| CLAUDE.md | Workflow 승인 게이트 추가 |
| JaCoCo | 50% → 40% 일시 조정 (OpenAI 어댑터 테스트 추가 후 복원 예정) |

### 현재 설정 파일 구조

```text
application.yml              ← Git 공개. 공통 최소 (앱 이름, JPA, 서버 포트)
application-local.yml        ← gitignore. 로컬 전체 (DB, Kafka, JWT, NPC, swagger 열림)
application-prod.yml         ← gitignore. 프로덕션 전체 (환경변수 필수, swagger 닫힘, INFO 로그)
application-test.yml         ← Git 공개. 테스트 (Testcontainers + 더미 시크릿)
application-local.example.yml ← 삭제됨. 보안상 local 설정 전체 노출 방지
.env.example                 ← Git 공개. 환경변수 템플릿
.env                         ← gitignore. 실제 시크릿
docker-compose.yml           ← Git 공개. 로컬/프로덕션 공용 (환경 차이는 .env로)
```

---

**4/17 — AWS 배포 준비: CORS 외부화 + 메모리 튜닝** ✅ (커밋 `8865255` 푸시 완료)

| 항목 | 내용 |
|------|------|
| CORS 외부화 | `SecurityConfig`, `WebSocketConfig` — `localhost` 하드코딩 → `@Value("${app.cors.allowed-origins}")` 프로퍼티 주입 |
| 메모리 튜닝 | docker-compose.yml — `CASSANDRA_MAX_HEAP`, `KAFKA_HEAP_OPTS`, `JAVA_TOOL_OPTIONS` 환경변수 추가 (t3.medium 4GB 대응) |
| 설정 추가 | application-test.yml — `app.cors.allowed-origins` 추가 |
| .env.example | CORS 허용 오리진 + JVM 메모리 튜닝 가이드 추가 |
| 검증 | `compileJava` + `test` + `checkstyleMain` 전부 통과 |

**4/19 — 발표 리뷰 피드백: NPC 대화 엔지니어링 방향 정리** 🔧 (구현 미착수, 기록만)

| 항목 | 내용 |
|------|------|
| 맥락 | 발표 후 리뷰 — "NPC 대화가 GPT 프록시 수준이라 중간 서버가 있는 이유가 약하다" |
| 리뷰 키워드 | 디바운스, 단발성 타자, 동시성, 메시지 요약, 메시지 검증/커스텀, "모르는 것을 잘 이야기하기" |
| 학습 노트 | `docs/learning/36-npc-conversation-engineering-patterns.md` |
| 정리한 4개 축 | A) 입력 측(디바운스·배칭·동시성 3전략) B) 컨텍스트 측(요약·페르소나 주입) C) 검증/필터 측(사전/사후·"모르는 것" 표현) D) 캐싱 측(pgvector semantic cache) |
| 추후 처리란 | 우선순위 결정 3건 + 설계 결정 9건 체크리스트로 보존 — 다음 세션에서 바로 꺼내쓸 수 있게 |
| 현재 상태 | 구현 미착수. 유저가 별도 작업을 우선 진행할 예정 |

**4/21 — 12-factor Config 이관 + deploy/ 디렉토리 분리** 🔧 (PR 진행 중)

| 항목 | 내용 |
|------|------|
| 맥락 | CD 첫 실전 배포에서 "이미지 안에 application-prod.yml 없음" 문제 발견 |
| 근본 원인 | 빌드 위치 전환 (EC2 → GHA Runner)으로 gitignored 파일 접근 불가 |
| 해결 방향 | Option B — 모든 설정을 env var로 이관 (12-factor) + 접근 2 (deploy/ 디렉토리 분리) |
| application.yml | 단일 통합 파일. 모든 값이 `${ENV_VAR:로컬_기본값}` 형태 |
| 삭제 | application-prod.yml, application-local.yml |
| docker-compose.yml | deploy/로 이동. Spring 표준 env var (SPRING_DATASOURCE_URL 등) 전면 사용 |
| scripts/deploy.sh | deploy/scripts/로 이동. DEPLOY_DIR 추가 |
| .github/workflows/deploy.yml | paths-filter + SSM 명령 경로를 deploy/*로 수정 |
| 학습 노트 | `docs/learning/38-env-var-config-migration.md` |
| EC2 후속 작업 | 머지 후 1회: `rm backend/src/main/resources/application-{prod,local}.yml`, deploy/.env 생성 |

**4/20 — CD 파이프라인 설계·구현 (Week 7 Step A)** ✅ (Phase 1·2 완료, Phase 3 테스트 대기)

| 항목 | 내용 |
|------|------|
| 맥락 | Week 7 Assetization 스프린트. 부하 테스트 사이클 단축 위해 CD 우선 |
| 옵션 비교 | 8개 옵션 → **B(GHCR) + E(SSM) + paths-filter + OIDC** 채택 |
| 인증 전환 | Access Key → **GitHub Actions OIDC Federation**. 장기 시크릿 제거 |
| 태깅 전략 | sha + latest 이중 태그. 롤백은 sha 재지정 |
| 조건부 빌드 | dorny/paths-filter로 backend/frontend 변경 감지. docs만 바뀌면 전체 스킵 |
| 배포 전략 | Recreate(2~5초 다운타임). `--no-deps --no-build`로 stateful 보호 |
| 롤백 | 헬스체크 실패 시 이전 sha 태그로 자동 복구 |
| 헬스체크 | 백엔드(`/actuator/health`) + 프론트엔드(`:3000/`) 양쪽 검증 |
| 학습 노트 | `docs/learning/37-cd-pipeline-design.md` — 15개 섹션, 설계+구현 통합 |

### Phase 1 — AWS 콘솔 + GitHub 준비 ✅ 완료

| # | 작업 | 상태 |
|---|------|:-:|
| 1 | Elastic IP 할당 + Cloudflare DNS 갱신 | ✅ |
| 2 | EC2 IAM Role (`AmazonSSMManagedInstanceCore`) | ✅ |
| 3 | SSM Agent Online 확인 | ✅ |
| 4 | OIDC Identity Provider + `GitHubActionsDeployRole` + 정책 | ✅ |
| 5 | GHCR Classic PAT (`read:packages`) | ✅ |
| 6 | GitHub Secrets 4개: `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `EC2_INSTANCE_ID`, `GHCR_PAT` | ✅ |
| 7 | EC2에서 `docker login ghcr.io` | ✅ |

### Phase 2 — 코드 작성 ✅ 완료

| 파일 | 변경 |
|------|------|
| `docker-compose.yml` | app/frontend에 `image: ghcr.io/zkzkzhzj/gohyang-app:${APP_TAG:-latest}` 추가 (build 블록 유지) |
| `.env.example` | `APP_TAG`, `FRONTEND_TAG` 주석 추가 |
| `scripts/deploy.sh` | 신규. 이전 태그 기록 → git reset → pull → up → 양쪽 헬스체크 → 실패 시 자동 롤백 |
| `.github/workflows/deploy.yml` | 신규. OIDC + paths-filter + 조건부 빌드 + SSM SendCommand + 10분 폴링 |

### Phase 3 — 실전 검증 (다음 세션 또는 PR 머지 후)

| # | 작업 | 담당 |
|---|------|------|
| 1 | 이 PR을 main에 머지 | 유저 |
| 2 | EC2 Session Manager로 접속 → `cd ChatAppProject && git reset --hard origin/main && chmod +x scripts/deploy.sh` | 유저 |
| 3 | GitHub Actions → CD → **Run workflow** → `force_rebuild: true` 체크 → Run | 유저 |
| 4 | Actions 로그 관찰 (빌드 시간·배포 시간·실패 여부) | 유저 + 나 |
| 5 | `https://ghworld.co/actuator/health` 응답 확인 + 브라우저 접속 | 유저 |
| 6 | backend만 변경하는 테스트 커밋 → frontend 빌드 스킵 확인 | 나 |
| 7 | docs/*.md만 변경하는 테스트 커밋 → 배포 자체 스킵 확인 | 나 |
| 8 | 헬스체크 고의 실패 → 자동 롤백 검증 | 나 |
| 9 | 포트 22 Security Group 제거 (SSM Session Manager 전환) | 유저 |
| 10 | 실측치로 `learning/37` 섹션 14.10, 14.11 업데이트 | 나 |

### 주의할 점 (Phase 3 시작 전 읽기)

- **첫 배포는 반드시 `force_rebuild=true`**. 그래야 sha + latest 태그가 GHCR에 처음 생성됨
- **`git reset --hard`가 deploy.sh에 포함**됨 → EC2에서 수동 디버깅 중이던 변경은 날아감 (의도된 동작, 결정적 상태 보장)
- **docker-compose 이미지 모드**: 로컬에서 `docker compose up`은 build 블록을 사용. CD는 image 블록 + pull 사용. 두 경로 공존
- **마이그레이션 호환성**: 롤백 시 DB 스키마는 복구되지 않으므로 모든 Flyway 마이그레이션은 **backward-compatible**하게 작성 유지

---

**4/17 — AWS EC2 서울 리전 배포 + 도메인 연결** ✅

| 항목 | 내용 |
|------|------|
| EC2 | ap-northeast-2 (서울), t3.medium (4GB), Ubuntu 24.04, 20GB gp3 |
| Docker | Docker 29.4.0 + Compose v5.1.3 설치, ubuntu 유저 docker 그룹 추가 |
| 배포 | 6개 컨테이너 전부 가동 (postgres, redis, cassandra, kafka, app, frontend) |
| Cassandra | keyspace 수동 생성 필요 (`CREATE KEYSPACE IF NOT EXISTS gohyang`) |
| NPC | OpenAI API (GPT-4o-mini) 전환 완료 |
| nginx | 호스트에 직접 설치, 리버스 프록시 — `/api/` → 8080, `/ws` → WebSocket, `/` → 3000 |
| 도메인 | `ghworld.co` — Cloudflare DNS A 레코드 (@, www), Proxied 모드 |
| SSL | Cloudflare Flexible SSL — 서버 인증서 불필요 |
| 비용 | AWS Budgets 월 $40 알림 설정 |
| 에셋 | `frontend/public/assets/` 8개 파일 scp로 업로드 후 프론트 리빌드 |
| 학습노트 | `docs/learning/35-aws-ec2-first-deployment.md` |
| application-local.yml | PR #13에서 삭제된 것 발견 → 복원 (gitignore, CORS 포함) |

---

## 다음 할 것 — 프로덕션 로드맵

---

### 🔥 [최우선] Week 7 스프린트 — Assetization (2026-04-20 ~ 04-26)

> **원칙: "솔루션이 아니라 증거로 말한다."**
> Week 7 블로그·README·영상은 Week 6 부하 테스트 데이터가 전제다. 없으면 쓸 수 없다.
> 따라서 Week 6 미완료(CD + 부하 테스트 + 모니터링)를 먼저 채우고, 그 데이터로 Week 7 산출물을 만든다.

**Week 6 미완료 과제 (선행 필수)**
- Task 2: CI/CD 자동화 — 현재 CI만 있고 CD는 수동 SSH (`git pull` + `docker compose up`)
- Task 3: 부하 테스트 + 모니터링 — k6/Prometheus/Grafana 없음

**Week 7 과제**
- Task 0: 『일의 감각』 에세이 1,000자 (성실한 왜 / 빼는 선택 / 오너의 고민 중 1개)
- Task 1: 데이터 기반 기술 블로그 — **문제 → 증거(그래프/로그) → 대안 비교 → Before/After 수치** 4단 구조
- Task 2: README 리브랜딩 — 배너, 인프라 도식, 3분 데모 영상, 성능 그래프
- Task 3: 이력서 초안 (Problem-Action-Result)
- Task 4 (선택): Post-Mortem 리포트 (실제 장애 유발 → 5 Whys → Timeline → Action Item)

#### 실행 순서 (역산: Week 7 블로그를 증명하기 위해 필요한 뎁스)

| Step | 목표 | 산출물 | 상태 |
|------|------|--------|------|
| **A. CD 자동화** | main push → EC2 자동 반영 | `.github/workflows/deploy.yml` + deploy.sh + 성공 로그 | 🔧 설계·구현 완료, Phase 3 실전 테스트 대기 |
| **B. 관측 가능성** | Actuator + Micrometer → Prometheus → Grafana | 대시보드 (JVM/Latency/DB Pool/Kafka Lag/WS 세션) | 미착수 |
| **C. 부하 테스트 + 병목 식별** | k6로 채팅+WebSocket 시나리오 VUser 10→500 | k6 리포트 + Grafana 캡처 + 병목 진단 | 미착수 |
| **D. 기술 블로그 (Task 1)** | Step C에서 찾은 병목 1개 집중 서사 | Velog/Tistory 글 + LinkedIn 공유 | 미착수 |
| **E. README + 영상 + 에세이 + 이력서** | Week 7 나머지 산출물 | README, 3분 영상, 에세이, 이력서 초안 | 미착수 |
| (선택) F. Post-Mortem | Step C에서 실제 장애 재현 → 리포트 | Post-Mortem 문서 | 미착수 |

#### 유력 병목 후보 (블로그 소재 후보)

1. **NPC 응답 파이프라인** — 임베딩 → pgvector 검색 → LLM → broadcast (외부 호출 직렬화)
2. **WebSocket Simple Broker** — 단일 서버·인메모리, 동접 증가 시 1차 병목
3. **Cassandra dual-write** (message + user_message) — 쓰기 증폭
4. **Outbox @Scheduled 1s polling** — 요약 이벤트 지연 + DB 부하
5. **메시지 카운터 `ConcurrentHashMap`** — 서버 재시작 시 초기화, 스케일아웃 시 깨짐

#### 결정 필요 항목

- [ ] 모니터링 스택 호스팅 위치 — EC2(t3.medium 4GB에 추가) vs 로컬(캡처만) vs t3.large 일시 확대
- [ ] 부하 테스트 타겟 — 채팅(+NPC) vs 회원가입 Outbox vs pgvector 검색 (현재는 채팅 유력)
- [ ] 블로그 플랫폼 — Velog / Tistory / zlog
- [ ] Post-Mortem 수행 여부 (선택이지만 서사 강도 큰 차이)

> 상세 맥락 / 대안 분석은 이 스프린트 착수 시점의 대화 참조. Week 6 과제 원문 스펙은 그릿모먼츠 Week 6 과제 문서.

---

### Step 1 — 상용 API 어댑터 (Phase 5 완성) ✅ (PR #13)

| 작업 | 상태 |
|------|------|
| OpenAI API 어댑터 3종 (Response, Embedding, Summarize) | ✅ GPT-4o-mini + text-embedding-3-small |
| `@ConditionalOnProperty`로 hardcoded/ollama/openai 전환 | ✅ `NPC_ADAPTER` 환경변수 |
| system-prompt 공통화 (중복 제거) | ✅ `@Value("${npc.system-prompt}")` |
| MentionParser 대소문자 호환 수정 | ✅ `CASE_INSENSITIVE` |
| 설정 프로필 분리 (application.yml 최소화) | ✅ local/prod/test 분리, gitignore 처리 |
| docker-compose ollama 프로필 분리 | ✅ `COMPOSE_PROFILES=ollama` |
| docker-compose.prod.yml 삭제, .env 통합 | ✅ |
| 위험 신호 감지 → 전문 상담 안내 | 미착수 |

### Step 2 — AWS 배포 (단일 서버) ✅

| 작업 | 상태 |
|------|------|
| CORS 외부화 (`app.cors.allowed-origins` 프로퍼티) | ✅ |
| docker-compose 메모리 튜닝 (4GB 서버 대응) | ✅ |
| EC2 인스턴스 생성 (t3.medium, 서울 리전) | ✅ |
| Docker + Docker Compose 설치 | ✅ |
| repo 클론 + `.env` + `application-prod.yml` 생성 | ✅ |
| `SPRING_PROFILES_ACTIVE=prod` docker compose up 확인 | ✅ |
| Security Group 설정 (22/80/443/3000/8080) | ✅ |
| nginx 리버스 프록시 (포트 없이 접속) | ✅ |
| 도메인 연결 (ghworld.co + Cloudflare SSL) | ✅ |
| OpenAI NPC 전환 | ✅ |

### Step 3 — 1차 부하 테스트 (병목 찾기) → **🔥 Week 7 스프린트 Step B/C로 흡수**

| 작업 | 상태 |
|------|------|
| k6 또는 Gatling으로 WebSocket 채팅 부하 테스트 | 미착수 (Week 7 Step C) |
| 병목 지점 식별 및 기록 | 미착수 (Week 7 Step C) |
| 현재 단일 서버 한계 수치 확보 | 미착수 (Week 7 Step C) |

### Step 4 — 스케일아웃 구조 전환

| 작업 | 상태 | 현재 상태 |
|------|------|----------|
| Redis 캐싱 도입 (유저/채팅방 조회) | 미착수 | Redis 설정만 있고 실제 사용 없음 |
| Redis Pub/Sub → WebSocket 브로커 교체 | 미착수 | Simple Broker (인메모리, 단일 서버) |
| 메시지 카운터 Redis INCR 전환 | 미착수 | ConcurrentHashMap (서버 재시작 시 초기화) |
| JWT 블랙리스트 (로그아웃) | 미착수 | stateless, 블랙리스트 없음 |
| 서버 2대 구성 | 미착수 | — |

### Step 5 — 2차 부하 테스트 (개선 효과 증명) → **🔥 Week 7 스프린트 Step D의 Before/After 근거로 흡수**

| 작업 | 상태 |
|------|------|
| 동일 시나리오로 재테스트 | 미착수 (Week 7 Step D의 After 데이터) |
| Before/After 비교 기록 | 미착수 (블로그 Task 1 핵심 증거) |
| 스케일아웃 효과 수치 확보 | 미착수 |

### Step 6 — 코드 분석 + Phase 4 직접 구현

| 작업 | 상태 |
|------|------|
| 백엔드 핵심 흐름 3개 코드 분석 (회원가입, 채팅, WebSocket 인증) | 미착수 |
| 면접 질문 5개 자기 말로 답 작성 | 미착수 |
| **Phase 4 (Economy) — AI 없이 직접 구현** | 미착수 |
| 프론트엔드 React 기초 학습 + 코드 분석 | 미착수 |

> Phase 4 핵심: 포인트 획득 → 아이템 구매 → 인벤토리. 낙관적 락, 멱등성 직접 설계.

### 번외 — MVP 피드백 대응

> 부하 테스트/스케일아웃과 별개로 진행. 피드백 상세: `docs/feedback/README.md`

| 작업 | 상태 | 참조 |
|------|------|------|
| 모바일 터치 이동 지원 | 미착수 | F-1 |
| 채팅 포커스 이탈 시 UI 버그 수정 | 미착수 | F-2 |
| 맥북 IME 마지막 단어 반복 입력 수정 | 미착수 | F-3 |
| 회원가입 고도화 (닉네임 + 이름 표시) | 미착수 | F-5 |
| Elastic IP 할당 (IP 고정) | 미착수 | T-5 |
| CI/CD 파이프라인 구축 | 미착수 | T-2 |

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
| Coverage | **JaCoCo** — 라인 커버리지 40% 이상 (임시, OpenAI 어댑터 테스트 보강 후 50% 복원 예정) | ✅ |
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
