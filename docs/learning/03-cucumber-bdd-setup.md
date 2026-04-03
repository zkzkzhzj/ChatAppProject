# Cucumber BDD + Spring Boot 통합 설정기

> 작성 시점: 2026-04-04
> 맥락: JUnit 4 기반 Cucumber 예제가 많지만, 이 프로젝트는 JUnit Platform(JUnit 5) 기반이다.
>        Spring Boot 3.x + Cucumber 7.x 조합 설정과 TestAdapter 패턴 설계.

---

## JUnit 4 방식 vs JUnit Platform 방식

인터넷에 Cucumber 예제를 찾으면 대부분 이런 코드가 나온다:

```java
// JUnit 4 방식 (이 프로젝트에서는 사용하지 않는다)
@RunWith(Cucumber.class)
@CucumberOptions(features = "...", glue = "...")
public class CucumberTestSuite {}
```

Spring Boot 3.x는 JUnit 5(JUnit Platform)를 기본으로 사용한다.
`@RunWith`는 JUnit 4 전용이다. JUnit Platform에서는 아래 방식을 쓴다:

```java
// JUnit Platform 방식
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "...")
public class CucumberTestSuite {}
```

---

## 각 클래스의 역할과 존재 이유

### `BaseTestContainers` (추상 클래스)
컨테이너를 "언제, 어떻게 기동하는가"를 한 곳에서 관리한다.

```java
public abstract class BaseTestContainers {
    protected static final PostgreSQLContainer postgres = ...;
    protected static final GenericContainer<?> redis = ...;
    protected static final KafkaContainer kafka = ...;

    static {
        Startables.deepStart(postgres, redis, kafka).join();  // 병렬 기동, 완료 대기
    }

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        // ...
    }
}
```

**설계 포인트:**
- `static {}` 블록: JVM이 클래스를 처음 로드할 때 딱 한 번 실행된다. 이 클래스를 extends하는 테스트가 몇 개든 컨테이너는 한 번만 뜬다.
- `Startables.deepStart().join()`: 3개 컨테이너를 병렬로 기동하고 모두 준비될 때까지 기다린다. 순차 기동보다 시간이 줄어든다.
- `@DynamicPropertySource`: Spring Context 초기화 전에 컨테이너의 랜덤 포트를 프로퍼티에 주입한다. 여기에 두는 이유: 자식 클래스마다 중복 작성하지 않기 위함.

### `CucumberSpringConfig`
Cucumber에게 "Spring Context를 이렇게 만들어라"고 알려주는 선언 클래스다.

```java
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class CucumberSpringConfig extends BaseTestContainers {
}
```

몸체가 비어있어도 이 클래스가 반드시 필요한 이유:
- `@CucumberContextConfiguration`은 구체 클래스에 붙어야 한다. `BaseTestContainers`는 `abstract`라 Cucumber가 직접 사용할 수 없다.
- 이 클래스가 선언하는 것들은 모두 의미 있는 설계 결정이다: "Cucumber가 Spring과 연동한다", "실제 서버를 띄운다(RANDOM_PORT)", "test 프로파일을 쓴다".
- 역할이 다르다: `BaseTestContainers`는 인프라 관심사, `CucumberSpringConfig`는 Cucumber 설정 관심사.

몸체가 없어도 목적이 있는 클래스는 Spring에서 흔하다:
```java
@Configuration
@EnableWebSecurity
@Import(SomeConfig.class)
public class SecurityConfig {}  // 메서드 없어도 의미 있음
```

### `CucumberTestSuite`
IDE와 Gradle에서 Cucumber 전체를 실행하는 단일 진입점이다.

이 클래스를 실행하면 `features/` 하위 모든 `.feature` 파일이 실행된다.
없으면 `.feature` 파일을 하나씩 찾아 실행해야 한다.

### `ScenarioContext`
Cucumber의 Given → When → Then 단계 사이에 상태를 전달한다.

```java
@ScenarioScope   // 시나리오마다 새 인스턴스 생성, 종료 시 폐기
@Component
public class ScenarioContext {
    private ResponseEntity<String> lastResponse;
}
```

Cucumber는 각 Step을 별도 메서드로 실행하기 때문에, When에서 받은 HTTP 응답을 Then에서 검증하려면 어딘가에 저장해야 한다. Step 클래스의 instance field에 저장하면 시나리오 간 오염이 발생할 수 있으므로 `@ScenarioScope` 빈에 위임한다.

