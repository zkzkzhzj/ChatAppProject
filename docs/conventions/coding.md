# Coding Convention — 마음의 고향

---

## 1. 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 클래스 | PascalCase | `PurchaseItemService`, `PointWallet` |
| 메서드/변수 | camelCase | `deductPoint()`, `walletBalance` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_BALANCE` |
| 패키지 | lowercase | `economy.wallet`, `communication` |
| DTO (요청) | 행위 + Request | `CreateSpaceRequest`, `EarnPointRequest` |
| DTO (응답) | 대상 + Response | `SpaceDetailResponse`, `PointBalanceResponse` |
| UseCase | 행위 + UseCase | `PurchaseItemUseCase`, `LoadItemListUseCase` |
| Port (in) | 행위 + UseCase | `SendMessageUseCase` |
| Port (out) | 행위 + Port | `LoadPointWalletPort`, `SaveInventoryPort` |
| Port (out) 메서드 | 비즈니스 의도 동사 | `isEmailTaken()`, `saveWithLocalAuth()` |
| 테스트 메서드 | 한글로 행위 기술 | `포인트_잔액_부족_시_예외가_발생한다()` |

### 파라미터 객체 원칙

메서드 파라미터가 2개 이상일 때, 파라미터들이 하나의 비즈니스 개념을 이루고 있다면 객체로 묶는다.

```java
// ❌ 파라미터 나열 — email과 passwordHash가 "로컬 인증 정보"라는 개념임을 알 수 없다
saveWithLocalAuth(User user, String email, String passwordHash)

// ✅ VO로 묶기 — 개념이 이름을 갖는다
saveWithLocalAuth(User user, LocalAuthCredentials credentials)
```

**적용 기준:**

| 위치 | 적용 여부 | 이유 |
|------|----------|------|
| UseCase 인터페이스 (in) | 항상 Command/Query로 묶기 | 비즈니스 경계, 의도 명확화 |
| Port 메서드 (out) | 파라미터가 하나의 개념이면 VO로 묶기 | 기술 독립적 표현 |
| Domain 복원 팩토리 (`restore`) | 그대로 두기 | 기술적 재구성, 래퍼가 오히려 노이즈 |
| private/내부 메서드 | 판단 불필요 | 외부 API 아님 |

### Port (out) 메서드 명명 원칙

Port (out)은 도메인이 인프라에게 "무엇을 원하는가"를 표현하는 경계다.
메서드 이름이 구현 기술을 암시하면 헥사고날의 의미가 흐려진다.

```java
// ❌ JPA 파생 쿼리 이름 그대로 — 구현 기술 노출
boolean existsByEmail(String email);
List<Item> findAllByUserId(Long userId);

// ✅ 비즈니스 의도를 표현
boolean isEmailTaken(String email);
List<Item> loadAll(Long userId);
```

구현체(JpaAdapter)는 내부에서 `existsByEmail`을 써도 무방하다.
Port 인터페이스의 이름만 비즈니스 언어로 유지하면 된다.

**Port 이름이 대상을 이미 선언하므로 메서드명에서 반복하지 않는다.**
`ByUserId`, `ByEmail` 같은 기술적 수식어도 메서드명에서 제거한다.
파라미터가 이미 `userId`임을 알리고, Port 이름이 대상(Character, Space 등)을 선언한다.

```java
// ❌ Port 이름(LoadCharacterPort)과 메서드명(loadCharacterByUserId)이 중복
Optional<Character> loadCharacterByUserId(long userId);

// ❌ ByUserId는 JPA 파생 쿼리 냄새
Optional<Character> loadByUserId(long userId);

// ✅ Port 이름이 Character임을 선언, 메서드는 행위와 수식자만
Optional<Character> load(long userId);            // 단일 조회
Optional<Space> loadDefault(long userId);         // "기본" 공간 조회
List<Item> loadAll(long userId);                  // 목록 조회
```

---

## 2. DTO

- **Java `record` 타입을 기본으로 사용한다.** 불변성이 보장되고 보일러플레이트가 없다.
- 불가피한 경우(프레임워크 제약 등)에만 `@Data` 허용.
- Entity를 Controller에서 직접 반환하지 않는다. 반드시 DTO로 변환한다.

```java
// ✅ record DTO
public record CreateSpaceRequest(
    @NotBlank String name,
    @NotNull String theme
) {}

