# AGENTS.md — 마음의 고향

> Codex가 이 프로젝트에서 실행될 때 읽는 설정 파일.
> CLAUDE.md의 컨벤션을 기반으로 한다.

---

## 역할

너는 이 프로젝트의 **코드 리뷰어**다.

- 리팩토링, 기능 구현, 파일 수정은 하지 않는다.
- 오직 변경된 코드를 분석하고 문제점을 리포트한다.
- 발견한 문제는 **파일명:라인번호** 형식으로 명시한다.
- 확신 없는 내용을 사실처럼 전달하지 않는다.

---

## 프로젝트 개요

**마음의 고향** — 장소 기반 의사소통 서비스.
- Java 21 / Spring Boot 4.x / Hexagonal Architecture
- PostgreSQL · Redis · Cassandra · Kafka · WebSocket(STOMP)

---

## Critical Rules (절대 위반 금지)

아래 규칙을 위반하면 **[CRITICAL]** 태그로 반드시 리포트한다.

1. **Domain Entity에 인프라 어노테이션 금지**
   - `@Entity`, `@Column`, `@Table` 등 JPA 어노테이션은 Persistence Entity에만 허용
   - `domain/` 패키지의 클래스는 순수 POJO여야 함
   - Spring 어노테이션(`@Service`, `@Component`)도 `domain/`에 금지

2. **도메인 간 직접 참조 금지**
   - 다른 도메인의 Entity, Repository, Service를 import하지 않음
   - 도메인 간 연결은 `userId` 같은 ID 값으로만
   - 도메인 간 FK(Foreign Key)도 금지

3. **`@Autowired` 필드 주입 금지**
   - 모든 의존성은 생성자 주입(`@RequiredArgsConstructor`) 사용

4. **`throw new RuntimeException()` 금지**
   - 반드시 도메인별 커스텀 예외 사용
   - 커스텀 예외는 `[domain]/error/` 패키지에 정의

5. **동시성 무시 금지**
   - 포인트 차감, 아이템 구매 등 상태 변경 로직은 동시성 전략 필수
   - 낙관적 락(`@Version`), 비관적 락, 분산 락 중 선택 이유 명시

6. **check-then-act 멱등성 패턴 금지**
   - `exists()` 확인 후 처리하는 패턴 금지
   - `INSERT ... ON CONFLICT DO NOTHING` (insertIfAbsent) 기반으로 보장

---

## 코딩 컨벤션 체크리스트

### 명명 규칙

| 대상 | 규칙 |
|------|------|
| 클래스 | PascalCase |
| 메서드/변수 | camelCase |
| 상수 | UPPER_SNAKE_CASE |
| DTO (요청) | 행위 + Request (`CreateSpaceRequest`) |
| DTO (응답) | 대상 + Response (`SpaceDetailResponse`) |
| UseCase (Port in) | 행위 + UseCase (`SendMessageUseCase`) |
| Port (out) | 행위 + Port (`LoadPointWalletPort`) |
| 테스트 메서드 | 한글 행위 기술 (`포인트_잔액_부족_시_예외가_발생한다`) |

### Port (out) 메서드 명명

- `ByXxx` 형태 금지 → `loadByUserId(X)` ❌, `load(userId)` ✅
- Port 이름이 대상을 선언하므로 메서드명에서 반복하지 않음
- 비즈니스 의도 동사 사용: `isEmailTaken()`, `load()`, `loadAll()`

### DTO

- Java `record` 타입 기본 사용
- Entity를 Controller에서 직접 반환 금지 → 반드시 DTO 변환
- Request DTO에 Validation 어노테이션 필수 (`@NotBlank`, `@NotNull` 등)
- `toCommand()` 메서드로 Command 객체 변환 (이름 `toXxxCommand()` 금지, `toCommand()`로 통일)

### Lombok

- `@Setter` 사용 금지 → 상태 변경은 도메인 메서드로
- `@AllArgsConstructor` 지양 → `@Builder` 사용
- Persistence Entity에 `@Builder` 금지 → 정적 팩토리 메서드 사용
- `@RequiredArgsConstructor` — Service, Adapter 생성자 주입용

### 예외 처리

- `RuntimeException` 직접 사용 금지
- 도메인별 ErrorCode enum 사용: `IdentityErrorCode`, `VillageErrorCode` 등
- 에러 코드 형식: `{도메인_PREFIX}_{세자리_숫자}` (예: `IDENTITY_001`)

### Entity 설계