### `TestAdapter`
`RestClient` 사용법이 도메인별 Step마다 반복되지 않도록 HTTP 공통 로직을 모은다.

헤더 설정, 응답을 `ScenarioContext`에 저장, 인증 토큰 처리 등이 여기에 있다. 새 도메인 테스트를 추가할 때 HTTP 관련 코드를 다시 짜지 않아도 된다.

**왜 RestClient인가 (Spring Boot 4.x):**
- `TestRestTemplate`은 Spring Boot 4.x에서 `spring-boot-resttestclient`라는 별도 모듈로 분리됨
- `RestClient`는 Spring 6.1+에서 도입된 현대적인 동기 HTTP 클라이언트 (Builder API 스타일)
- 테스트용 별도 모듈 없이 `spring-web`에 내장되어 추가 의존성이 불필요
- `@Value("${local.server.port}")`로 `@SpringBootTest(RANDOM_PORT)`의 랜덤 포트를 주입받아 `RestClient.create("http://localhost:" + port)`로 초기화

**왜 exchange()를 쓰는가:**
`retrieve().toEntity()`는 4xx/5xx 응답에서 예외를 던진다. 테스트에서는 오류 응답 본문과 상태 코드도 검증해야 하므로, 상태 코드에 무관하게 `ResponseEntity`를 반환하는 `exchange()` 콜백을 사용한다.

### `ActuatorTestAdapter`
Step 정의가 URL이나 JSON 파싱 방법을 몰라도 되도록 Actuator 전용 의미를 캡슐화한다.

`/actuator/health` URL과 `status` 필드 파싱이 여기에만 존재한다. Step은 "헬스체크 API를 호출한다"는 행위만 알고 어떻게 하는지는 모른다.

### `HealthCheckSteps`
`.feature` 파일의 한국어 문장과 실제 코드를 연결한다. 비즈니스 언어로 테스트 의도를 표현하는 것이 목적이다.

---

## TestAdapter 계층 구조

```
HealthCheckSteps         "헬스체크 API를 호출한다" — 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter      /actuator/health, status 파싱 — URL과 파싱 방법을 안다
    ↓
TestAdapter              HTTP GET/POST, 인증 헤더 — HTTP 방법을 안다
    ↓
ScenarioContext          마지막 응답 보관 — 상태 저장만 한다
```

새 도메인 테스트 추가 시:
1. `XxxTestAdapter extends TestAdapter` 생성
2. 도메인 의미 있는 메서드 추가
3. Step에서 `XxxTestAdapter` 주입받아 호출

`TestAdapter`의 `get()`, `post()`는 재사용, HTTP 코드는 다시 작성하지 않는다.

---

## 실행 흐름

```
CucumberTestSuite 실행
    ↓
JUnit Platform → cucumber 엔진 로드
    ↓
classpath:features/ 스캔 → .feature 파일 수집
    ↓
GLUE 패키지 스캔 → CucumberSpringConfig 발견 (@CucumberContextConfiguration)
    ↓
CucumberSpringConfig 클래스 로드 → BaseTestContainers static 블록 실행
    → postgres, redis, kafka 컨테이너 병렬 기동 → 완료 대기
    ↓
@DynamicPropertySource 실행 → 컨테이너 포트를 Spring 프로퍼티에 주입
    ↓
Spring ApplicationContext 기동 (전체 시나리오 중 1회)
    ↓
각 Scenario마다:
  ScenarioContext 인스턴스 생성
  → Given / When / Then 순서로 Step 메서드 실행
  → ScenarioContext 인스턴스 폐기
```

---

## Testcontainers 버전과 WSL2 호환성

Testcontainers 1.x에서 Docker Desktop WSL2 백엔드와 docker-java 라이브러리 간 named pipe 호환성 문제가 있었다.
Testcontainers 2.0.3으로 업그레이드 후 이 문제가 해결되었다.

상세 내용은 [02-testcontainers-wsl2-issue.md](02-testcontainers-wsl2-issue.md) 참조.

---

## Spring Boot 4.x 업그레이드와 TestAdapter 변경

Spring Boot 3.5 → 4.0.3으로 업그레이드하면서 `TestAdapter`의 HTTP 클라이언트도 교체했다.

상세 내용은 [07-spring-boot-4-upgrade.md](07-spring-boot-4-upgrade.md) 참조.
