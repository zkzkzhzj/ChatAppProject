# Architecture — 마음의 고향

---

## 1. 아키텍처 선택: Hexagonal (Port & Adapter)

### 1.1 왜 헥사고날인가

이 프로젝트는 도메인마다 사용하는 인프라가 다르다.

- Chat: Cassandra + WebSocket + Redis Pub/Sub
- Space: PostgreSQL + WebSocket + Redis
- Point: PostgreSQL + Kafka

도메인 로직이 특정 인프라 기술에 결합되면, 기술을 교체하거나 테스트할 때 도메인까지 건드려야 한다. 헥사고날은 도메인을 중심에 놓고, 인프라를 교체 가능한 어댑터로 분리한다.

### 1.2 전체 헥사고날, 간소화 허용

기본 원칙은 모든 도메인에 헥사고날 구조를 적용한다.

**이유:**

- 프로젝트 전체가 일관된 구조를 가진다. "이 도메인은 어떤 구조지?"라는 확인이 필요 없다.
- Auth에 소셜 로그인 추가, Notification에서 FCM을 다른 서비스로 교체 등 모든 도메인에서 인프라 교체 가능성이 존재한다.

**단, 간소화가 허용되는 조건:**

- 외부 인프라 교체 가능성이 낮은 경우
- 도메인 규칙이 거의 없는 순수 CRUD인 경우
- 테스트 격리의 이득보다 구조 유지 비용이 큰 경우
- 간소화 시 반드시 ADR에 이유를 기록한다

### 1.3 유연함에 대하여

헥사고날이 정답이기 때문에 선택한 것이 아니다. 현재 이 프로젝트의 특성(다양한 인프라, 도메인 간 분리 필요, 실제 서비스 런칭 목표)에 적합한 선택이다.

교조적으로 적용하지 않는다. 구조는 목적을 위한 수단이며, 일관성을 위해 불필요한 복잡도를 감수하는 것은 정당화가 아니다.

---

## 2. 레이어 책임과 의존 방향

### 2.1 의존 방향

```text
Adapter (외부) → Application (유스케이스) → Domain (핵심)
```

**안쪽은 바깥을 모른다.** Domain은 Application을 모르고, Application은 Adapter를 모른다. 의존은 항상 바깥에서 안쪽으로만 향한다.

### 2.2 Domain

순수 비즈니스 규칙. 외부 기술에 대해 아무것도 모른다.

**포함하는 것:**

- Entity (비즈니스 규칙을 가진 도메인 객체)
- Value Object (불변 값 객체)
- Domain Service (여러 Entity에 걸친 비즈니스 로직)
- Domain Event (도메인에서 발생하는 사건 정의)

**포함하지 않는 것:**

- Spring 어노테이션 (`@Service`, `@Component` 등)
- JPA 어노테이션 (`@Entity`, `@Column` 등)
- 인프라 라이브러리 import

```java
// Domain Entity 예시 — 순수 POJO
public class PointWallet {
    private Long id;
    private Long userId;
    private Long balance;
    private Long version; // 낙관적 락을 위한 버전

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

### 2.3 Application

유스케이스를 조율하는 층. Port 인터페이스를 정의한다.

**포함하는 것:**

- Driving Port (in): 외부가 이 도메인을 호출하는 인터페이스 (UseCase)
- Driven Port (out): 이 도메인이 외부를 호출하는 인터페이스 (Repository, Messaging 등)
- Application Service: UseCase 구현체. Port를 조합하여 비즈니스 흐름을 조율.

**포함하지 않는 것:**

- HTTP, WebSocket 등 통신 기술 세부사항
- DB 접근 기술 세부사항

```java
// Application Service 예시 — 멱등성 + 동시성 제어 포함
@RequiredArgsConstructor
public class PurchaseItemService implements PurchaseItemUseCase {
    private final IdempotencyPort idempotencyPort;
    private final LoadPreviousResultPort loadPreviousResultPort;
    private final SavePurchaseResultPort savePurchaseResultPort;
    private final LoadPointWalletPort loadPointWalletPort;
    private final SavePointWalletPort savePointWalletPort;
    private final LoadItemPort loadItemPort;
    private final SaveInventoryPort saveInventoryPort;

