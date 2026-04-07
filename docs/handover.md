# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> 현재 상태와 다음 할 일이 여기 있다.

---

## 현재 상태 (2026-04-07 기준, 3차 업데이트)

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

### Spring Boot 4.x 주의사항
- Kafka 자동설정: `spring-boot-kafka` 별도 의존성 필요 (Flyway처럼 모듈 분리됨)
- Cassandra 자동설정: `application-test.yml`에서 제외 처리
- Jackson: `tools.jackson.*` 패키지 (3.x, 기존 `com.fasterxml.jackson`은 2.x)
- JSONB 매핑: `@JdbcTypeCode(SqlTypes.JSON)` 필요 (`columnDefinition = "jsonb"`만으로는 바인딩 오류)

---

## 다음 할 것 — Phase 3 (WebSocket 실시간 이동)

`docs/planning/phases.md` 참조.

**Phase 3 목표:** 캐릭터가 마을 맵에서 실시간으로 이동하는 것을 다른 유저가 볼 수 있어야 한다.

구현 순서 (예상):
1. STOMP WebSocket 설정 (`WebSocketConfig`, `/ws` 엔드포인트)
2. 마을 입장/퇴장 이벤트 처리
3. 캐릭터 이동 메시지 브로드캐스트
4. Redis Pub/Sub 또는 인메모리 브로커로 상태 공유
5. 프론트엔드 연동 (Next.js + Phaser.js)

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
│   │   ├── AlertContext.java
│   │   ├── AlertPort.java
│   │   └── LogAlertAdapter.java
│   ├── error/
│   │   ├── BusinessException.java
│   │   ├── ErrorResponse.java
│   │   └── GlobalExceptionHandler.java
│   ├── infra/
│   │   ├── outbox/
│   │   │   ├── OutboxEventStatus.java
│   │   │   ├── OutboxJpaEntity.java
│   │   │   ├── OutboxJpaRepository.java
│   │   │   └── OutboxKafkaRelay.java
│   │   └── idempotency/
│   │       ├── ProcessedEventJpaEntity.java
│   │       └── ProcessedEventJpaRepository.java
│   └── security/
│       ├── AuthenticatedUser.java
│       └── UserType.java
├── identity/
│   └── ... (Phase 1 완료)
└── village/
    ├── domain/
    │   ├── Character.java
    │   ├── Space.java
    │   ├── SpaceTheme.java
    │   ├── VillageErrorCode.java
    │   └── *Exception.java (3종)
    ├── application/
    │   ├── port/in/ (UseCase 3종)
    │   ├── port/out/ (Port 4종)
    │   └── service/ (Service 3종)
    └── adapter/
        ├── in/
        │   ├── messaging/UserRegisteredEventConsumer.java
        │   └── web/VillageController.java + DTO 2종
        └── out/persistence/
            ├── CharacterJpaEntity.java + Repository
            ├── SpaceJpaEntity.java + Repository
            └── VillagePersistenceAdapter.java
```

---

## TestAdapter 구조

```
HealthCheckSteps / IdentitySteps / VillageSteps  ← 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter / AuthTestAdapter / VillageTestAdapter  ← URL, 폴링 로직
    ↓
TestAdapter              ← RestClient GET/POST, 인증 헤더
    ↓
ScenarioContext          ← lastResponse, currentAccessToken, currentEmail
```

---

## 추가된 컨벤션 / 학습 문서

| 문서 | 추가 내용 |
|------|----------|
| `coding.md` | Port 메서드 네이밍: Port 이름에 엔티티 선언됨, 메서드는 액션만 (`load`, `save`), `ByXxx` 금지 |
| `learning/12` | Spring Boot 4.x 모듈형 자동 구성 — Flyway 누락 사례 |
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
