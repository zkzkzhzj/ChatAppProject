# AI 분석 총체적 문서 — 마음의 고향

> 작성 시점: 2026-04-04
> 작성 주체: Claude Sonnet 4.6 (AI 페어 프로그래밍 파트너)
> 대상 범위: 프로젝트 초기 세팅 ~ Cucumber BDD 통합 테스트 환경 구축까지

---

## 1. 서비스 개요

**마음의 고향**은 대화가 그리운 사람을 위한 장소 기반 의사소통 서비스다.

단순 채팅 서비스가 아니라 **인터랙티브 2D 마을**이라는 공간 개념이 핵심이다. 유저는 마을에 들어와 캐릭터를 조작하고, 자기 공간(집)을 꾸미며, NPC 또는 다른 유저와 자연스럽게 대화한다. "채팅"이 기능이 아니라 마을에서 살아가면서 일어나는 행위가 되는 것이 차별점이다.

**핵심 가치:** "대화가 그리운 사람을 위한 안식처" — 모든 기술적 결정의 기준이 이 한 문장이다.

**경쟁 서비스와의 차별점:**

| 서비스 | 한계 |
|--------|------|
| 카카오톡 익명채팅 | 공간 없음, 감성적 경험 없음 |
| 블라인드 | 직장인 한정, 공간 개념 없음 |
| ZEP / 게더타운 | "누구를 위한 것인지"가 없음. 업무 중심. |

마음의 고향은 정서적 목적이 명확하고, 웹 기반으로 설치 없이 진입 장벽을 최소화한다.

---

## 2. 기술 스택 선정과 이유

```
백엔드:  Java 21 / Spring Boot 4.0.3 / Gradle Kotlin DSL
DB:      PostgreSQL (관계형) · Cassandra (채팅 메시지) · Redis (캐시/세션)
메시징:  Kafka (도메인 간 비동기 이벤트)
통신:    WebSocket(STOMP) · WebRTC(추후)
프론트:  Next.js(React) · Phaser.js(2D 공간)
테스트:  Cucumber BDD · Testcontainers 2.x · JUnit 5
```

### 왜 이 조합인가

**Cassandra를 채팅에 쓰는 이유:**
채팅 메시지는 write-once, 시간순 조회 패턴이다. Cassandra는 이 패턴에 최적화되어 있고 수평 확장이 자유롭다. PostgreSQL로 수억 건의 채팅 메시지를 관리하는 것은 부적합하다.

**Kafka를 도입하는 이유:**
포인트 차감 → 아이템 지급처럼 도메인 간 부수효과가 있는 이벤트는 동기 호출로 처리하면 도메인이 결합된다. Kafka로 분리하면 도메인은 이벤트만 발행하고, 어떻게 처리될지 알지 못한다. 알림 발송 실패가 구매를 취소시키지 않는 것도 이 덕분이다.

**Redis의 역할:**
세션/JWT 토큰 블랙리스트, 자주 조회되는 데이터 캐시, 실시간 온라인 상태 관리에 사용한다. 잔액 같은 금액성 데이터의 source of truth는 절대 Redis가 아니라 PostgreSQL이다.

**Phaser.js를 선택한 이유:**
2D 인터랙티브 공간(타일맵, 캐릭터 이동, 충돌 감지)을 구현하기 위해서다. 일반 React 컴포넌트로는 게임적 요소를 구현하기 어렵다.

---

## 3. 아키텍처 설계

### 헥사고날 아키텍처 선택

```
Adapter (외부) → Application (유스케이스) → Domain (핵심)
```

도메인마다 사용하는 인프라가 다르다:
- Chat: Cassandra + WebSocket + Redis Pub/Sub
- Space: PostgreSQL + WebSocket
- Point: PostgreSQL + Kafka

도메인 로직이 인프라에 결합되면 기술 교체 시 도메인까지 건드려야 한다. 헥사고날은 도메인을 중심에 놓고 인프라를 교체 가능한 어댑터로 분리한다.

**중요한 태도:** 헥사고날이 정답이기 때문에 선택한 것이 아니다. 이 프로젝트의 특성에 적합한 선택이다. 교조적으로 적용하지 않으며, 외부 인프라 교체 가능성이 낮거나 도메인 규칙이 거의 없는 순수 CRUD라면 간소화를 허용한다. 단, 간소화 시 ADR에 이유를 기록한다.