    @Override
    @Transactional
    public PurchaseResult execute(PurchaseItemCommand command) {
        // 1. 멱등성 선점 — UNIQUE 제약 + ON CONFLICT DO NOTHING
        boolean isNewRequest = idempotencyPort.insertIfAbsent(
                command.userId(), command.idempotencyKey());

        if (!isNewRequest) {
            return loadPreviousResultPort.load(command.idempotencyKey());
        }

        // 2. 비즈니스 로직 — wallet은 version 기반 낙관적 락
        PointWallet wallet = loadPointWalletPort.load(command.userId());
        Item item = loadItemPort.load(command.itemId());
        wallet.deduct(item.getPrice());

        // 3. 저장
        savePointWalletPort.save(wallet);
        saveInventoryPort.add(command.userId(), command.itemId());

        // 4. 결과 저장 (이후 중복 요청 시 재반환용)
        PurchaseResult result = PurchaseResult.success(item, wallet.getBalance());
        savePurchaseResultPort.save(command.idempotencyKey(), result);

        return result;
    }
}
```

### 2.4 Adapter

실제 기술 구현. Port 인터페이스를 구현한다.

**Driving Adapter (in):** 외부 요청을 받아 UseCase를 호출.

- Web Adapter: Controller, Request/Response DTO
- WebSocket Adapter: WebSocket Handler
- Scheduler: 정기 작업

**Driven Adapter (out):** UseCase가 필요한 외부 자원을 제공.

- Persistence Adapter: JPA Entity, Repository 구현체, Mapper
- Messaging Adapter: Kafka Producer/Consumer
- External Adapter: 외부 API 연동

```java
// Driven Adapter 예시 — 낙관적 락 포함
@Repository
@RequiredArgsConstructor
public class PointWalletJpaAdapter implements LoadPointWalletPort, SavePointWalletPort {
    private final PointWalletJpaRepository jpaRepository;
    private final PointWalletMapper mapper;

    @Override
    public PointWallet load(Long userId) {
        PointWalletJpaEntity entity = jpaRepository.findByUserId(userId)
                .orElseThrow(() -> new PointWalletNotFoundException(userId));
        return mapper.toDomain(entity);
    }

    @Override
    public void save(PointWallet wallet) {
        // JPA @Version으로 낙관적 락 — 동시 갱신 시 OptimisticLockingFailureException 발생
        jpaRepository.save(mapper.toEntity(wallet));
    }
}
```

---

## 3. Port 전략

### 3.1 행위 단위 세분화를 기본으로 하되, 과분화를 경계한다

Port 분리의 목적은 ISP(인터페이스 분리 원칙)를 통해 Service의 의존을 명확히 하는 것이다. 세분화는 수단이지 절대 규칙이 아니다.

**분리하는 기준:**

- command / query 경계가 다른 경우
- 외부 시스템이 다른 경우
- 트랜잭션 책임이 다른 경우

**합쳐도 되는 경우:**

- 같은 repository 성격의 강결합 행위 (load + save)
- 분리해도 항상 같이 사용되는 행위

```java
// 분리가 의미 있는 경우
public interface LoadPointWalletPort {
    PointWallet load(Long userId);
}

public interface PublishEventPort {
    void publish(DomainEvent event);
}

