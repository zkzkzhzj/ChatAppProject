# Spring Boot 3.5 → 4.0.3 업그레이드 기록

> 작성 시점: 2026-04-04
> 맥락: Testcontainers 2.x의 Spring BOM 공식 지원을 얻기 위해 Spring Boot 4.x로 업그레이드.
>        이 과정에서 TestAdapter의 HTTP 클라이언트도 교체함.

---

## 업그레이드 동기

Testcontainers 1.x에서 WSL2 named pipe 호환성 문제가 있어 2.x로 업그레이드했다.
Testcontainers 2.x는 Spring Boot 4.x의 BOM에서 공식 관리되기 때문에, 이 버전을 자연스럽게 활용하려면 Spring Boot도 4.x로 올리는 것이 깔끔하다.

Spring Boot 3.x에서도 2.x를 수동 버전 명시로 쓸 수 있지만, BOM 관리가 되면 버전 충돌 걱정이 없어진다.

---

## build.gradle.kts 변경사항

```kotlin
// 이전
id("org.springframework.boot") version "3.5.0"

// 이후
id("org.springframework.boot") version "4.0.3"
```

```kotlin
// 이전: Testcontainers 버전 명시 필요
testImplementation("org.testcontainers:testcontainers-postgresql:2.0.3")
testImplementation("org.testcontainers:testcontainers-kafka:2.0.3")

// 이후: Spring Boot 4.x BOM이 2.x를 관리하므로 버전 불필요
testImplementation("org.testcontainers:testcontainers-postgresql")
testImplementation("org.testcontainers:testcontainers-kafka")
```

```kotlin
// 제거: spring-boot-resttestclient 의존성 불필요
// testImplementation("org.springframework.boot:spring-boot-resttestclient")
```

---

## TestAdapter: TestRestTemplate → RestClient

### 왜 교체했나

Spring Boot 4.x에서 `TestRestTemplate`이 `spring-boot-resttestclient`라는 별도 모듈로 이동됐다.
이동된 것이지 제거된 것은 아니지만, 이 시점에 더 권장되는 `RestClient`로 전환하는 것이 타당하다.

| 구분 | TestRestTemplate | RestClient |
|------|-----------------|------------|
| 도입 시점 | Spring Boot 1.x | Spring 6.1 (Boot 3.2+) |
| API 스타일 | 메서드 오버로드 방식 | Builder / 체이닝 방식 |
| 모듈 | spring-boot-resttestclient (4.x 분리) | spring-web (내장) |
| 4xx/5xx 처리 | 기본적으로 예외 없이 반환 | retrieve()는 예외 발생 / exchange()는 직접 제어 |

`RestClient`를 테스트 HTTP 클라이언트로 쓰면 추가 의존성 없이 `spring-boot-starter-web`만으로 동작한다.

### 포트 주입 방식

`@SpringBootTest(RANDOM_PORT)`가 기동한 포트는 `${local.server.port}` 프로퍼티로 노출된다.

```java
@Component
public class TestAdapter {
    private final RestClient restClient;

    public TestAdapter(@Value("${local.server.port}") int port, ScenarioContext scenarioContext) {
        this.restClient = RestClient.create("http://localhost:" + port);
        // ...
    }
}
```

`@AutoConfigureRestTestClient`나 `TestRestTemplate` 빈 자동 설정 없이, 생성자에서 직접 `RestClient`를 만든다.

### exchange() vs retrieve()

```java
// retrieve(): 4xx/5xx에서 RestClientException 발생 → 테스트에서 오류 응답 검증 불가
restClient.get().uri(path).retrieve().toEntity(String.class);

// exchange(): 상태 코드 무관하게 콜백으로 응답 처리 → 테스트에 적합
restClient.get().uri(path).exchange((req, res) -> {
    String body = new String(res.getBody().readAllBytes(), StandardCharsets.UTF_8);
    return ResponseEntity.status(res.getStatusCode()).body(body);
});
```

