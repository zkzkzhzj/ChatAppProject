# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> 현재 상태와 다음 할 일이 여기 있다.

---

## 현재 상태 (2026-04-05 기준)

**완료:**
- docker-compose 전체 스택 기동 (`docker-compose up --build`)
- Spring Boot 멀티스테이지 Docker 빌드 + 환경별 프로파일
- Cucumber BDD + Testcontainers 2.x 통합 테스트 환경 구축
- HealthCheck 시나리오 통과 (PostgreSQL, Redis, Kafka 실제 컨테이너 기반)
- TestAdapter 계층 구조 (TestAdapter → ActuatorTestAdapter → Steps)
- `~/.gradle/gradle.properties`에 Gradle 데몬 JDK 설정 (corretto-17)
- **Spring Boot 3.5 → 4.0.3 업그레이드 완료**
  - Testcontainers 2.x를 Spring BOM이 직접 관리 (버전 명시 불필요)
  - TestAdapter HTTP 클라이언트를 `TestRestTemplate` → `RestClient`로 교체
  - Jackson 3.x(`tools.jackson.*`)로 전환
  - `RestClient` lazy 초기화 (WebServerInitializedEvent 이후 포트 주입)
- **물리 ERD 설계 확정**
  - CHARACTER ↔ USER 1:1, SPACE ↔ USER 1:N
  - 아이템 흐름: ITEM_DEFINITION → USER_ITEM_INVENTORY → (CHARACTER_EQUIPMENT / SPACE_PLACEMENT)
  - POINT_WALLET 분리 유지 (낙관적 락 기반 동시성 제어)
  - 상세 결정 기록: `docs/architecture/erd.md` 섹션 12

**아직 없는 것:**
- 비즈니스 도메인 구현 없음 (Entity, UseCase, Adapter 전무)
- REST API 없음
- WebSocket 채팅 없음
- 프론트엔드 마을 공간 미구현

---

## 테스트 실행 방법

```bash
cd backend
./gradlew test --rerun          # 전체 테스트 (Docker 필요)
./gradlew test --rerun          # 리포트: build/reports/cucumber/cucumber.html
```

---

## 현재 기술 스택 버전

| 항목 | 버전 |
|------|------|
| Spring Boot | 4.0.3 |
| Java | 21 |
| Testcontainers | 2.x (Spring BOM 관리) |
| Cucumber | 7.34.2 |
| JJWT | 0.12.6 |

---

## TestAdapter 구조 (Spring Boot 4.x 기준)

```
HealthCheckSteps         "헬스체크 API를 호출한다" — 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter      /actuator/health, status 파싱 — URL과 파싱 방법을 안다
    ↓
TestAdapter              RestClient GET/POST, 인증 헤더 — HTTP 방법을 안다
    ↓
ScenarioContext          마지막 응답 보관 — 상태 저장만 한다
```

- `TestAdapter`는 `@Value("${local.server.port}")`로 랜덤 포트를 주입받아 `RestClient`를 생성
- `exchange()` 콜백으로 4xx/5xx 응답도 예외 없이 `ResponseEntity<String>`으로 반환

---

## 현재 Phase

**Phase 0 — Foundation 진행 전**

전체 구현 로드맵: `docs/planning/phases.md`

**지금 당장 할 것:**
1. Flyway 의존성 추가 (`build.gradle.kts`)
2. `V1__initial_schema.sql` 작성 (ERD 기반 전체 스키마)
3. 앱 기동 확인

새 도메인 구현 시 반드시 `CLAUDE.md`의 워크플로우(5.1)를 따른다.

---

## 참고 문서 위치

| 필요할 때 | 파일 |
|-----------|------|
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 도메인 경계 | `docs/architecture/domain-boundary.md` |
| 패키지 구조 | `docs/architecture/package-structure.md` |
| ERD (설계 결정 포함) | `docs/architecture/erd.md` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| 구현 로드맵 (Phase) | `docs/planning/phases.md` |
| 작업 히스토리 | `docs/history/YYYY-MM-DD.md` |
| Spring Boot 4.x 업그레이드 기록 | `docs/learning/07-spring-boot-4-upgrade.md` |
| 세팅 학습 기록 | `docs/learning/` |
