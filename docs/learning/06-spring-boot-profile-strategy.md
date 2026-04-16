# Spring Boot 프로파일 전략

> 작성 시점: 2026-04-04
> 맥락: 로컬 개발, Docker, 테스트 환경에서 각각 다른 인프라 연결 설정이 필요한 상황

---

## 이 프로젝트의 환경 구분

| 환경 | 활성 프로파일 | 인프라 |
|------|-------------|--------|
| 로컬 개발 | (없음, 기본값) | 로컬에서 직접 실행 중인 PostgreSQL, Redis, Kafka |
| Docker Compose | `docker` | docker-compose 서비스명으로 통신 |
| 테스트 | `test` | H2 인메모리, EmbeddedKafka, Redis health 비활성화 |

---

## 파일 구조

```
src/main/resources/
  application.yml           # 기본값. 환경변수 오버라이드 지원
  application-docker.yml    # docker 프로파일 추가 설정

src/test/resources/
  application-test.yml      # test 프로파일 추가 설정
```

Spring Boot는 `application.yml`을 먼저 읽고,
활성 프로파일의 파일(`application-{profile}.yml`)이 같은 키를 덮어쓴다.

---

## `application.yml` 설계 원칙: 환경변수 기본값

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/gohyang
    username: ${DB_USERNAME:gohyang}      # 환경변수 없으면 "gohyang"
    password: ${DB_PASSWORD:gohyang}
```

`${변수명:기본값}` 문법을 쓰면:
- 로컬에서는 환경변수 없이도 기본값으로 동작
- 운영 환경에서는 환경변수를 주입해서 실제 값 사용

**기본값을 로컬 개발용으로 설계**하면 별도 설정 없이 `./gradlew bootRun`이 가능하다.

---

## `application-docker.yml`이 하는 일

```yaml
spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/gohyang  # localhost → 서비스명
  data:
    redis:
      host: redis
  kafka:
    bootstrap-servers: kafka:9092
```

docker-compose 네트워크에서는 서비스명이 호스트명으로 동작한다.
`localhost` 대신 `postgres`, `redis`, `kafka`로 접근해야 한다.

이 설정을 별도 파일로 분리한 이유:
- `application.yml`에 docker 전용 설정을 넣으면 로컬 개발 시 오히려 방해
- 프로파일로 분리하면 `docker-compose.yml`에서 `SPRING_PROFILES_ACTIVE: docker`만 지정하면 됨

---

## `application-test.yml`이 하는 일

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL
    driver-class-name: org.h2.Driver
  kafka:
    bootstrap-servers: ${spring.embedded.kafka.brokers}  # EmbeddedKafka가 주입
```

테스트 환경의 핵심 목표: **외부 의존성 없이 실행 가능**
- H2 인메모리: PostgreSQL 컨테이너 불필요
- `${spring.embedded.kafka.brokers}`: `@EmbeddedKafka`가 이 프로퍼티에 브로커 주소를 자동 주입

---

## 자동 설정 제외 패턴

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.cassandra.CassandraAutoConfiguration
```

> **[2026-04 업데이트]** 현재는 Testcontainers로 Cassandra를 실제 기동하므로 이 설정은 더 이상 사용하지 않는다. Communication 도메인에서 채팅 메시지 저장에 Cassandra를 사용 중이며, 테스트 환경에서도 Testcontainers가 Cassandra 컨테이너를 띄운다.

classpath에 의존성이 있어도 특정 자동 설정을 끌 수 있다.
언제 쓰는가:
- 해당 인프라가 아직 구현되지 않았을 때
- 테스트에서 특정 인프라 연결이 필요 없을 때
- 해당 인프라의 자동 연결이 기동을 방해할 때

---

## health indicator 비활성화

```yaml
management:
  health:
    redis:
      enabled: false
    cassandra:
      enabled: false
```

`/actuator/health`는 등록된 모든 health indicator를 실행한다.
사용하지 않는 인프라의 indicator가 활성화되어 있으면 health 상태가 DOWN이 된다.

`enabled: false`는 해당 인프라를 **health 체크 대상에서 제외**하는 것.
인프라 자체를 끄는 게 아니라 "health 체크 안 함"이다.