테스트에서는 401, 403, 400 같은 오류 응답 본문과 상태 코드를 검증해야 한다.
`exchange()`가 이 용도에 적합하다.

---

## CucumberSpringConfig 변경사항

`@AutoConfigureRestTestClient` 제거. `TestRestTemplate`을 자동 구성하는 어노테이션이었으므로, `RestClient` 전환 후 불필요해졌다.

```java
// 이전
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient   // ← 제거
@ActiveProfiles("test")
public class CucumberSpringConfig extends BaseTestContainers {}

// 이후
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class CucumberSpringConfig extends BaseTestContainers {}
```

---

## 업그레이드 중 발견한 사항

### TestRestTemplate 패키지 이동 (제거가 아님)

처음에 Spring Boot 4.x에서 `TestRestTemplate`이 없다는 컴파일 에러가 발생했다.
jar를 직접 분석하니 제거가 아니라 패키지 이동이었다:

- 이전: `org.springframework.boot.test.web.client.TestRestTemplate`
- 이후: `org.springframework.boot.resttestclient.TestRestTemplate`

그러나 RestClient가 더 나은 선택이므로 이 경로로 가지 않기로 결정.

### @AutoConfigureRestTestClient 패키지 이동

마찬가지로 패키지만 이동됨:

- 이전: `org.springframework.boot.test.autoconfigure.web.client.AutoConfigureRestTestClient`
- 이후: `org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient`

`RestClient`로 전환하면서 이 어노테이션 자체가 불필요해짐.

### PostgreSQLContainer 제네릭 변경

Testcontainers 2.x에서 `PostgreSQLContainer`는 non-generic 클래스가 됨:

```java
// 1.x
PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(...);

// 2.x (raw type 사용)
PostgreSQLContainer postgres = new PostgreSQLContainer(...);
```

---

## Auto-configuration 패키지 재구조화 (중요)

Spring Boot 4.x에서 `spring-boot-autoconfigure`의 클래스들이 기능별 독립 모듈로 분리됐다.
Cassandra를 예로 들면:

| 구분 | Spring Boot 3.x | Spring Boot 4.x |
|------|-----------------|-----------------|
| 세션 | `org.springframework.boot.autoconfigure.cassandra.CassandraAutoConfiguration` | `org.springframework.boot.cassandra.autoconfigure.CassandraAutoConfiguration` |
| 데이터 | `org.springframework.boot.autoconfigure.data.cassandra.CassandraDataAutoConfiguration` | `org.springframework.boot.data.cassandra.autoconfigure.DataCassandraAutoConfiguration` |

`application-test.yml`에서 Cassandra auto-configuration을 exclude할 때 이 패키지 변경을 반영해야 한다.
그렇지 않으면 exclusion이 무효화되어 Cassandra 연결을 시도하다 실패하고 컨텍스트 초기화가 죽는다.

새로 필요한 exclusion 목록:
```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.cassandra.autoconfigure.CassandraAutoConfiguration
      - org.springframework.boot.cassandra.autoconfigure.health.CassandraHealthContributorAutoConfiguration
      - org.springframework.boot.cassandra.autoconfigure.health.CassandraReactiveHealthContributorAutoConfiguration
      - org.springframework.boot.data.cassandra.autoconfigure.DataCassandraAutoConfiguration
      - org.springframework.boot.data.cassandra.autoconfigure.DataCassandraReactiveAutoConfiguration
      - org.springframework.boot.data.cassandra.autoconfigure.DataCassandraRepositoriesAutoConfiguration
      - org.springframework.boot.data.cassandra.autoconfigure.DataCassandraReactiveRepositoriesAutoConfiguration
```

---

## 호환성 확인 결과

| 라이브러리 | 버전 | 4.x 호환 |
|-----------|------|---------|
| Cucumber | 7.34.2 | ✅ |
| Testcontainers | 2.x (BOM 관리) | ✅ |
| JJWT | 0.12.6 | ✅ |
| PostgreSQL Driver | BOM 관리 | ✅ |
