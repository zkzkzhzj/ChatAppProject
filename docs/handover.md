# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> 현재 상태와 다음 할 일이 여기 있다.

---

## 현재 상태 (2026-04-08 기준, 4차 업데이트)

### ✅ Happy Path 완료 (Phase 0 ~ Phase 3)

모든 핵심 시나리오가 Cucumber로 검증됐다.

```
GUEST 토큰 발급 → NPC 채팅 시도 → 403
이메일 회원가입 → Kafka → 캐릭터/공간 자동 생성
NPC 채팅방 생성 → 메시지 전송 → NPC 하드코딩 응답 반환
```

---

### 완료된 것

**Phase 0 — Foundation** ✅
- Flyway 의존성 추가, `V1__initial_schema.sql` (전체 ERD 기반)
- 테스트 `ddl-auto: validate` 전환

**Phase 1 — Identity** ✅

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Domain | `User`, `UserType`(→global/security), `LocalAuthCredentials`, `IdentityErrorCode`, `DuplicateEmailException` | ✅ |
| Port (in) | `RegisterUserUseCase`, `IssueGuestTokenUseCase` | ✅ |
| Port (out) | `SaveUserPort`, `CheckEmailDuplicatePort`, `IssueTokenPort`, `SaveOutboxEventPort` | ✅ |
| Service | `RegisterUserService`(Outbox 포함), `IssueGuestTokenService` | ✅ |
| Persistence | `UserJpaEntity`, `UserLocalAuthJpaEntity`, `UserJpaRepository`, `UserLocalAuthJpaRepository`, `UserPersistenceAdapter`, `OutboxPersistenceAdapter` | ✅ |
| Security | `JwtProvider`(Optional\<AuthenticatedUser\>), `JwtFilter`, `SecurityConfig`, `SecurityProperties` | ✅ |
| Web Adapter | `AuthController`, `RegisterRequest`, `AuthResponse` | ✅ |
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
| Domain | `Character`, `Space`, `SpaceTheme`, `VillageErrorCode`, 예외 3종 | ✅ |
| Port (in) | `InitializeUserVillageUseCase`, `GetMyCharacterUseCase`, `GetMySpaceUseCase` | ✅ |
| Port (out) | `SaveCharacterPort`, `LoadCharacterPort`, `SaveSpacePort`, `LoadSpacePort` | ✅ |
| Service | `InitializeUserVillageService`, `GetMyCharacterService`, `GetMySpaceService` | ✅ |
| Persistence | `CharacterJpaEntity`, `SpaceJpaEntity`, `CharacterJpaRepository`, `SpaceJpaRepository`, `VillagePersistenceAdapter` | ✅ |
| Messaging | `UserRegisteredEventConsumer`(Kafka, 멱등성 보장) | ✅ |
| Web Adapter | `VillageController`, `CharacterResponse`, `SpaceResponse` | ✅ |
| Cucumber | 회원가입 → Kafka → 캐릭터/공간 생성 비동기 시나리오 | ✅ |
| Cucumber | 게스트 캐릭터 조회 200 / 공간 조회 403 시나리오 | ✅ |

**Phase 3 — Communication** ✅

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Domain | `ChatRoom`, `Participant`, `Message`, enum 5종, `CommunicationErrorCode`, 예외 3종 | ✅ |
| Port (in) | `CreateChatRoomUseCase`, `SendMessageUseCase` | ✅ |
| Port (out) | `SaveChatRoomPort`, `SaveParticipantPort`, `LoadParticipantPort`, `SaveMessagePort`, `GenerateNpcResponsePort` | ✅ |
| Service | `CreateChatRoomService`, `SendMessageService` | ✅ |
| Persistence (JPA) | `ChatRoomJpaEntity`, `ParticipantJpaEntity`, 각 Repository, `CommunicationPersistenceAdapter` | ✅ |
| Persistence (Cassandra) | `MessageKey`, `MessageCassandraEntity`, `MessageCassandraRepository`, `MessageCassandraPersistenceAdapter` | ✅ |
| NPC Adapter | `HardcodedNpcResponseAdapter` — Phase 5에서 AI로 교체 예정 | ✅ |
| Web Adapter | `ChatRoomController`, `CreateChatRoomRequest`, `ChatRoomResponse`, `SendMessageRequest`, `SendMessageResponse`, `MessageResponse` | ✅ |
| WebSocket | `ChatMessageHandler`, `StompSendMessageRequest` | ✅ |
| Cucumber | GUEST 채팅 403 / 회원 NPC 채팅 Happy Path 시나리오 | ✅ |

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
- `POST /api/v1/chat-rooms`: 게스트 → `GuestChatNotAllowedException` (403)

