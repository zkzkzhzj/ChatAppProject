# Spring Boot 4.x 모듈형 자동 구성 — Flyway 누락 사례

> 작성일: 2026-04-07
> 관련 커밋: Phase 1 AuthController + Cucumber 테스트

---

## 무슨 일이 있었나

Flyway 의존성(`flyway-core`, `flyway-database-postgresql`)을 추가했는데 마이그레이션이 실행되지 않았다.
Hibernate `ddl-auto: validate`가 `Schema validation: missing table [user_local_auth]`를 던지며 Spring 컨텍스트 기동에 실패했다.

테스트 로그에 Flyway 관련 출력이 전혀 없었다. `spring-boot-autoconfigure` 4.x JAR의 `AutoConfiguration.imports`를 열어보니 Flyway 항목이 없었다.

```bash
# Spring Boot 3.x: 156개 자동 구성
# Spring Boot 4.x: 12개 자동 구성
```

---

## 원인

Spring Boot 4.x에서 자동 구성(AutoConfiguration)이 **별도 모듈로 분리**됐다.

Spring Boot 3.x까지는 `spring-boot-autoconfigure` 하나에 모든 자동 구성이 들어있었다.
Spring Boot 4.x부터는 각 기술 영역이 독립 모듈로 빠져나갔다.

| Spring Boot 3.x | Spring Boot 4.x |
|----------------|----------------|
| `spring-boot-autoconfigure` (156개) | `spring-boot-autoconfigure` (12개) + 개별 모듈 |
| Flyway 자동 구성 포함 | `spring-boot-flyway` 모듈로 분리 |
| JPA 자동 구성 포함 | `spring-boot-data-jpa` 모듈로 분리 |

`spring-boot-starter-*`를 쓰면 해당 모듈이 자동으로 포함된다.
하지만 `flyway-core`를 **스타터 없이 직접 추가**하면 자동 구성 모듈이 누락된다.

---

## 해결

`build.gradle.kts`에 `spring-boot-flyway` 추가:

```kotlin
// Spring Boot 4.x에서 Flyway 자동 구성이 별도 모듈로 분리됨
implementation("org.springframework.boot:spring-boot-flyway")
implementation("org.flywaydb:flyway-core")
implementation("org.flywaydb:flyway-database-postgresql")
```

버전은 Spring Boot BOM이 관리하므로 명시 불필요.

---

## 교훈

**Spring Boot 4.x에서 라이브러리를 직접 추가할 때는 대응하는 `spring-boot-*` 모듈도 함께 추가해야 한다.**

스타터(`spring-boot-starter-flyway` 등)를 쓰면 이 모듈이 자동으로 포함된다.
하지만 스타터 없이 코어 라이브러리만 추가하면 Spring의 자동 구성이 동작하지 않는다.

증상이 조용하다는 게 함정이다. 예외 없이 그냥 Flyway가 실행되지 않는다.

---

## 확인 방법

자동 구성이 의심될 때:

```bash
# Spring Boot 4.x에서 특정 기술의 자동 구성 존재 여부 확인
unzip -p ~/.gradle/caches/.../spring-boot-autoconfigure-4.x.x.jar \
  "META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports" \
  | grep -i flyway
# 결과가 없으면 별도 모듈 필요
```

또는 `spring.autoconfigure.report=true` 설정 후 CONDITIONS EVALUATION REPORT에서 부재 여부 확인.