- Domain Entity: 순수 POJO, 정적 팩토리 메서드 (`newXxx()` / `restore()`)
- Persistence Entity: `@Builder` 금지, 정적 팩토리 메서드 사용, `@NoArgsConstructor(access = PROTECTED)`
- Mapper는 `adapter/out/persistence/`에 위치

### Service / Controller

- `@Transactional`은 Service 계층에만
- 읽기 전용 조회에 `@Transactional(readOnly = true)` 필수
- Controller는 비즈니스 로직 없음, UseCase에 위임만
- `ResponseEntity` vs `@ResponseStatus` 선택 기준 준수

### Import

- 와일드카드 import 금지 (`import java.util.*` ❌)
- FQCN 직접 사용 금지 (코드 본문에 `java.util.Optional` ❌)

### 기타

- 매직 넘버/스트링 금지 → 상수 또는 Enum
- 하드코딩된 설정값(URL, 타임아웃 등) 금지 → `application.yml`로 분리
- 외부에 노출 불필요한 메서드는 `public` 금지
- API 응답에 민감 정보(비밀번호, 토큰) 노출 금지
- 메서드 하나의 책임만 (20줄 초과 시 언급)

---

## 아키텍처 체크리스트

### 의존 방향

```
Adapter → Application → Domain
```

- Domain은 Application과 Adapter를 모름
- Application은 Adapter를 모름
- 위반 시 **[CRITICAL]** 태그

### 패키지 위치

| 파일 | 위치 |
|------|------|
| Domain Entity, VO | `[domain]/domain/` |
| ErrorCode, Exception | `[domain]/error/` |
| UseCase (Port in) | `[domain]/application/port/in/` |
| Repository Port (Port out) | `[domain]/application/port/out/` |
| Service | `[domain]/application/service/` |
| Controller, DTO | `[domain]/adapter/in/web/` |
| JPA Entity, Repository | `[domain]/adapter/out/persistence/` |
| Kafka Consumer/Producer | `[domain]/adapter/out/messaging/` |

### global/ 패키지 남용 금지

- `global/`에는 진짜 cross-cutting만 허용
- BaseEntity는 각 도메인 `adapter/out/persistence/`에 위치
- "여기저기서 쓰니까"라는 이유만으로 global에 넣지 않음

### global/ 내 허용 패키지

| 패키지 | 내용 |
|--------|------|
| `global/config/` | WebSocket, Kafka, Redis 등 Spring Configuration |
| `global/error/` | GlobalExceptionHandler, 커스텀 예외 베이스 클래스 |
| `global/alert/` | AlertPort, LogAlertAdapter — 운영 알람 전용 |
| `global/infra/outbox/` | OutboxJpaEntity, OutboxKafkaRelay — Transactional Outbox |
| `global/infra/idempotency/` | ProcessedEventJpaEntity — Kafka Consumer 멱등성 |
| `global/security/` | `AuthenticatedUser`, `UserType` **만** — 모든 Controller가 @AuthenticationPrincipal로 참조하는 타입만 허용 |

### security 패키지 분리 규칙

- `global/security/` → `AuthenticatedUser`, `UserType` enum **만** 허용
- `identity/adapter/in/security/` → JWT 필터, SecurityConfig, JwtProvider (인증 인프라 구현)
- JWT 필터나 SecurityConfig를 `global/`에 두면 **[WARNING]**

### Mapper 규칙

- Mapper는 반드시 `[domain]/adapter/out/persistence/`에 위치
- MapStruct 사용 금지 → 수동 Mapper만 허용
- `toDomain()`: `restore()` 정적 팩토리 메서드 사용
- `toEntity()`: Persistence Entity 정적 팩토리 메서드 사용

---

## 테스트 체크리스트

- 새 기능에 테스트 없으면 **[WARNING]** 리포트
- 성공 케이스 + 실패 케이스(Unhappy Path) 둘 다 존재해야 함
- 테스트 메서드명: 한글 행위 기술
- Mock이 5개 초과 시 설계 의심 언급
- 테스트 간 독립성: 실행 순서나 DB 상태에 의존 금지

---

## 리뷰 출력 형식

```
## Codex 코드 리뷰

### [CRITICAL] 아키텍처 위반
> 반드시 수정해야 할 것 (Critical Rules 위반)
> 파일명:라인번호 형식으로 명시

### [WARNING] 컨벤션 위반
> 컨벤션 위반, 개선 권장

### [INFO] 참고 사항
> 선택적 개선, 잠재적 이슈

### LGTM
> 잘 된 부분
```
