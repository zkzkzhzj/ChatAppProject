# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> 현재 상태와 다음 할 일이 여기 있다.

---

## 현재 상태 (2026-04-07 기준, 2차 업데이트)

### 완료된 것

**Phase 0 — Foundation**
- Flyway 의존성 추가 (`flyway-core` + `flyway-database-postgresql`)
- `V1__initial_schema.sql` 작성 (전체 ERD 기반)
  - `users` 테이블명 사용 (PostgreSQL 예약어 `user` 회피)
  - `user_local_auth` 테이블 추가 (이메일/비밀번호 인증 분리, `user_social_auth`와 대칭 구조)
- 테스트 `ddl-auto: create-drop` → `validate` 전환
- 테스트 통과 확인

**Phase 1 — Identity (완료)**

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Domain | `User`, `UserType`, `LocalAuthCredentials`, `IdentityErrorCode`, `DuplicateEmailException` | ✅ |
| Port (in) | `RegisterUserUseCase`, `IssueGuestTokenUseCase` | ✅ |
| Port (out) | `SaveUserPort`, `CheckEmailDuplicatePort`, `IssueTokenPort` | ✅ |
| Service | `RegisterUserService`, `IssueGuestTokenService` | ✅ |
| Persistence | `UserJpaEntity`, `UserLocalAuthJpaEntity`, `UserJpaRepository`, `UserLocalAuthJpaRepository`, `UserPersistenceAdapter` | ✅ |
| Security | `JwtProvider`, `JwtFilter`, `JwtClaims`, `SecurityConfig`, `SecurityProperties` | ✅ |
| Web Adapter | `RegisterRequest`, `AuthResponse` | ✅ |
| Web Adapter | `AuthController` | ✅ |
| Cucumber | 회원가입 → JWT 발급 시나리오 | ✅ |

---

## Happy Path 구현 방향 (확정)

**목표:** 로컬에서 실행했을 때 마을에 입장하고, 캐릭터가 이동하고, NPC가 보이고, 대화를 시도할 수 있어야 한다.

**UI/디자인은 우선순위가 아니다.** 그럴듯한 비주얼 없어도 된다. 기능이 동작하면 완료 조건을 충족한다. 디자인과 에셋은 Happy Path 완료 이후에 별도로 정한다.

즉, Phase 2~3을 구현할 때 "보기 좋은가"가 아니라 **"로컬에서 기능이 돌아가는가"**를 완료 기준으로 삼는다.

---

## 다음 할 것 — Phase 2 (Village)


`identity/adapter/in/web/AuthController.java` 작성.
- `POST /api/v1/auth/register` → `RegisterUserUseCase` 호출, `201 Created` + `AuthResponse`
- `POST /api/v1/auth/guest` → `IssueGuestTokenUseCase` 호출, `200 OK` + `AuthResponse`

컨벤션:
- `register`는 `ResponseEntity<AuthResponse>` (나중에 Location 헤더 추가 가능성)
- `guest`는 `@ResponseStatus(HttpStatus.OK) + AuthResponse` (항상 200 고정)
- `@Valid @RequestBody`로 입력 검증

### 2. 컴파일 + 테스트 통과 확인

```bash
cd backend && ./gradlew test --rerun
```

### 3. Phase 1 Cucumber 인수 테스트 작성

`src/test/resources/features/identity/` 디렉터리 생성 후 시나리오 작성.

```gherkin
Feature: 인증

  Scenario: 이메일로 회원가입하면 JWT를 발급받는다
    Given 미가입 이메일 "test@maeum.com"이 있다
    When 비밀번호 "password123"으로 회원가입을 요청한다
    Then HTTP 상태코드 201을 받는다
    And 응답에 accessToken이 포함되어 있다

  Scenario: GUEST 토큰을 발급받는다
    When GUEST 토큰 발급을 요청한다
    Then HTTP 상태코드 200을 받는다
    And 응답에 accessToken이 포함되어 있다

  Scenario: 중복 이메일로 회원가입하면 실패한다
    Given "test@maeum.com"으로 이미 가입된 유저가 있다
    When 동일한 이메일로 회원가입을 요청한다
    Then HTTP 상태코드 409를 받는다
```