public record SpaceDetailResponse(
    Long id,
    String name,
    String theme,
    LocalDateTime createdAt
) {}

// ❌ Entity 직접 반환
@GetMapping("/spaces/{id}")
public Space getSpace(@PathVariable Long id) { ... }
```

---

## 3. Lombok 사용 규칙

| 어노테이션 | 허용 대상 | 비고 |
|-----------|----------|------|
| `@Getter` | Domain Entity, Persistence Entity | |
| `@NoArgsConstructor(access = PROTECTED)` | Persistence Entity | JPA 요구사항 |
| `@RequiredArgsConstructor` | Service, Adapter 등 | 생성자 주입용 |
| `@Data` | DTO (record 불가 시에만) | 최소 사용 |
| `@Setter` | **사용 금지** | 상태 변경은 도메인 메서드로 |
| `@AllArgsConstructor` | **사용 지양** | `@Builder` 사용 |

---

## 4. 예외 처리

### 4.1 커스텀 예외 구조

```
global/error/
├── BusinessException.java        # 비즈니스 예외 베이스
├── ErrorResponse.java            # API 에러 응답 형식
└── GlobalExceptionHandler.java   # @RestControllerAdvice

[도메인]/error/
├── [Domain]ErrorCode.java        # 도메인별 에러 코드 Enum (code, message, HttpStatus)
└── [Domain]Exception.java        # BusinessException 구현체
```

에러 코드 enum은 global에 단일 파일로 두지 않고, 각 도메인의 `error/` 패키지에 분산 정의한다. 예: `IdentityErrorCode`, `VillageErrorCode`, `CommunicationErrorCode`.

### 4.2 규칙

- `throw new RuntimeException()` 금지. 반드시 커스텀 예외를 사용한다.
- 도메인별 예외는 해당 도메인의 `error/` 패키지에 정의한다.
- 예외 메시지에 디버깅에 필요한 정보를 포함한다.

### 4.3 ErrorCode enum — 도메인별 분리

에러 코드와 메시지는 도메인별 `ErrorCode` enum으로 관리한다. 전역 단일 enum으로 몰지 않는다.

```java
// ❌ global/error/ErrorCode.java 하나에 전부 — 도메인이 늘수록 비대해지고 경계가 흐려짐
// ❌ 예외 클래스에 직접 하드코딩 — 매직 스트링, 중복 사용 시 컴파일러가 못 잡음
throw new BusinessException("이미 사용 중인 이메일입니다", HttpStatus.CONFLICT, "IDENTITY_001");

// ✅ 도메인별 enum — 자기 에러를 자기가 관리
// identity/error/IdentityErrorCode.java
@Getter
@RequiredArgsConstructor
public enum IdentityErrorCode {
    DUPLICATE_EMAIL("IDENTITY_001", "이미 사용 중인 이메일입니다", HttpStatus.CONFLICT),
    ;
    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}

// identity/error/DuplicateEmailException.java
public class DuplicateEmailException extends BusinessException {
    public DuplicateEmailException() {
        super(
            IdentityErrorCode.DUPLICATE_EMAIL.getMessage(),
            IdentityErrorCode.DUPLICATE_EMAIL.getHttpStatus(),
            IdentityErrorCode.DUPLICATE_EMAIL.getCode()
        );
    }
}
```

**에러 코드 네이밍 규칙:** `{도메인_PREFIX}_{세자리_숫자}`

| 도메인 | 접두사 예시 |
|--------|-----------|
| Identity | `IDENTITY_` |
| Village | `VILLAGE_` |
| Economy | `ECONOMY_` |
| Communication | `COMM_` |

---

## 5. Entity 작성 규칙

### 5.1 Domain Entity

- 순수 POJO. Spring, JPA 어노테이션 없음.
- 비즈니스 규칙을 메서드로 표현한다.
- `@Setter` 없이 도메인 메서드로만 상태를 변경한다.
- **생성자 대신 정적 팩토리 메서드를 사용한다.** 생성 경로가 "신규 생성"과 "복원(DB → Domain)"으로 구분되기 때문이다.

```java
// ✅ 정적 팩토리 메서드 — 의도가 이름에 드러난다
public class User {
    public static User newMember() { ... }              // 신규 생성 (id = null)
    public static User restore(Long id, ...) { ... }   // 복원 (Persistence Adapter 전용)
}

