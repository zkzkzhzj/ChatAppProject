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
| 테스트 메서드 | 한글로 행위 기술 | `포인트_잔액_부족_시_예외가_발생한다()` |

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
| `@Builder` | Domain Entity, Persistence Entity | 생성 시 사용 |
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
├── ErrorCode.java                # 에러 코드 Enum
├── ErrorResponse.java            # API 에러 응답 형식
└── GlobalExceptionHandler.java   # @RestControllerAdvice
```

### 4.2 규칙

- `throw new RuntimeException()` 금지. 반드시 커스텀 예외를 사용한다.
- 도메인별 예외는 해당 도메인의 `domain/` 패키지에 정의한다.
- 예외 메시지에 디버깅에 필요한 정보를 포함한다.

```java
// 도메인 예외 — economy/wallet/domain/ 에 위치
public class InsufficientBalanceException extends BusinessException {
    public InsufficientBalanceException(Long currentBalance, Long requestedAmount) {
        super(ErrorCode.INSUFFICIENT_BALANCE,
              String.format("잔액 부족: 현재 %d, 요청 %d", currentBalance, requestedAmount));
    }
}
```

---

## 5. Entity 작성 규칙

### 5.1 Domain Entity

- 순수 POJO. Spring, JPA 어노테이션 없음.
- 비즈니스 규칙을 메서드로 표현한다.
- `@Setter` 없이 도메인 메서드로만 상태를 변경한다.

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

```java
@Entity
@Table(name = "point_wallet")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
public class PointWalletJpaEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long balance;

    @Version
    private Long version;
}
```

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

---

## 8. 기타 규칙

- **매직 넘버/스트링 금지.** 상수 또는 Enum으로 정의한다.
- **하드코딩된 설정값 금지.** URL, 타임아웃, 사이즈 등은 `application.yml`로 분리한다.
- **접근 제어자를 의식한다.** 외부에 노출할 필요 없는 메서드는 `public`으로 열지 않는다.
- **메서드는 하나의 책임만 가진다.** 20라인을 넘어가면 분리를 고려한다.
- **API 응답에 민감 정보를 노출하지 않는다.** 비밀번호, 토큰, 내부 ID 등.