### 동시성 설계

포인트 차감, 아이템 구매 같은 상태 변경 로직은 동시 요청을 반드시 고려해야 한다.

**낙관적 락 (기본 전략):**
```java
@Version
private Long version; // JPA @Version — 충돌 시 OptimisticLockingFailureException
```
동시에 두 요청이 같은 wallet을 갱신하면, 먼저 커밋한 쪽이 성공하고 나중 쪽은 예외가 발생한다. 재시도 가능한 연산은 최대 3회 재시도한다.

**멱등성 보장:**
"조회 후 처리" 패턴은 check-then-act 경쟁 조건이 있다. DB UNIQUE 제약 + `INSERT ... ON CONFLICT DO NOTHING`으로 선점하는 방식으로 구조적으로 보장한다.

```java
// 안전한 멱등성 처리
boolean inserted = idempotencyPort.insertIfAbsent(userId, idempotencyKey);
if (!inserted) {
    return loadPreviousResultPort.load(idempotencyKey); // 이전 결과 반환
}
// 비즈니스 로직 진행
```

---

## 4. 초기 세팅: 구현된 것들

### 4.1 docker-compose 전체 스택

`docker-compose up --build` 한 명령으로 전체 인프라 + Spring Boot 앱이 기동된다.

```
postgres:16-alpine    → 관계형 DB
redis:7.2-alpine      → 캐시/세션 (7.x 고정: 8.0부터 라이선스 변경)
cassandra:4.1         → 채팅 메시지 저장소
kafka:3.7.0           → KRaft 모드 (Zookeeper 없음)
Spring Boot app       → 멀티스테이지 Docker 빌드
```

**핵심 설계 결정들:**
- Kafka `ADVERTISED_LISTENERS`를 `kafka:9092`(서비스명)으로 설정. `localhost`로 설정하면 다른 컨테이너에서 접근 불가.
- Cassandra는 기동에 60초 이상 소요되고 현재 관련 코드가 없으므로 `autoconfigure.exclude`로 제외. 도메인 구현 시 추가.
- `depends_on: condition: service_healthy` — healthcheck가 통과한 후에만 다음 서비스 기동.
- 멀티스테이지 Docker 빌드로 최종 이미지에 JDK, 빌드 도구, 소스코드 미포함.

### 4.2 Spring Boot 프로파일 전략

| 환경 | 프로파일 | 인프라 |
|------|---------|--------|
| 로컬 개발 | 기본값 | 환경변수 없으면 기본값 사용 |
| Docker Compose | `docker` | 컨테이너 서비스명으로 통신 |
| 테스트 | `test` | 실제 Testcontainers |

`application.yml`의 `${VARIABLE:defaultValue}` 패턴으로 환경변수 없이도 로컬 실행 가능하게 설계했다.

### 4.3 Gradle Java Toolchain

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

시스템에 설치된 Java 버전과 무관하게 빌드/테스트는 항상 Java 21을 사용한다. Foojay Toolchain Resolver가 자동으로 JDK를 다운로드한다.

---

## 5. 테스트 환경 구축

### 5.1 Cucumber BDD 선택 이유

JUnit의 `@Test`는 기술 관점의 테스트다. Cucumber는 비즈니스 언어로 시나리오를 기술하고, 그 시나리오가 곧 테스트가 된다.

```gherkin
Scenario: 서버가 정상적으로 실행 중이다
  Given 서버가 실행 중이다
  When 헬스체크 API를 호출한다
  Then 응답 상태 코드는 200이다
  And 서비스 상태는 "UP"이다
```

개발자가 아닌 사람도 이 파일을 읽으면 무엇을 테스트하는지 이해할 수 있다. 이것이 목표다.

### 5.2 TestAdapter 계층 구조

테스트 코드가 비즈니스 로직에 강결합되지 않도록 추상화 계층을 설계했다.

```
HealthCheckSteps         비즈니스 언어만 안다 ("헬스체크 API를 호출한다")
    ↓
ActuatorTestAdapter      URL과 파싱 방법을 안다 (/actuator/health, status 필드)
    ↓
TestAdapter              HTTP 방법을 안다 (GET/POST, 인증 헤더)
    ↓
ScenarioContext          마지막 응답을 보관한다
```