// 합쳐도 괜찮은 경우 — load와 save는 같은 저장소, 같은 맥락
public interface PointWalletPersistencePort {
    PointWallet load(Long userId);
    void save(PointWallet wallet);
}
```

Service에 Port가 7~10개 이상 주입되고 있다면, Service의 책임이 너무 많거나 Port가 과분화된 것이다. 이때는 설계를 재검토한다.

### 3.2 하나의 Adapter가 여러 Port를 구현할 수 있다

Port는 "호출하는 쪽"의 관점이고, Adapter는 "구현하는 쪽"의 관점이다.

```java
public class PointWalletJpaAdapter implements PointWalletPersistencePort {
    // load, save 모두 구현
}
```

---

## 4. UseCase 전략

### 4.1 UseCase 하나가 하나의 행위

```java
public interface PurchaseItemUseCase {
    void execute(PurchaseItemCommand command);
}

public interface LoadItemListUseCase {
    List<ItemDetail> execute(LoadItemListQuery query);
}
```

### 4.2 Command / Query 분리

상태를 변경하는 행위와 조회하는 행위를 네이밍으로 구분한다.

- **Command**: 상태 변경. `PurchaseItemCommand`, `DeductPointCommand`, `SendMessageCommand`
- **Query**: 조회만. `LoadItemListQuery`, `LoadSpaceDetailQuery`

이는 CQRS 아키텍처를 도입하는 것이 아니라, 네이밍 컨벤션으로 의도를 명확히 하는 것이다.

---

## 5. Mapper 전략

### 5.1 수동 Mapper

Domain Entity ↔ Persistence Entity 변환은 수동 Mapper로 처리한다.

```java
@Component
public class PointWalletMapper {

    public PointWallet toDomain(PointWalletJpaEntity entity) {
        // restore() — DB에서 읽어온 기존 데이터를 Domain으로 복원한다.
        // @Builder 대신 정적 팩토리 메서드를 사용한다. (coding.md 5.1 참조)
        return PointWallet.restore(
                entity.getId(),
                entity.getUserId(),
                entity.getBalance(),
                entity.getVersion()
        );
    }

    public PointWalletJpaEntity toEntity(PointWallet domain) {
        // Persistence Entity도 정적 팩토리 메서드로 생성한다. (coding.md 5.2 참조)
        return PointWalletJpaEntity.from(domain);
    }
}
```

**MapStruct를 사용하지 않는 이유:**

- 의존성 추가 없이 명시적 변환이 가능하다.
- AI가 생성하는 코드에서 MapStruct 설정 오류가 빈번하다.
- 이 프로젝트에서 필드가 수십 개인 Entity는 없다.

### 5.2 Mapper 위치

Mapper는 **Adapter 패키지**에 위치한다. Persistence Entity ↔ Domain Entity 변환은 인프라 쪽의 책임이다. Domain이 Persistence Entity의 존재를 알 필요가 없다.

---

## 6. 의존 방향 보장

### 6.1 ArchUnit으로 자동 검증

문서로 규칙을 정해도, 코드에서 실수로 위반할 수 있다. ArchUnit으로 의존 방향을 테스트 레벨에서 강제한다.

```java
@AnalyzeClasses(packages = "com.maeum.gohyang")
public class ArchitectureTest {

    @ArchTest
    static final ArchRule 도메인은_어댑터에_의존하지_않는다 =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..adapter..");

    @ArchTest
    static final ArchRule 도메인은_애플리케이션에_의존하지_않는다 =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..application..");

