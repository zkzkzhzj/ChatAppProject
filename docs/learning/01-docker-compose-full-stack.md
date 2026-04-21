# docker-compose 전체 스택 기동 구성기

> 작성 시점: 2026-04-04
> 맥락: Spring Boot + PostgreSQL + Redis + Kafka + Cassandra를 `docker-compose up` 한 방에 기동하도록 구성하는 과정

---

## 왜 이걸 기록하는가

`docker-compose up --build` 하나로 전체 스택이 뜨는 건 당연해 보이지만,
실제로 하려면 **서비스 기동 순서**, **컨테이너 간 네트워크 통신**, **멀티스테이지 빌드** 같은 것들을 제대로 이해해야 한다.
삽질한 포인트들이 있어서 기록해둔다.

---

## 겪은 문제 1: Kafka `ADVERTISED_LISTENERS` 설정 실수

### 현상

Spring Boot 컨테이너가 Kafka에 메시지를 보낼 때 연결 실패.

### 원인

```yaml
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092  # 잘못된 설정
```

`localhost`는 Kafka 컨테이너 자신을 가리킨다.
Spring Boot 컨테이너 입장에서 `localhost`는 자기 자신이므로 Kafka를 찾지 못한다.

### 해결

```yaml
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092  # 서비스 이름 사용
```

docker-compose 네트워크에서 컨테이너 간 통신은 **서비스 이름이 호스트명**이다.
`kafka`라는 이름이 DNS처럼 동작해서 다른 컨테이너가 찾을 수 있다.

### 배운 것

`ADVERTISED_LISTENERS`는 "Kafka 클라이언트에게 '나한테 연결할 때 이 주소 써라'라고 광고하는 주소"다.

- 호스트(내 PC)에서 접근할 때: `localhost:9092`
- 컨테이너끼리 통신할 때: `kafka:9092` (서비스명)

두 가지를 동시에 지원하려면 리스너를 2개로 분리해야 하는데,
현재는 컨테이너 간 통신만 필요하므로 `kafka:9092` 하나로 충분하다.

---

## 겪은 문제 2: Cassandra 자동 설정이 기동을 막음

### 현상

`docker-compose up`에서 Spring Boot가 뜨지 않음.
Cassandra 관련 연결 오류.

### 원인

Spring Boot가 classpath에 `spring-boot-starter-data-cassandra`가 있으면
자동으로 Cassandra 연결을 시도한다.
Cassandra는 초기 기동에 **60초 이상** 걸리기 때문에, Spring Boot가 준비된 Cassandra를 찾지 못한 것.

### 해결

현재 Communication 도메인에서 채팅 메시지 저장에 Cassandra를 사용 중이므로 자동 설정 제외 없이 정상 연결한다.

> **[2026-04 업데이트]** 초기에는 Cassandra 비즈니스 코드가 없어서 `CassandraAutoConfiguration`을 exclude했으나, 현재는 채팅 메시지 저장에 Cassandra를 실제 사용하므로 exclude가 불필요하다. Testcontainers로 Cassandra를 실제 기동하므로 테스트 환경에서도 exclude 없이 동작한다.

`docker-compose.yml`의 `depends_on`에 Cassandra가 포함되어 있다.

### 배운 것

Spring Boot 자동 설정은 편리하지만, 사용하지 않는 인프라가 classpath에 있으면
**있지도 않은 서비스에 연결하려다 실패**한다.
의존성을 추가할 때 "이게 자동 설정을 유발하는가"를 항상 인식해야 한다.

---

## 겪은 문제 3: `healthcheck` / `depends_on` 이해

### 현상

Spring Boot가 PostgreSQL이 준비되기 전에 기동하려다 실패.

### 해결

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

`service_healthy`는 해당 서비스의 `healthcheck`가 통과해야 다음 서비스를 시작한다는 의미.
단순히 컨테이너가 "시작됨" 상태가 아니라, **실제로 요청을 받을 수 있는 상태**를 기다린다.

### healthcheck 설계 포인트

| 서비스 | healthcheck 명령 | start_period 이유 |
|--------|-----------------|-------------------|
| PostgreSQL | `pg_isready` | 기동 빠름, 10s면 충분 |
| Redis | `redis-cli ping` | 기동 빠름 |
| Kafka | `kafka-topics.sh --list` | KRaft 초기화 30s |
| Cassandra | `nodetool status \| grep UN` | gossip 프로토콜 수렴 60s+ |
| Spring Boot | `curl actuator/health` | JVM warm-up 60s |

`start_period`는 이 시간 동안 실패해도 재시도 횟수에 포함되지 않는다.
즉, **"정상 기동에 원래 걸리는 시간"** 을 start_period로 잡고, 그 이후부터 retries로 판단한다.

---

## 멀티스테이지 Docker 빌드

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder  # 빌드용 (JDK 필요)
# ... Gradle 빌드 ...

FROM eclipse-temurin:21-jre-alpine              # 실행용 (JRE만)
COPY --from=builder /workspace/build/libs/*.jar app.jar
```

### 왜 멀티스테이지인가

- **JDK vs JRE**: 빌드할 때만 JDK가 필요. 실행 이미지에 JDK를 넣으면 불필요하게 크다.
- **보안**: 빌드 도구, Gradle wrapper, 소스 코드가 최종 이미지에 포함되지 않는다.
- **이미지 크기**: JDK 이미지 ~300MB → JRE 이미지 ~80MB

### 의존성 레이어 캐싱 트릭

```dockerfile
# 소스보다 의존성 정의 파일을 먼저 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon -q   # 이 레이어가 캐시됨

COPY src src                                 # 소스 변경 시 여기서부터 재실행
RUN ./gradlew bootJar --no-daemon -x test
```

소스 코드만 바꿨을 때 의존성 다운로드를 다시 하지 않아도 된다.
`build.gradle.kts`가 바뀌지 않으면 `dependencies` 레이어는 캐시 히트.

---

## Kafka 선택: KRaft 모드 (Zookeeper 없음)

Kafka 2.8 이전에는 Zookeeper가 필수였다. 메타데이터(브로커 목록, 토픽 파티션 등)를 Zookeeper가 관리했기 때문.

Kafka 3.0+의 KRaft 모드는 Kafka 자체가 Raft 합의 알고리즘으로 메타데이터를 관리한다.
`docker-compose`에서 서비스 하나로 충분하고, Zookeeper 컨테이너가 필요 없다.

```yaml
KAFKA_PROCESS_ROLES: broker,controller  # 브로커 + 컨트롤러 역할 동시 수행
KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
```

로컬 단일 노드에서는 이 설정으로 충분하다.