// ❌ 생성자 직접 노출 — 신규인지 복원인지 읽는 사람이 모른다
new User(null, UserType.MEMBER, LocalDateTime.now())
```

> 자세한 배경: `docs/learning/08-phase1-layer-patterns.md`

```java
public class PointWallet {
    private Long id;
    private Long userId;
    private Long balance;
    private Long version;

    public void deduct(Long amount) {
        if (this.balance < amount) {
            throw new InsufficientBalanceException(this.balance, amount);
        }
        this.balance -= amount;
    }

    public void add(Long amount) {
        this.balance += amount;
    }
}
```

### 5.2 Persistence Entity (JPA)

- `adapter/out/persistence/` 패키지에 위치한다.
- JPA 어노테이션은 여기에만 사용한다.
- Domain Entity와 이름을 구분한다. (`PointWalletJpaEntity`)
- **`@Builder` 사용 금지.** 필수 필드를 강제하지 못해 유효하지 않은 상태의 Entity가 생성될 수 있다. Domain Entity와 동일하게 정적 팩토리 메서드를 사용한다.

```java
@Entity
@Table(name = "point_wallet")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)  // JPA 전용, 외부 직접 생성 차단
public class PointWalletJpaEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long balance;

    @Version
    private Long version;

    // 생성은 이 팩토리 메서드를 통해서만
    public static PointWalletJpaEntity create(Long userId) {
        PointWalletJpaEntity e = new PointWalletJpaEntity();
        e.userId = userId;
        e.balance = 0L;
        e.version = 0L;
        return e;
    }
}
```

> **왜 `@Builder`를 쓰지 않는가:** `@Builder`는 `builder().userId(id).build()`처럼
> 필수 필드를 빠뜨려도 컴파일이 통과된다. 정적 팩토리 메서드는 파라미터로 필수 필드를
> 강제하므로 유효하지 않은 상태의 Entity 생성을 막는다. Domain Entity의 `newMember()` /
> `restore()` 패턴과도 일관성을 유지한다.

---

## 6. Service 작성 규칙

- `@Transactional`은 Service 계층에서만 사용한다. Controller에 붙이지 않는다.
- 읽기 전용 조회에는 `@Transactional(readOnly = true)`를 붙인다.
- 하나의 Service는 하나의 UseCase를 구현한다.

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)  // 클래스 레벨: 기본 읽기 전용
public class LoadItemListService implements LoadItemListUseCase {
    private final InventoryPersistencePort inventoryPort;

    @Override
    public List<ItemDetail> execute(LoadItemListQuery query) {
        return inventoryPort.loadByUserId(query.userId());
    }
}

@Service
@RequiredArgsConstructor
public class PurchaseItemService implements PurchaseItemUseCase {
    // ...

    @Override
    @Transactional  // 메서드 레벨: 쓰기 트랜잭션
    public PurchaseResult execute(PurchaseItemCommand command) {
        // ...
    }
}
```

---

## 7. Controller 작성 규칙

- 비즈니스 로직을 넣지 않는다. UseCase에 위임만 한다.
- Request DTO에 Validation 어노테이션을 붙인다.
- 응답은 반드시 Response DTO로 반환한다.

```java
@RestController
@RequestMapping("/api/v1/points")
@RequiredArgsConstructor
public class PointController {
    private final EarnPointUseCase earnPointUseCase;

    @PostMapping("/earn")
    public ResponseEntity<PointBalanceResponse> earnPoint(
            @Valid @RequestBody EarnPointRequest request) {
        PointBalanceResponse response = earnPointUseCase.execute(request.toCommand());
        return ResponseEntity.ok(response);
    }
}
```

### 7.1 응답 방식 — `ResponseEntity` vs `@ResponseStatus`