    @ArchTest
    static final ArchRule 애플리케이션은_어댑터에_의존하지_않는다 =
        noClasses()
            .that().resideInAPackage("..application..")
            .should().dependOnClassesThat()
            .resideInAPackage("..adapter..");
}
```

이 테스트를 CI에 포함시켜, 의존 방향 위반이 커밋 단계에서 잡히도록 한다.

---

## 7. 멱등성 (Idempotency)

멱등성은 "같은 요청을 여러 번 처리해도 결과가 한 번만 반영되는 것"이다. 두 레이어에서 각각 보장해야 한다.

### 7.1 핵심 원칙

**멱등성은 "조회 후 처리"로 보장하지 않는다.** `exists` 확인 → 처리 → 로그 저장 패턴은 동시 요청에서 두 요청 모두 `exists = false`를 볼 수 있는 check-then-act 경쟁 조건이 존재한다.

**멱등성은 DB 제약조건 기반의 선점으로 보장한다.** UNIQUE 제약이 걸린 테이블에 `INSERT ... ON CONFLICT DO NOTHING`을 실행하고, 삽입 성공(affected rows = 1)인 경우에만 비즈니스 로직을 진행한다. 중복이면 삽입되지 않으므로(affected rows = 0) 자연스럽게 차단된다.

```java
// ❌ 위험 — check-then-act 경쟁 조건
if (eventLogRepository.existsByEventId(eventId)) {
    return;
}
// 두 스레드가 동시에 여기까지 도달할 수 있음
processEvent(event);
eventLogRepository.save(new EventLog(eventId));

// ✅ 안전 — UNIQUE 제약 + ON CONFLICT DO NOTHING
boolean inserted = eventLogRepository.insertIfAbsent(event.eventId());
if (!inserted) {
    // 이미 처리된 이벤트. 로그 남기고 종료.
    log.info("중복 이벤트 무시: eventId={}", event.eventId());
    return;
}
// INSERT 성공 = 최초 처리. 비즈니스 로직 진행
processEvent(event);
```

예외로 흐름을 제어하지 않는다. `ON CONFLICT DO NOTHING`은 중복 시 예외 없이 affected rows = 0을 반환하므로, 정상적인 분기 처리로 멱등성을 보장한다.

### 7.2 API 레벨 멱등성

구매, 충전, 보상 수령, 신고 접수 등 상태를 변경하는 API에는 Idempotency-Key를 필수로 요구한다.

**흐름:**

1. 프론트엔드가 요청 시 고유한 `Idempotency-Key`를 헤더에 포함하여 전송한다.
2. 서버는 `(user_id, idempotency_key)` UNIQUE 제약이 걸린 테이블에 `INSERT ... ON CONFLICT DO NOTHING`을 실행한다.
3. INSERT 성공 (affected rows = 1) → 비즈니스 로직 수행 → 결과 저장.
4. INSERT 실패 (affected rows = 0) → 이전 처리 결과를 조회하여 재반환한다.

```java
// API 레벨 멱등성 — 아이템 구매 예시
@Transactional
public PurchaseResult execute(PurchaseItemCommand command) {
    // 1. 멱등성 선점 (UNIQUE 제약, ON CONFLICT DO NOTHING)
    boolean isNewRequest = idempotencyPort.insertIfAbsent(
            command.userId(), command.idempotencyKey());

    if (!isNewRequest) {
        // 이미 처리된 요청 — 이전 결과 반환
        return loadPreviousResultPort.load(command.idempotencyKey());
    }

    // 2. 비즈니스 로직 수행
    PointWallet wallet = loadPointWalletPort.load(command.userId());
    Item item = loadItemPort.load(command.itemId());
    wallet.deduct(item.getPrice());

    savePointWalletPort.save(wallet);
    saveInventoryPort.add(command.userId(), command.itemId());

    // 3. 결과 저장 (이후 중복 요청 시 재반환용)
    PurchaseResult result = PurchaseResult.success(item, wallet.getBalance());
    savePurchaseResultPort.save(command.idempotencyKey(), result);

    return result;
}
```

**Idempotency-Key 정책:**

- Key는 프론트엔드에서 UUID로 생성한다.
- 같은 Key로 다른 payload가 오면 409 Conflict를 반환한다.
- Key 보존 기간은 용도에 따라 다르다:

| 유형 | 보존 기간 | 이유 |
|------|-----------|------|
| 포인트 사용 (구매) | 영구 보존 | 금액성 거래. 추적 필요 |
| 포인트 획득 (광고 보상) | 영구 보존 | 광고 SDK callbackId 기준. 중복 지급 방지 |
| 신고 접수 | 7일 | 같은 대상에 대한 재신고는 허용 필요 |

### 7.3 Kafka Consumer 멱등성

Kafka는 At-least-once 전달을 기본으로 한다. 같은 이벤트가 중복 소비될 수 있으므로, Consumer도 UNIQUE 제약 기반으로 멱등성을 보장한다.

API 멱등성과 달리, Kafka Consumer는 응답을 기다리는 호출자가 없다. 따라서 중복 시 이전 결과를 반환할 필요 없이, 처리를 건너뛰고 로그를 남긴다.

```java
// Kafka Consumer — 신고 누적 → 제재 처리 이벤트
@KafkaListener(topics = "report-threshold")
@Transactional
public void handleReportThresholdEvent(ReportThresholdEvent event) {
    boolean isNewEvent = processedEventRepository.insertIfAbsent(event.eventId());

    if (!isNewEvent) {
        log.info("[Kafka] 중복 이벤트 무시: topic=report-threshold, eventId={}", event.eventId());
        return;
    }

    // 제재 처리 로직
    UserSanction sanction = UserSanction.fromReport(event);
    saveSanctionPort.save(sanction);
    log.info("[Kafka] 제재 처리 완료: userId={}, eventId={}", event.userId(), event.eventId());
}
```

```java
// Kafka Consumer — 구매 완료 → 알림 발송 이벤트
@KafkaListener(topics = "purchase-completed")
@Transactional
public void handlePurchaseCompletedEvent(PurchaseCompletedEvent event) {
    boolean isNewEvent = processedEventRepository.insertIfAbsent(event.eventId());

    if (!isNewEvent) {
        log.info("[Kafka] 중복 이벤트 무시: topic=purchase-completed, eventId={}", event.eventId());
        return;
    }

    // 알림 발송
    notificationPort.send(event.userId(), "아이템 구매가 완료되었습니다.");
}
```

---

## 8. 동시성 제어 (Concurrency Control)

### 8.1 PointWallet — 낙관적 락 (Optimistic Lock)

PointWallet은 금액성 aggregate로 취급한다. 모든 변경은 동시성 제어를 동반한다.

**기본 전략: version 컬럼 기반 낙관적 락**

```java
// Persistence Entity — JPA @Version
@Entity
public class PointWalletJpaEntity {
    @Id
    private Long id;
    private Long userId;
    private Long balance;

