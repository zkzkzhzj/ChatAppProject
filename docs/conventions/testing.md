# Testing Strategy — 마음의 고향

---

## 1. 테스트 종류

| 종류 | 대상 | 도구 | 인프라 |
|------|------|------|--------|
| 단위 테스트 | Domain, Application Service | JUnit 5, Mockito | 없음 (순수 Java) |
| 통합 테스트 | Adapter (Persistence, Messaging) | JUnit 5, Testcontainers | 실제 DB/Kafka |
| 인수 테스트 | 주요 비즈니스 시나리오 | Cucumber BDD | Testcontainers |
| 아키텍처 테스트 | 의존 방향, 패키지 규칙 | ArchUnit | 없음 |

---

## 2. BDD 스타일 (Given-When-Then)

모든 테스트는 BDD 스타일로 작성한다.

```java
@Test
void 포인트_잔액_부족_시_예외가_발생한다() {
    // Given
    // newWallet() — 신규 생성 정적 팩토리 메서드. @Builder 대신 사용. (coding.md 5.1 참조)
    PointWallet wallet = PointWallet.newWallet(1L, 100L);

    // When & Then
    assertThatThrownBy(() -> wallet.deduct(500L))
            .isInstanceOf(InsufficientBalanceException.class);
}

@Test
void 포인트_차감_성공() {
    // Given
    PointWallet wallet = PointWallet.newWallet(1L, 1000L);

    // When
    wallet.deduct(500L);

    // Then
    assertThat(wallet.getBalance()).isEqualTo(500L);
}
```

---

## 3. 필수 규칙

- **성공 케이스와 실패 케이스(Unhappy Path)를 반드시 하나 이상 포함한다.**
- **테스트 간 독립성을 보장한다.** 실행 순서나 DB 상태에 의존하지 않는다.
- **테스트 메서드명은 한글로 행위를 명확히 기술한다.**
- **Mock이 5개를 넘으면 설계를 의심한다.** Service의 책임이 너무 많을 가능성이 높다.

---

## 4. 단위 테스트

Domain Entity와 Application Service를 대상으로 한다. 외부 의존성은 Mock 처리.

```java
class DeductPointServiceTest {

    @Mock PointWalletPersistencePort walletPort;
    @Mock IdempotencyPort idempotencyPort;
    @InjectMocks DeductPointService service;

    @Test
    void 포인트_차감_시_잔액이_갱신된다() {
        // Given
        given(idempotencyPort.insertIfAbsent(anyLong(), anyString())).willReturn(true);
        given(walletPort.load(1L)).willReturn(
                PointWallet.newWallet(1L, 1000L));

        // When
        service.execute(new DeductPointCommand(1L, 500L, "key-123"));

        // Then
        verify(walletPort).save(argThat(wallet ->
                wallet.getBalance().equals(500L)));
    }
}
```

---

## 5. 통합 테스트

Adapter 계층을 대상으로 한다. Testcontainers로 실제 인프라를 사용.

**컨테이너 공유 방식 — `BaseTestContainers` 상속:**
`@Container`를 각 테스트 클래스마다 선언하면 테스트마다 컨테이너가 새로 기동된다 (느림).
`BaseTestContainers`는 `static` 초기화로 JVM당 한 번만 컨테이너를 기동하고, 모든 테스트가 공유한다.
`@DynamicPropertySource`로 컨테이너의 랜덤 포트를 Spring 컨텍스트에 주입한다.

```java
@SpringBootTest
class PointWalletJpaAdapterTest extends BaseTestContainers {

    // 컨테이너 선언 없음 — BaseTestContainers가 postgres:16-alpine, redis, kafka를 관리한다.

    @Autowired
    PointWalletJpaAdapter adapter;

    @Test
    void 포인트_지갑을_저장하고_조회할_수_있다() {
        // Given
        // newWallet() — 신규 생성 정적 팩토리 메서드
        PointWallet wallet = PointWallet.newWallet(1L, 1000L);

        // When
        adapter.save(wallet);
        PointWallet loaded = adapter.load(1L);

        // Then
        assertThat(loaded.getBalance()).isEqualTo(1000L);
    }
}
```

---

## 6. Cucumber 인수 테스트

주요 비즈니스 시나리오를 사람이 읽을 수 있는 형태로 작성한다.

```gherkin
# features/purchase_item.feature
Feature: 아이템 구매

  Scenario: 포인트가 충분할 때 아이템을 구매할 수 있다
    Given 유저의 포인트 잔액이 1000이다
    And 가격이 500인 아이템이 존재한다
    When 해당 아이템을 구매한다
    Then 포인트 잔액이 500이 된다
    And 인벤토리에 해당 아이템이 추가된다

  Scenario: 포인트가 부족하면 구매할 수 없다
    Given 유저의 포인트 잔액이 100이다
    And 가격이 500인 아이템이 존재한다
    When 해당 아이템을 구매한다
    Then 잔액 부족 예외가 발생한다
    And 포인트 잔액은 변하지 않는다
```

---

## 7. 아키텍처 테스트 (ArchUnit) — 구현 완료

의존 방향 위반을 CI에서 자동 검증한다. 상세는 `/docs/architecture/architecture.md` Section 6, 선정 이유는 `/docs/architecture/decisions/008-ci-dx-tool-stack.md` 참조.

**검증 규칙 (동작 중):**

| 규칙 | 대상 | 내용 |
|------|------|------|
| Domain → JPA 어노테이션 금지 | `*/domain/**` | `@Entity`, `@Table`, `@Column`, `@Id` 사용 불가 (Critical Rule #1) |
| Domain → Spring 의존 금지 | `*/domain/**` | Spring Framework import 불가 |
| 도메인 간 직접 참조 금지 | identity, village, communication | 3개 도메인이 서로의 패키지를 import 불가 (Critical Rule #2) |
| Domain → Adapter 의존 금지 | `*/domain/**` → `*/adapter/**` | 도메인 계층이 어댑터를 알지 못함 |
| Application → Adapter 의존 금지 | `*/application/**` → `*/adapter/**` | 애플리케이션 계층이 어댑터를 알지 못함 |