공통 응답 래퍼(`ApiResponse<T>`)는 사용하지 않는다.
HTTP 상태코드가 이미 성공/실패를 표현하고, `GlobalExceptionHandler`가 에러 형식을 통일한다.
3중 래핑(`ResponseEntity<ApiResponse<SomeResponse>>`)은 클라이언트가 `data.data.field`로 접근해야 하는 불편함을 낳는 안티패턴이다.

**선택 기준:**

| 상황 | 선택 |
|------|------|
| 성공 시 상태코드가 항상 고정 | `@ResponseStatus` |
| 조건에 따라 상태코드가 달라짐 | `ResponseEntity` |
| 응답 헤더를 직접 설정해야 함 | `ResponseEntity` |
| 나중에 헤더 추가 가능성이 있음 | `ResponseEntity` 선택 권장 |

실패 케이스(4xx, 5xx)는 어떤 방식을 쓰든 `GlobalExceptionHandler`가 처리한다.
컨트롤러에서는 **성공 케이스의 상태코드만 고민**하면 된다.

```java
// ✅ 항상 200 — @ResponseStatus로 충분
@PostMapping("/guest")
@ResponseStatus(HttpStatus.OK)
public AuthResponse guest() {
    return new AuthResponse(issueGuestTokenUseCase.execute().accessToken());
}

// ✅ 201 + 나중에 Location 헤더 추가 가능성 — ResponseEntity 사용
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
    RegisterUserUseCase.TokenResult result = registerUserUseCase.execute(request.toCommand());
    return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(result.accessToken()));
}

// ✅ 조건에 따라 상태코드가 달라지는 경우 — ResponseEntity로 분기
@GetMapping("/{id}")
public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
    return userService.findById(id)
        .map(user -> ResponseEntity.ok(new UserResponse(user)))   // 200
        .orElse(ResponseEntity.notFound().build());               // 404
}
```

### 7.2 Request DTO의 `toCommand()` 메서드

Request DTO는 `toCommand()` 메서드로 Application Layer의 Command 객체로 변환한다.
메서드 이름은 클래스명이 이미 컨텍스트를 제공하므로 `toCommand()`로 통일한다.
`toRegisterUserCommand()`처럼 풀어 쓰면 중복이다.

```java
public record RegisterRequest(String email, String password) {
    public RegisterUserCommand toCommand() {        // ✅ 간결
        return new RegisterUserCommand(email, password);
    }
    // ❌ toRegisterUserCommand() — 클래스명과 중복
}
```

---

## 8. Import 규칙

- **전체 경로(FQCN) 사용 금지.** 코드 본문에 `java.util.Optional`처럼 패키지 경로를 직접 쓰지 않는다. 반드시 상단에 `import`를 추가한다.
- **와일드카드 import 금지.** `import java.util.*` 대신 필요한 클래스를 개별 import한다.

```java
// ❌ 전체 경로 — 코드가 지저분하고 import 실수를 숨긴다
private java.util.Optional<String> extractToken(...) { ... }

// ✅ 상단 import + 단순 타입명
import java.util.Optional;
private Optional<String> extractToken(...) { ... }
```

---

## 9. 기타 규칙

- **매직 넘버/스트링 금지.** 상수 또는 Enum으로 정의한다.
- **하드코딩된 설정값 금지.** URL, 타임아웃, 사이즈 등은 `application.yml`로 분리한다.
- **Security 허용 경로는 `application.yml`로 관리한다.** `@ConfigurationProperties`로 바인딩하여 환경별(local/docker/prod) 분리 및 재컴파일 없이 변경 가능하게 한다. Spring Boot 리스트 병합 문제로 공통 경로(`common-public-paths`)와 환경별 경로(`env-public-paths`)를 키로 분리하여 코드에서 합친다.
- **접근 제어자를 의식한다.** 외부에 노출할 필요 없는 메서드는 `public`으로 열지 않는다.
- **메서드는 하나의 책임만 가진다.** 20라인을 넘어가면 분리를 고려한다.
- **API 응답에 민감 정보를 노출하지 않는다.** 비밀번호, 토큰, 내부 ID 등.