새 도메인 테스트 추가 시: 도메인별 Adapter만 추가하면 된다. HTTP 관련 코드는 재작성하지 않는다.

**`@ScenarioScope`:** 각 시나리오마다 새 `ScenarioContext` 인스턴스가 생성되고 종료 시 폐기된다. 시나리오 간 상태 오염이 구조적으로 불가능하다.

### 5.3 Testcontainers 2.x 도입

테스트는 실제 PostgreSQL, Redis, Kafka 컨테이너를 기동하여 운영 환경과 동일한 조건에서 실행된다.

```
tc.postgres:16-alpine    → 실제 PostgreSQL (랜덤 포트)
tc.redis:7.2-alpine      → 실제 Redis
tc.apache/kafka:3.7.0    → 실제 Kafka
```

**`BaseTestContainers` 설계:**
```java
public abstract class BaseTestContainers {
    static {
        Startables.deepStart(postgres, redis, kafka).join(); // 병렬 기동
    }

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        // 컨테이너 랜덤 포트를 Spring에 주입
    }
}
```

- `static {}`: JVM당 한 번 실행. 테스트 클래스가 몇 개든 컨테이너는 한 번만 뜬다.
- `@DynamicPropertySource`: Spring Context 초기화 전에 실제 포트 주입.
- `CucumberSpringConfig extends BaseTestContainers`: 몸체가 비어있지만, `@CucumberContextConfiguration`과 `@SpringBootTest(RANDOM_PORT)`라는 의미 있는 설계 결정을 선언하는 클래스다.

---

## 6. 과정에서 겪은 기술적 문제와 해결

### 문제 1: Testcontainers 1.x + Docker Desktop WSL2 호환성

Testcontainers 1.x의 docker-java 라이브러리가 Docker Desktop WSL2 백엔드의 named pipe 프록시와 호환되지 않아 400 에러를 반환했다. Docker CLI(`docker-compose`)는 Go로 구현되어 정상 동작했으나 Java 클라이언트만 실패하는 현상.

**해결:** Testcontainers 2.0.3으로 업그레이드. WSL2 named pipe 호환성이 개선된 버전이다.

### 문제 2: Kafka `ADVERTISED_LISTENERS` 설정 실수

`localhost:9092`로 설정 시 다른 컨테이너에서 Kafka에 접근 불가. docker-compose 네트워크에서 `localhost`는 컨테이너 자신을 가리킨다.

**해결:** `kafka:9092`(서비스명)으로 변경. docker-compose 네트워크에서 서비스명이 DNS처럼 동작한다.

### 문제 3: Gradle 데몬 JDK 문제

시스템 Java 8로 Gradle을 실행하면 Spring Boot 3.x Gradle 플러그인이 Java 17+을 요구하여 실패. IntelliJ 번들 JDK가 Java 25 개발 버전이라 Kotlin DSL 파싱 오류 발생.

**해결:** `~/.gradle/gradle.properties`에 `org.gradle.java.home` 설정. Gradle 데몬 JDK와 빌드/테스트 JDK를 분리하여 관리.

### 문제 4: npm 공급망 공격 (axios 1.14.1)

`"axios": "^1.14.0"` 범위 지정으로 악성 버전인 1.14.1이 자동 설치될 수 있는 상태였다.

**해결:** `"axios": "1.14.0"`으로 정확한 버전 고정. `^` 범위 지정은 자동 업그레이드를 허용하므로 공급망 공격의 진입점이 된다.

---

## 7. 설계 원칙과 팀 컨벤션

### 절대 위반 금지 규칙 (아키텍처 무결성)

1. **Domain Entity에 인프라 어노테이션 금지** — `@Entity`, `@Column`은 Persistence Entity에만.
2. **도메인 간 직접 참조 금지** — Kafka 이벤트 또는 Application Service Port를 통해서만.
3. **`@Autowired` 필드 주입 금지** — 생성자 주입(`@RequiredArgsConstructor`)만 허용.
4. **`throw new RuntimeException()` 금지** — `/global/error/`의 커스텀 예외만 사용.
5. **테스트 없는 기능 완료 금지** — 기능 구현과 테스트는 하나의 작업 단위.
6. **상태 변경 로직에서 동시성 무시 금지** — 포인트 차감, 아이템 구매 등은 반드시 동시성 전략 명시.