    @Version
    private Long version; // 낙관적 락
}
```

동시에 두 요청이 같은 wallet을 갱신하면, 먼저 커밋한 쪽이 성공하고 나중 쪽은 `OptimisticLockingFailureException`이 발생한다.

**충돌 시 재시도 전략:**

- 재시도 가능한 연산 (포인트 차감): 최대 3회 재시도. 재시도마다 wallet을 다시 읽어서 최신 상태에서 연산.
- 재시도 불가능한 연산 (이미 외부 효과가 발생한 경우): 재시도하지 않고 실패 처리.

### 8.2 안티패턴

- 애플리케이션에서 잔액을 읽고 계산한 뒤 저장만 하면서 락이 없는 패턴
- 재시도를 무한 루프로 돌리는 패턴
- Redis 캐시 잔액을 source of truth처럼 사용하는 패턴. 잔액의 정합성 기준은 항상 PostgreSQL이다.

### 8.3 고경합 시나리오 확장 (현재 범위 아님)

동시 요청이 매우 많아 낙관적 락 재시도가 빈번해지면:

- 해당 구간만 `SELECT FOR UPDATE` (비관적 락) 전환
- 또는 single-writer 패턴 검토

---

## 9. 동기 트랜잭션 vs 비동기 이벤트 기준

### 9.1 판단 기준

모든 것을 Kafka로 보내지 않는다. 아래 기준으로 판단한다.

**동기 트랜잭션 (같은 DB, 같은 트랜잭션):**

- 두 행위가 "같이 성공하거나 같이 실패해야" 하는 경우.
- 예: 포인트 차감 + 아이템 지급. 포인트만 빠지고 아이템이 안 들어오면 안 된다.

**비동기 이벤트 (Kafka):**

- 도메인 경계를 넘는 부수 효과. 실패해도 원래 행위를 취소하면 안 되는 경우.
- 예: 구매 완료 → 알림 발송. 알림 실패가 구매를 취소시키면 안 된다.

### 9.2 Outbox 패턴

이벤트가 유실되면 비즈니스에 실질적 피해가 가는 경우에만 Outbox를 적용한다.

**Outbox 패턴이란:**
Kafka로 직접 발행하지 않고, 같은 DB 트랜잭션으로 Outbox 테이블에 이벤트를 저장한다. 별도 프로세스가 Outbox를 읽어 Kafka로 발행한다. 이벤트 저장이 비즈니스 로직과 같은 트랜잭션이므로 이벤트 유실이 구조적으로 불가능하다.

**Outbox 이벤트 구조:**

```sql
CREATE TABLE outbox_event (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_id    VARCHAR(100) NOT NULL,    -- 대상 식별자 (userId, reportId 등)
    event_type      VARCHAR(100) NOT NULL,    -- 'PURCHASE_COMPLETED', 'REPORT_THRESHOLD'
    event_id        UUID NOT NULL UNIQUE,     -- 이벤트 고유 ID (consumer 멱등성에 사용)
    payload         JSONB NOT NULL,           -- 이벤트 내용
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING / PUBLISHED / FAILED
    retry_count     INT NOT NULL DEFAULT 0,
    occurred_at     TIMESTAMP NOT NULL,
    published_at    TIMESTAMP
);
```

**발행 프로세스:**

1. Publisher가 `status = 'PENDING'`인 이벤트를 polling (또는 CDC)으로 읽는다.
2. Kafka로 발행한다.
3. 발행 성공 시 `status = 'PUBLISHED'`, `published_at` 기록.
4. 발행 실패 시 `retry_count` 증가. 최대 재시도 횟수 초과 시 `status = 'FAILED'`.
5. Publisher 재시도로 인한 중복 발행 가능성은 허용한다. Consumer는 반드시 멱등해야 한다.

**적용 범위:**

| 이벤트 | 방식 | Outbox |
|--------|------|--------|
| 채팅 메시지 전송 | WebSocket + Cassandra 직접 저장 | ❌ |
| 채팅 욕설 분석 | Kafka (유실 시 다음 메시지에서 재감지) | ❌ |
| 포인트 관련 알림 | Kafka + Outbox | ✅ |
| 신고 → 제재 처리 | Kafka + Outbox | ✅ |

---

## 10. 이벤트 추적 (Event Tracing)

이벤트 기반 시스템에서 장애 발생 시 "이 요청이 어떤 이벤트를 낳았고, 왜 문제가 생겼는가"를 추적할 수 있어야 한다.

### 10.1 Correlation ID / Causation ID

- **correlationId**: HTTP 요청이 시작될 때 생성. 이 요청에서 파생된 모든 이벤트가 동일한 correlationId를 가진다.
- **causationId**: 이 이벤트를 발생시킨 직접적인 원인의 ID. 이벤트 체인을 역추적할 때 사용.
- **eventId**: 이벤트 자체의 고유 ID. Consumer 멱등성에 사용.

```java
public record DomainEvent(
    String eventId,         // 이벤트 고유 ID (UUID)
    String correlationId,   // 최초 요청 추적 ID
    String causationId,     // 이 이벤트의 원인 ID
    String eventType,       // 이벤트 타입
    Instant occurredAt,     // 발생 시각
    Object payload          // 이벤트 내용
) {}
```

모든 로그와 이벤트에 correlationId를 포함시켜, 하나의 요청에서 파생된 전체 흐름을 추적할 수 있도록 한다. 상세 구현은 개발 단계에서 구체화한다.
