# Testcontainers + Docker Desktop WSL2 연결 문제 분석

> 작성 시점: 2026-04-04
> 맥락: Cucumber 테스트 실행 시 `Could not find a valid Docker environment` 오류가 발생.
> Docker Desktop이 실행 중임에도 불구하고 Testcontainers가 Docker를 찾지 못함.
>
> ℹ️ **시점 공지 (2026-04-27 추가)**
>
> 본 노트의 이슈는 이후 Spring Boot 4.x + Testcontainers 2.x 마이그레이션([#07](./07-spring-boot-4-upgrade.md))으로 해결됨. 현재는 BaseTestContainers 패턴([#03](./03-cucumber-bdd-setup.md))이 표준. 본 노트는 **WSL2 / Docker Desktop 통신 원리를 이해하는 학습 자료**로 보존.

---

## 증상

```text
java.lang.IllegalStateException: Could not find a valid Docker environment.
  at org.testcontainers.dockerclient.DockerClientProviderStrategy
    .lambda$getFirstValidStrategy$7(DockerClientProviderStrategy.java:274)
```

로그를 보면 Testcontainers가 시도한 전략이 딱 하나다:

```text
NpipeSocketClientProviderStrategy: failed with ... 400 Bad Request (empty body)
```

`docker-compose up --build`는 정상 동작. Docker Desktop은 켜져 있음.

---

## 원인 분석

### Docker Desktop WSL2 백엔드 구조

Windows에서 Docker Desktop은 두 가지 백엔드를 지원한다:

- **Hyper-V 백엔드**: Windows 가상화 레이어에서 Linux VM 실행
- **WSL2 백엔드**: WSL2 내부에서 Docker 데몬 실행 (현재 설정)

WSL2 백엔드 구조:

```text
Windows 앱 (Java)
    ↓ named pipe: \\.\pipe\docker_engine
Docker Desktop 프록시 (Windows)
    ↓ 내부 통신
WSL2 내부 dockerd
```

`\\.\pipe\docker_engine`은 진짜 Docker 데몬이 아니라,
Docker Desktop이 WSL2 내부 데몬으로 요청을 중계하는 **프록시 파이프**다.

### docker-java vs Docker CLI의 차이

| 클라이언트 | 구현 언어 | named pipe 구현 |
|-----------|----------|----------------|
| Docker CLI (`docker`, `docker-compose`) | Go | Go 표준 named pipe 클라이언트 |
| docker-java (Testcontainers 내부) | Java | 자체 구현 named pipe 클라이언트 |

Docker CLI는 정상 동작하는데 Java(Testcontainers)만 실패한다는 것은,
**WSL2 프록시 파이프가 docker-java의 HTTP 요청 형식을 처리하지 못하는** 호환성 문제다.

프록시가 400(Bad Request)을 돌려보내는 것은,
파이프 연결 자체는 되지만 HTTP 요청 파싱 단계에서 실패한다는 의미다.

### 왜 특정 버전에서 발생하는가

Docker Desktop의 WSL2 프록시 구현이 버전에 따라 바뀌면서,
구버전 docker-java가 보내는 HTTP 요청 형식과 맞지 않게 되었을 가능성이 높다.

---

## 해결 가능한 방법들

### 방법 1: TCP 소켓 노출 (보안 주의)

Docker Desktop 설정 → "Expose daemon on tcp://localhost:2375 without TLS" 체크

```properties
# ~/.testcontainers.properties
docker.host=tcp://localhost:2375
```

로컬 개발 전용. 외부에서 포트 2375에 접근하면 Docker 데몬에 무제한 접근 가능하므로
**퍼블릭 네트워크에서는 절대 사용 금지.**

### 방법 2: Testcontainers 버전 업그레이드

docker-java 라이브러리가 업데이트되면서 WSL2 프록시와의 호환성이 개선될 수 있다.

### 방법 3: Docker Desktop → Rancher Desktop 전환

Rancher Desktop은 named pipe 구현이 달라서 docker-java와 호환성이 더 좋다.

### 방법 4 (채택): Testcontainers 포기, 임베디드 인프라 사용

Docker 의존성을 완전히 제거하는 방향:

- PostgreSQL → H2 인메모리 DB
- Kafka → `@EmbeddedKafka`
- Redis → health indicator 비활성화

---

## 방법 4를 선택한 이유와 트레이드오프

### 선택 이유

- 개발 환경에 Docker 실행 여부와 무관하게 테스트 실행 가능
- CI 환경에서 Docker-in-Docker 설정 불필요
- 테스트 실행 속도 빠름 (컨테이너 pull/기동 시간 없음)

### 트레이드오프 (포기한 것)

- **운영 환경과 다른 DB**: H2는 PostgreSQL과 100% 동일하지 않다.
  - PostgreSQL 전용 함수/타입을 쓰면 테스트에서 못 잡는다.
  - 예: `jsonb`, `uuid_generate_v4()`, 배열 타입 등
- **방언 차이**: `MODE=PostgreSQL`이 어느 정도 완화해주지만 완벽하지 않다.

### 결론

HealthCheck 같은 인프라 수준 테스트는 임베디드로 충분하다.
PostgreSQL 전용 기능을 쓰는 도메인 통합 테스트가 필요해지면
그때 Testcontainers를 별도 슈트(`@Tag("integration")`)로 분리하는 방향으로 간다.

### 후일담 — Testcontainers 2.0.3으로 해결

이 문서 작성 시점에는 Testcontainers를 포기했지만, 이후 Testcontainers 2.0.3 업그레이드에서 WSL2 named pipe 문제가 해결되었다. 현재 프로젝트는 `BaseTestContainers.java`에서 PostgreSQL, Redis, Kafka, Cassandra를 모두 Testcontainers로 기동하고 있다.

---

## `~/.testcontainers.properties` 파일에 대해

Testcontainers가 전략을 선택할 때 이 파일을 참조한다.
잘못된 설정이 있으면 올바른 전략 탐색을 방해한다.

```properties
# 빈 파일 또는 파일 없음 = 자동 탐색
docker.host=npipe:////./pipe/docker_engine  # 명시적 지정 (WSL2에서 문제 유발 가능)
```

디버깅 중 이 파일에 잘못된 값이 남아있어서 문제를 악화시켰다.
Testcontainers 설정을 건드렸다면 이 파일을 확인하는 게 첫 번째 디버깅 단계다.