### 의사결정 프로토콜

아래 상황에서는 멈추고 질문한다. 추측으로 진행하지 않는다:
- 요구사항에 명시되지 않은 비즈니스 엣지케이스 발견 시
- 구현 방식이 2개 이상이고 트레이드오프가 명확할 때
- ERD 변경이 필요한 상황일 때

---

## 8. 현재 상태 요약

### 완료된 것

| 항목 | 상태 |
|------|------|
| docker-compose 전체 스택 기동 | ✅ |
| Spring Boot 멀티스테이지 Docker 빌드 | ✅ |
| 환경별 프로파일 전략 (local/docker/test) | ✅ |
| Cucumber BDD 설정 | ✅ |
| Testcontainers 2.x 기반 통합 테스트 환경 | ✅ |
| HealthCheck 시나리오 통과 (실제 컨테이너) | ✅ |
| TestAdapter 계층 구조 | ✅ |
| 초기 세팅 학습 문서 6건 | ✅ |

### 아직 없는 것 (다음 단계)

- 비즈니스 도메인 구현 (Auth, User, Chat, Space, Point, Item)
- ERD 기반 JPA Entity 설계
- REST API 엔드포인트
- WebSocket 채팅 구현
- 프론트엔드 마을 공간 구현

---

## 9. 프로젝트 구조

```
ChatAppProject/
├── backend/                          Spring Boot 백엔드
│   ├── src/main/
│   │   └── resources/
│   │       ├── application.yml       기본 설정 (환경변수 오버라이드)
│   │       └── application-docker.yml docker 프로파일
│   └── src/test/
│       ├── java/.../
│       │   ├── support/
│       │   │   ├── BaseTestContainers.java    컨테이너 기반 클래스
│       │   │   ├── CucumberSpringConfig.java  Cucumber-Spring 연동
│       │   │   ├── adapter/TestAdapter.java   HTTP 추상화
│       │   │   ├── adapter/ActuatorTestAdapter.java
│       │   │   └── context/ScenarioContext.java
│       │   └── cucumber/
│       │       ├── CucumberTestSuite.java     테스트 진입점
│       │       └── steps/HealthCheckSteps.java
│       └── resources/
│           ├── features/health/health_check.feature
│           └── application-test.yml
├── frontend/                         Next.js + Phaser.js
├── docs/
│   ├── planning/                     서비스 기획 문서
│   ├── architecture/                 아키텍처 설계 문서
│   ├── conventions/                  코딩/테스트/Git 컨벤션
│   ├── specs/                        API/WebSocket/이벤트 명세
│   └── learning/                     세팅 과정 기술 학습 기록
└── docker-compose.yml                전체 스택 정의
```

---

## 10. AI 페어 프로그래밍 과정에서의 관찰

이 프로젝트는 AI(Claude)와 함께 설계하고 코드를 작성하는 방식으로 진행되었다. 과정에서 중요하게 작용한 패턴들을 기록한다.

**비판적 검토의 중요성:**
Docker-Test 참조 프로젝트의 코드 패턴을 그대로 가져오려 했을 때, 사용자가 "이게 왜 두 군데 있어야 해?"라고 질문하면서 불필요한 중복(`@DynamicPropertySource`, `@SpringBootTest` 이중화)을 제거했다. AI가 제안하는 코드도 비판적으로 검토해야 한다.

**트레이드오프를 먼저 제시해야 했던 순간:**
Testcontainers 연결 문제가 발생했을 때, H2 인메모리 DB로 전환하는 것을 먼저 실행한 뒤 설명했다. "가능한지 물어보는 거야, 해달라는 게 아니야"를 사전에 구분하지 못했다. 구현 방식이 2개 이상이고 트레이드오프가 명확한 상황에서는 실행 전 반드시 확인해야 한다.

**몸체가 없는 클래스의 존재 이유:**
`CucumberSpringConfig`처럼 코드 로직이 없고 어노테이션만 있는 클래스를 처음 보면 "이게 왜 있어?"라는 의문이 생긴다. 그러나 어노테이션 자체가 선언이고, 이 클래스가 존재하지 않으면 Cucumber가 Spring Context를 어디서 설정할지 알 수 없다. "어떻게 동작하는가"가 아니라 "어떻게 설정하는가"를 선언하는 것이 목적인 클래스다.