### 채팅 흐름
```
POST /api/v1/chat-rooms
  → ChatRoom (NPC 타입) 생성
  → Participant(HOST, 유저) + Participant(NPC) 생성

POST /api/v1/chat-rooms/{roomId}/messages
  → 유저 참여자 확인
  → Message(유저) → Cassandra 저장
  → HardcodedNpcResponseAdapter.generate()
  → Message(NPC) → Cassandra 저장
  → WebSocket /topic/chat/{roomId} broadcast
  → REST 응답: {userMessage, npcMessage}
```

### WebSocket 구조
- STOMP 엔드포인트: `/ws` (SockJS fallback)
- 클라이언트 → 서버: `/app/chat/{roomId}` (`@MessageMapping`)
- 서버 → 클라이언트: `/topic/chat/{roomId}` (Simple Broker)
- Phase 3: 인메모리 브로커. 스케일아웃 시 Redis Pub/Sub으로 교체 예정.

### Spring Boot 4.x 주의사항
- Kafka 자동설정: `spring-boot-kafka` 별도 의존성 필요
- Cassandra 프로퍼티: `spring.cassandra.*` (spring.data.cassandra 아님)
- Cassandra Testcontainers 모듈: `org.testcontainers:testcontainers-cassandra`
- Cassandra 테스트: keyspace를 `CqlSession`으로 직접 생성 후 `schema-action: create-if-not-exists` 적용
- Cassandra: `datacenter1`은 single-node 컨테이너의 기본 datacenter 이름
- Jackson: `tools.jackson.*` 패키지 (3.x)
- JSONB 매핑: `@JdbcTypeCode(SqlTypes.JSON)` 필요

---

## 다음 할 것

Happy Path는 완료됐다. 이후 방향은 아래 중 하나를 선택한다.

| Phase | 목표 | 핵심 기술 과제 |
|-------|------|--------------|
| Phase 4 — Economy | 포인트 획득 → 아이템 구매 → 인벤토리 | 낙관적 락, 멱등성 |
| Phase 5 — AI NPC | 하드코딩 → Claude API 교체 | `GenerateNpcResponsePort` 구현체 교체 |
| 프론트엔드 | Phaser.js 마을 공간 | 2D 렌더링, 캐릭터 이동 |

> Phase 4/5 중 어느 것을 먼저 할지는 결정된 바 없다. `docs/planning/phases.md` 참조.

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

---

## 패키지 구조 현황

```
com.maeum.gohyang/
├── global/
│   ├── alert/
│   ├── config/
│   │   └── WebSocketConfig.java
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
└── communication/
    ├── domain/          ← ChatRoom, Participant, Message, enum 5종 (순수 도메인만)
    ├── error/           ← CommunicationErrorCode, *Exception 3종
    ├── application/
    │   ├── port/in/ (UseCase 2종)
    │   ├── port/out/ (Port 5종 + GenerateNpcResponsePort)
    │   └── service/ (Service 2종)
    └── adapter/
        ├── in/
        │   ├── web/ (ChatRoomController + DTO 5종)
        │   └── websocket/ (ChatMessageHandler, StompSendMessageRequest)
        └── out/
            ├── persistence/ (JPA 4종 + Cassandra 4종)
            └── npc/ (HardcodedNpcResponseAdapter)
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
| `decisions/003` | Transactional Outbox + Kafka 이벤트 흐름 |
| `decisions/004` | Global AlertPort 설계 |
| `decisions/005` | 게스트 마을 상태 정책 |

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
