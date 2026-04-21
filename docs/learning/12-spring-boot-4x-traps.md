# 12. Spring Boot 4.x 자동구성·설정 함정 모음

> 작성일: 2026-04-07 ~ 2026-04-13
> 맥락: Spring Boot 3.5 → 4.0으로 올린 뒤 **자동구성 모듈 분리**와 **프로퍼티 네임스페이스 재정리** 때문에 같은 패턴의 함정이 Phase 1(Flyway)과 Phase 3(Cassandra·Kafka)에서 반복 등장했다.
>
> 원본: 이 문서는 구 `12-spring-boot-4x-modular-autoconfigure.md` + `14-cassandra-springboot4x-setup.md`를 병합한 것이다. 2026-04-21 리팩토링.

---

## 왜 이 노트가 필요한가

Spring Boot 4.x 업그레이드에서 발견한 함정이 **공통 패턴**을 이룬다.
하나하나는 사소해 보이지만, 3.x 스타일의 자료를 보고 따라 하면 매번 같은 곳에서 막힌다.

**공통 패턴 한 줄 요약:**
> 4.x는 `spring-boot-autoconfigure` 하나에 몰아넣던 자동 구성과 프로퍼티 네임스페이스를 **기술별 모듈로 쪼개고 이름을 재정리했다.** 마이그레이션 과정에서 이 변화가 조용히 드러난다.

---

## 함정 A — 자동구성 모듈이 분리됐다 (Flyway 누락 사례)

### 증상

Flyway 의존성(`flyway-core`, `flyway-database-postgresql`)을 추가했는데 마이그레이션이 실행되지 않았다. Hibernate `ddl-auto: validate`가 `Schema validation: missing table [user_local_auth]`를 던지며 Spring 컨텍스트 기동이 실패했다.

테스트 로그에 Flyway 관련 출력이 전혀 없었다. `spring-boot-autoconfigure` 4.x JAR의 `AutoConfiguration.imports`를 열어보니 Flyway 항목이 없었다.

```bash
# Spring Boot 3.x: 156개 자동 구성
# Spring Boot 4.x: 12개 자동 구성
```

### 원인

Spring Boot 4.x에서 자동 구성이 **기술 영역별로 독립 모듈로 빠져나갔다.**

| Spring Boot 3.x | Spring Boot 4.x |
|----------------|----------------|
| `spring-boot-autoconfigure` (156개) | `spring-boot-autoconfigure` (12개) + 개별 모듈 |
| Flyway 자동 구성 포함 | `spring-boot-flyway` 모듈로 분리 |
| JPA 자동 구성 포함 | `spring-boot-data-jpa` 모듈로 분리 |

`spring-boot-starter-*`를 쓰면 해당 모듈이 자동으로 포함된다. 하지만 `flyway-core`를 **스타터 없이 직접 추가**하면 자동 구성 모듈이 누락된다.

### 해결

```kotlin
// Spring Boot 4.x에서 Flyway 자동 구성이 별도 모듈로 분리됨
implementation("org.springframework.boot:spring-boot-flyway")
implementation("org.flywaydb:flyway-core")
implementation("org.flywaydb:flyway-database-postgresql")
```

버전은 Spring Boot BOM이 관리하므로 명시 불필요.

### 확인 방법

자동 구성 부재가 의심될 때:

```bash
# 특정 기술의 자동 구성 존재 여부 확인
unzip -p ~/.gradle/caches/.../spring-boot-autoconfigure-4.x.x.jar \
  "META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports" \
  | grep -i flyway
# 결과가 없으면 별도 모듈 필요
```

또는 `spring.autoconfigure.report=true` 후 CONDITIONS EVALUATION REPORT에서 부재 여부 확인.

### 교훈

**Spring Boot 4.x에서 라이브러리를 직접 추가할 때는 대응하는 `spring-boot-*` 모듈도 함께 추가해야 한다.** 스타터를 쓰면 자동 포함되지만, 코어 라이브러리만 추가하면 자동 구성이 동작하지 않는다. **증상이 조용하다는 게 함정이다** — 예외 없이 그냥 실행되지 않는다.