Step 클래스: `IdentitySteps.java`
TestAdapter 확장: `AuthTestAdapter.java` (`POST /api/v1/auth/register`, `POST /api/v1/auth/guest`)

### 1. `Character`, `Space` Domain Entity 작성

`village/domain/` 패키지 생성 후 Domain Entity 설계.
ERD 확인 후 `character`, `space` 테이블과 대응하는 Domain Entity + Port 정의.

### 2. `UserRegisteredEvent` → 캐릭터/공간 자동 생성

Identity → Village 이벤트 흐름 구현.
`RegisterUserService`에서 이벤트 발행, Village에서 수신하여 기본 캐릭터/공간 생성.

### 3. Cucumber: 가입 후 캐릭터/공간 존재 확인 시나리오

---

## 현재 기술 스택 버전

| 항목 | 버전 |
|------|------|
| Spring Boot | 4.0.3 |
| Java | 21 |
| Testcontainers | 2.x (Spring BOM 관리) |
| Cucumber | 7.34.2 |
| JJWT | 0.12.6 |
| Flyway | Spring BOM 관리 |

---

## 패키지 구조 현황

```
com.maeum.gohyang/
├── global/
│   └── error/
│       ├── BusinessException.java
│       ├── ErrorResponse.java
│       └── GlobalExceptionHandler.java
└── identity/
    ├── domain/
    │   ├── User.java
    │   ├── UserType.java
    │   ├── LocalAuthCredentials.java
    │   ├── IdentityErrorCode.java
    │   └── DuplicateEmailException.java
    ├── application/
    │   ├── port/in/
    │   │   ├── RegisterUserUseCase.java
    │   │   └── IssueGuestTokenUseCase.java
    │   ├── port/out/
    │   │   ├── SaveUserPort.java
    │   │   ├── CheckEmailDuplicatePort.java
    │   │   └── IssueTokenPort.java
    │   └── service/
    │       ├── RegisterUserService.java
    │       └── IssueGuestTokenService.java
    └── adapter/
        ├── in/
        │   ├── web/
        │   │   ├── RegisterRequest.java
        │   │   ├── AuthResponse.java
        │   │   └── AuthController.java       ← ❌ 미완성
        │   └── security/
        │       ├── JwtClaims.java
        │       ├── JwtProvider.java
        │       ├── JwtFilter.java
        │       ├── SecurityConfig.java
        │       └── SecurityProperties.java
        └── out/
            └── persistence/
                ├── UserJpaEntity.java
                ├── UserLocalAuthJpaEntity.java
                ├── UserJpaRepository.java
                ├── UserLocalAuthJpaRepository.java
                └── UserPersistenceAdapter.java
```

---

## TestAdapter 구조 (Spring Boot 4.x 기준)

```
HealthCheckSteps / IdentitySteps  ← 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter / AuthTestAdapter  ← URL과 파싱 방법을 안다
    ↓
TestAdapter              ← RestClient GET/POST, 인증 헤더
    ↓
ScenarioContext          ← 마지막 응답 보관
```

---

## 추가된 컨벤션 / 학습 문서

| 문서 | 추가 내용 |
|------|----------|
| `coding.md` | 정적 팩토리 메서드, Port 메서드 비즈니스 언어, 파라미터 객체, ErrorCode enum, JPA Entity `@Builder` 금지, Import 규칙, Security 경로 yml 관리, ResponseEntity vs @ResponseStatus, toCommand() 네이밍 |
| `learning/08` | Domain Entity 설계 패턴 |
| `learning/10` | JPA Persistence Entity 패턴 |
| `learning/11` | Security 설정 패턴 |
| `learning/12` | Spring Boot 4.x 모듈형 자동 구성 — Flyway 누락 사례 |
| `decisions/002` | GUEST 인증 패턴 선택 (명시적 Guest 토큰 vs 무토큰 vs 서버 자동 발급) |

---

## 참고 문서 위치

| 필요할 때 | 파일 |
|-----------|------|
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 패키지 구조 | `docs/architecture/package-structure.md` |
| ERD | `docs/architecture/erd.md` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| 구현 로드맵 | `docs/planning/phases.md` |
| Happy Path 시나리오 | `docs/planning/phases.md` 상단 |
