# Security 설정 패턴

> 작성 시점: 2026-04-07
> 맥락: Phase 1 Identity Security Layer 구현 중 결정한 내용.
> 규칙 자체는 `docs/conventions/coding.md` 섹션 8, 9에 있고, 여기서는 배경과 이유를 기록한다.

---

## 1. Security 허용 경로를 yml로 분리한 이유

처음에는 `SecurityConfig`에 경로를 직접 하드코딩하는 방식을 고려했다.

```java
// ❌ 하드코딩 방식
.requestMatchers("/api/v1/auth/register", "/api/v1/auth/guest", "/actuator/**").permitAll()
```

이렇게 하면 경로가 추가될 때마다 Java 파일을 수정하고 재컴파일해야 한다.
환경별로 열려야 하는 경로가 다를 때(local vs docker vs prod) 분기 처리가 복잡해진다.

**선택한 방식: `@ConfigurationProperties` + yml 분리**

```yaml
# application.yml — 모든 환경 공통
security:
  common-public-paths:
    - /api/v1/auth/register
    - /api/v1/auth/guest

# application-local.yml — 로컬 개발
security:
  env-public-paths:
    - /actuator/**

# application-docker.yml — Docker 환경
security:
  env-public-paths:
    - /actuator/health
```

환경별로 열려야 하는 경로가 명확하게 분리된다.
나중에 Swagger(`/swagger-ui/**`)나 H2 console(`/h2-console/**`)을 dev 환경에만 추가할 때도
yml만 수정하면 된다.

---

## 2. Spring Boot 리스트 프로퍼티 병합 문제

Spring Boot는 리스트 프로퍼티를 **병합하지 않고 덮어쓴다.**

```yaml
# application.yml
security:
  public-paths:        # 리스트 키 하나로 관리하면
    - /api/v1/auth/register

# application-local.yml
security:
  public-paths:        # 이 파일에서 같은 키를 정의하면 위 목록이 사라진다
    - /actuator/**     # → /api/v1/auth/register 가 없어짐
```

이 문제를 피하기 위해 키를 두 개로 분리했다:
- `common-public-paths`: 공통 경로 (application.yml에만 정의)
- `env-public-paths`: 환경별 추가 경로 (각 profile yml에 정의)

코드에서는 두 리스트를 합친다:

```java
public String[] allPublicPaths() {
    return Stream.concat(commonPublicPaths.stream(), envPublicPaths.stream())
            .toArray(String[]::new);
}
```

---

## 3. Import 규칙 추가 배경

구현 중 `java.util.Optional`을 import 없이 전체 경로로 코드 본문에 사용하는 실수가 있었다.

```java
// ❌ 전체 경로 — 코드가 지저분하고 import 실수를 숨긴다
private java.util.Optional<String> extractToken(...) { ... }
```

이 실수로 `coding.md`에 import 규칙이 없다는 것을 확인했고, 섹션 8에 추가했다.
앞으로 코드 작성 시 FQCN 사용 여부를 검토한다.

---

## 4. SecurityConfig의 위치 — 왜 `identity/adapter/in/security/`인가

Security 설정은 도메인 로직이 아닌 기술 설정이지만, `identity` 패키지 안에 두는 이유:
- 인증/인가는 Identity 도메인의 책임이다
- `package-structure.md`에 명시: "JWT 필터, Security 설정은 인증/인가 도메인의 인프라 구현"
- `global/config/`에 두면 Security 설정의 소유권이 불분명해진다

`adapter/in/`에 두는 이유:
- Security 필터는 들어오는 HTTP 요청을 처리하는 Driving Adapter다
- `JwtProvider`는 `IssueTokenPort`(out port)를 구현하지만, JWT 파싱도 담당해서
  `JwtFilter`와 함께 둬야 이해하기 쉽다. 분리하면 복잡도만 높아진다.