---

## 함정 B — 프로퍼티 네임스페이스가 바뀌었다 (Cassandra·Kafka 공통)

### 증상

Spring Context가 `localhost:9042`에 연결 시도하다 실패. `@DynamicPropertySource`로 Testcontainers 포트를 주입했는데 무시됐다.

### 원인

Spring Boot 3.x까지는 `spring.data.cassandra.*`였지만, Spring Boot 4.x에서는 **`spring.cassandra.*`로 변경됐다.**

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

이 패턴은 Kafka에서도 똑같이 발생했다. 모듈형 자동 구성으로 재편되면서 프로퍼티 네임스페이스가 전반적으로 재정리됐다.

### 교훈

**4.x 마이그레이션 이슈를 검색할 때 3.x 스타일 답변에 유혹되지 말 것.** 공식 migration note를 먼저 확인하고, 모듈명·프로퍼티명이 바뀌었을 가능성을 상수로 의심한다.

---

## 함정 C — Cassandra Testcontainers 아티팩트 이름

### 증상

`org.testcontainers:cassandra` 의존성을 Gradle이 찾지 못함.

### 원인

Spring Boot BOM이 관리하는 Testcontainers Cassandra 모듈의 아티팩트 이름이 바뀌었다.

```kotlin
// 잘못됨
testImplementation("org.testcontainers:cassandra")

// 올바름
testImplementation("org.testcontainers:testcontainers-cassandra")
```

BOM이 재정리될 때 모듈명도 함께 바뀌는 경우가 있다. `gradle dependencies`로 해결된 좌표를 확인하는 습관을 들이면 빠르다.

---

## 함정 D — Spring Data Cassandra는 Keyspace를 만들지 않는다

### 증상

`schema-action: create-if-not-exists` 설정으로 테이블 자동 생성을 기대했으나, keyspace 자체가 없어서 Spring Context 초기화 실패.

### 원인

`schema-action`은 **keyspace가 이미 존재한다고 가정**하고 그 안에서 테이블만 관리한다. Keyspace 생성은 Spring Data Cassandra의 책임 범위가 아니다.

### 해결

테스트에서는 컨테이너 기동 후, Spring Context 초기화 전에 `CqlSession`으로 직접 생성.

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

운영에서는 인프라 프로비저닝 단계(Terraform·수동 CQL)에서 keyspace를 미리 생성한다. `application.yml`의 `schema-action: none`이 운영 기본값이다.

---

## 함정 E — Cassandra local-datacenter 기본값

`CqlSession.builder().withLocalDatacenter(...)` 값을 뭘로 써야 할지 모를 때:

- Cassandra single-node 컨테이너의 기본 datacenter 이름은 **`datacenter1`** (Cassandra가 초기 기동 시 자동 부여)
- 운영에서 다중 datacenter 구성하면 이름이 달라지므로 환경 변수로 주입

```java
.withLocalDatacenter("datacenter1")
```

---

## 보너스 — `@PrimaryKeyClass` 설계

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

- `@EqualsAndHashCode`가 없으면 Cassandra SDK가 row를 구분하지 못해 예기치 않은 동작이 발생한다
- `ordinal`은 키 컬럼 순서(0부터 시작)
- `PARTITIONED`는 파티션 키, `CLUSTERED`는 클러스터링 키

---

## 한 줄로 기억할 것

| 함정 | 한 줄 요약 |
|------|-----------|
| A. 자동구성 모듈 분리 | 라이브러리 직접 추가 시 `spring-boot-<기술>` 모듈도 함께 |
| B. 프로퍼티 네임스페이스 | `spring.data.<기술>` → `spring.<기술>`로 재정리됨 |
| C. Testcontainers 아티팩트 | BOM 버전 올릴 때 아티팩트 좌표 재확인 |
| D. Cassandra keyspace | Spring Data Cassandra는 keyspace 만들지 않음. 앱 기동 전에 존재해야 함 |
| E. datacenter 이름 | 기본값 `datacenter1` |
