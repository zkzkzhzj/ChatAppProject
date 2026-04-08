# 14 — Cassandra + Spring Boot 4.x 설정 함정

> Phase 3 구현 중 마주친 문제들을 기록한다.
> Kafka 설정 문제(learning/12)와 같은 패턴이 반복됐다.

---

## 문제 1: 잘못된 프로퍼티 네임스페이스

### 증상

Spring Context가 `localhost:9042`에 연결 시도하다 실패.
`@DynamicPropertySource`로 Testcontainers 포트를 주입했는데 무시됨.

### 원인

Spring Boot 3.x까지는 `spring.data.cassandra.*`였지만,
Spring Boot 4.x에서는 **`spring.cassandra.*`로 변경됐다.**

```yaml
# 잘못됨 (3.x 스타일)
spring:
  data:
    cassandra:
      keyspace-name: gohyang

# 올바름 (4.x 스타일)
spring:
  cassandra:
    keyspace-name: gohyang
```

`@DynamicPropertySource`도 동일하게 수정해야 한다.

```java
// 잘못됨
registry.add("spring.data.cassandra.contact-points", ...);

// 올바름
registry.add("spring.cassandra.contact-points", ...);
```

이 패턴은 Kafka(learning/12)에서도 똑같이 발생했다.
Spring Boot 4.x는 모듈형 자동 구성으로 변경되면서 프로퍼티 네임스페이스가 전반적으로 재정리됐다.

---

## 문제 2: Testcontainers 아티팩트 이름

### 증상

`org.testcontainers:cassandra` 의존성이 Gradle에서 찾을 수 없음.

### 원인

Spring Boot BOM이 관리하는 Testcontainers Cassandra 모듈의 아티팩트 이름이 바뀌었다.

```kotlin
// 잘못됨
testImplementation("org.testcontainers:cassandra")

// 올바름
testImplementation("org.testcontainers:testcontainers-cassandra")
```

---

## 문제 3: Spring Data Cassandra가 keyspace를 직접 생성하지 않는다

### 증상

`schema-action: create-if-not-exists` 설정으로 테이블을 자동 생성하려 했으나,
keyspace 자체가 없어서 Spring Context 초기화 실패.

### 원인

`schema-action`은 **keyspace가 이미 존재한다고 가정**하고 그 안에서 테이블만 관리한다.
keyspace 생성은 Spring Data Cassandra의 책임 범위가 아니다.

### 해결

테스트 컨테이너 기동 후, Spring Context 초기화 전에 `CqlSession`으로 keyspace를 직접 생성한다.

```java
static {
    Startables.deepStart(postgres, redis, kafka, cassandra).join();

    try (CqlSession session = CqlSession.builder()
            .addContactPoint(cassandra.getContactPoint())
            .withLocalDatacenter("datacenter1")
            .build()) {
        session.execute(
            "CREATE KEYSPACE IF NOT EXISTS gohyang " +
            "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
        );
    }
}
```

운영 환경에서는 인프라 프로비저닝 단계(Terraform, 수동 CQL 등)에서 keyspace를 미리 생성한다.
`application.yml`의 `schema-action: none`은 운영 환경 기본값이다.

---

## 문제 4: local-datacenter 이름

### 증상

`CqlSession.builder().withLocalDatacenter(...)` 값을 뭘로 써야 할지 모름.

### 원인

Cassandra single-node 컨테이너의 기본 datacenter 이름은 **`datacenter1`** 이다.
이 이름은 Cassandra가 처음 기동될 때 자동으로 부여하는 기본값이다.

```java
.withLocalDatacenter("datacenter1")
```

운영 환경에서 다중 datacenter를 구성하면 이름이 달라진다. 그 때는 환경 변수로 주입한다.

---

## PrimaryKeyClass 설계

Cassandra Composite Primary Key는 `@PrimaryKeyClass`로 표현한다.

```java
@PrimaryKeyClass
@EqualsAndHashCode  // Cassandra SDK가 동등성 비교에 사용 — 필수
public class MessageKey implements Serializable {

    @PrimaryKeyColumn(name = "chat_room_id", ordinal = 0,
            type = PrimaryKeyType.PARTITIONED)
    private Long chatRoomId;

    @PrimaryKeyColumn(name = "created_at", ordinal = 1,
            type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private Instant createdAt;

    @PrimaryKeyColumn(name = "id", ordinal = 2,
            type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private UUID id;
}
```

- `@EqualsAndHashCode`가 없으면 Cassandra SDK가 row를 구분하지 못해 예기치 않은 동작이 발생한다.
- `ordinal`은 키 컬럼의 순서다. 0부터 시작.
- `PARTITIONED` 컬럼이 파티션 키, `CLUSTERED` 컬럼이 클러스터링 키다.
