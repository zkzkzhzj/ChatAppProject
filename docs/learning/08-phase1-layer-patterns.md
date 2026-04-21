# 08. Phase 1 계층 설계 패턴 — Domain · JPA · Security

> 작성 시점: 2026-04-06 ~ 2026-04-07
> 맥락: Phase 1 Identity 구현 중 각 레이어에서 결정한 패턴들을 한 곳에 모은다.
> 규칙 자체(무엇을 해야 하는가)는 `docs/conventions/coding.md`에 있고, 이 노트는 **왜 이 방식을 선택했는가**의 배경이다.
>
> 원본: 이 문서는 구 `08-domain-entity-design.md` + `10-jpa-entity-patterns.md` + `11-security-config-patterns.md`를 병합한 것이다. 2026-04-21 리팩토링.

---

## 1. Domain Entity — 정적 팩토리 메서드

Domain Entity를 처음 작성할 때 자연스럽게 `new User(...)` 생성자를 떠올린다.
이 프로젝트에서는 대신 정적 팩토리 메서드를 쓴다.

```java
// 우리가 선택한 방식
User.newMember()
User.restore(id, type, createdAt)

// 쓰지 않는 방식
new User(null, UserType.MEMBER, LocalDateTime.now())
new User(id, type, createdAt)
```

### 이유 1 — 이름이 의도를 드러낸다 (Effective Java Item 1)

생성자는 이름이 항상 클래스명과 같다. 파라미터 목록만으로는 "이게 새로 만드는 건지, 복원하는 건지" 알 수 없다.

- `User.newMember()` — "새 회원을 만든다"는 의도가 이름에 있다
- `User.restore(...)` — "DB에서 꺼낸 걸 Domain Entity로 복원한다"는 의도가 이름에 있다

### 이유 2 — 생성 경로를 명시적으로 구분한다

| 경로 | 설명 | 메서드 |
|------|------|--------|
| 신규 생성 | 비즈니스 유스케이스에서 새 Entity 생성 | `User.newMember()` |
| 복원 | Persistence Adapter가 DB → Domain 변환 | `User.restore(id, type, createdAt)` |

두 경로를 구분하지 않으면, Persistence Adapter에서 `id`가 있는 User를 만들 때와 Service에서 `id`가 없는 User를 만들 때 같은 생성자를 쓰게 된다. 혼동의 여지가 생긴다.

### 이유 3 — id는 영속화 이후에 부여된다

신규 생성 시점에는 `id`가 없다 (DB가 auto-increment로 부여). `newMember()`에서 `id = null`로 명시하면 아직 저장되지 않았음을 코드로 표현할 수 있다.

### 안티패턴으로 오해하지 말 것

정적 팩토리 메서드 자체는 Effective Java Item 1이 권장한다. 아래 경우에만 문제가 생긴다:

- `getInstance()` 같은 의미 없는 이름
- 생성자를 완전히 막아 테스트 불가능해질 때
- `Builder` 패턴이 더 적합한 복잡한 객체에 팩토리를 억지로 쓸 때

이 프로젝트의 Domain Entity는 생성 경로가 단순(2가지)하고 파라미터가 적어 팩토리 메서드가 적합하다. 필드가 많아지면 `Builder` 도입을 검토한다.

---

## 2. GUEST 설계 결정 (방식 A)

Phase 1에서 GUEST 유저 처리 방식도 결정했다.

**선택한 방식:** GUEST = DB 레코드 없이 JWT claim만으로 식별
**이유:** MVP 단계에서 복잡도를 낮추기 위함. GUEST 전환율 추적, GUEST 데이터 이어받기는 필요해질 때 추가한다.

```text
입장 시 → GUEST JWT 발급 (claim: role=GUEST, userId 없음)
채팅 시도 → 서버가 role=GUEST 확인 → 403 + 회원가입 안내
회원가입 → 새 MEMBER users 행 생성, 새 JWT 발급
```

**포기한 것:** GUEST → MEMBER 전환 시 세션 연속성 (GUEST가 머물렀던 공간 등을 이어받는 기능)

---

## 3. JPA Entity — `@Builder` 쓰지 않는 이유

`@Builder`는 모든 필드를 빠뜨려도 컴파일이 통과된다.

```java
// 컴파일 OK — userId, passwordHash 없이도 빌드됨
UserLocalAuthJpaEntity.builder()
    .email("test@test.com")
    .build();
// → DB INSERT 시 NOT NULL 제약 위반 또는 NPE
```

JPA Entity는 저장 시점에 **반드시 유효한 상태**여야 한다. 김영한 ORM에서 강조하는 원칙이기도 하다.

**선택한 패턴: 정적 팩토리 메서드** (Domain과 동일 철학)

```java
@NoArgsConstructor(access = PROTECTED)  // JPA 내부 전용
public class UserLocalAuthJpaEntity {

    public static UserLocalAuthJpaEntity create(Long userId, String email, String passwordHash) {
        UserLocalAuthJpaEntity e = new UserLocalAuthJpaEntity();
        e.userId = userId;
        e.email = email;
        e.passwordHash = passwordHash;
        e.createdAt = LocalDateTime.now();
        return e;
    }
}
```

`create()` 파라미터에 필수 필드가 모두 있으므로, 빠뜨리면 컴파일 단계에서 잡힌다.

---

## 4. Port vs 구현체 — 네이밍 규칙 적용 범위

Port (out) 인터페이스는 비즈니스 언어로 명명한다는 규칙이 있다. 이 규칙은 **Port 인터페이스에만 적용**된다. 구현체 내부는 해당 없다.

```text
CheckEmailDuplicatePort.isEmailTaken()      ← Port: 비즈니스 언어 (규칙 적용)
    → UserPersistenceAdapter.isEmailTaken() ← 구현체: Port를 implements
        → UserLocalAuthJpaRepository
               .existsByEmail()             ← JPA 내부: 기술 언어 허용
```

`UserLocalAuthJpaRepository`는 `persistence` 패키지 안에 숨겨진 구현 세부사항이다. 외부에서 직접 접근하지 않으므로(package-private) JPA 파생 쿼리 이름을 써도 무방하다.

---

## 5. Adapter의 책임 범위 — DB 쿼리 개수는 관계없다

`saveWithLocalAuth`는 내부적으로 2번의 DB 저장을 한다. "책임이 너무 많다"는 것 아닌가 고민했지만, 결론은 **아니다**.

- Port는 비즈니스 의도를 하나만 표현한다: "유저와 로컬 인증 정보를 함께 저장한다"
- Adapter는 그 의도를 기술적으로 구현한다: 2개 테이블에 나눠 저장

만약 Port를 쪼개서 Service에서 조율하게 하면:

```java
// ❌ Service가 persistence 구현 세부사항을 알게 된다
User savedUser = saveUserPort.saveUser(newUser);
saveLocalAuthPort.saveLocalAuth(savedUser.getId(), credentials);
```

Service는 "왜 유저 저장이 2번인지" 알 이유가 없다. 내일 테이블이 추가되어 3번 저장이 필요해져도 Service는 몰라야 한다.

**결론:** Port의 의도가 단일하면, Adapter 내부 DB 쿼리가 몇 개든 책임 과다가 아니다. Adapter 메서드가 길어지면 private 메서드로 단계를 분리해 가독성을 높인다.

```java
// 공개 인터페이스 — 의도만 표현
public User saveWithLocalAuth(User user, LocalAuthCredentials credentials) {
    UserJpaEntity savedUser = persistUser(user);
    persistLocalAuth(savedUser.getId(), credentials);
    return User.restore(savedUser.getId(), savedUser.getType(), savedUser.getCreatedAt());
}

// private — 기술적 단계 분리 (가독성)
private UserJpaEntity persistUser(User user) { ... }
private void persistLocalAuth(Long userId, LocalAuthCredentials credentials) { ... }
```

---

## 6. Security 허용 경로를 yml로 분리한 이유

처음엔 `SecurityConfig`에 경로를 하드코딩하는 방식을 고려했다.

```java
// ❌ 하드코딩 방식
.requestMatchers("/api/v1/auth/register", "/api/v1/auth/guest", "/actuator/**").permitAll()
```

이렇게 하면 경로가 추가될 때마다 Java 파일 수정·재컴파일이 필요하고, 환경별로 열려야 하는 경로가 다를 때(local vs docker vs prod) 분기 처리가 복잡해진다.

**선택: `@ConfigurationProperties` + yml 분리**

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

환경별로 열려야 하는 경로가 명확하게 분리된다. Swagger(`/swagger-ui/**`)나 H2 console을 dev 환경에만 추가할 때도 yml만 수정하면 된다.

---

## 7. Spring Boot 리스트 프로퍼티 병합 함정

Spring Boot는 리스트 프로퍼티를 **병합하지 않고 덮어쓴다**.

```yaml
# application.yml
security:
  public-paths:        # 하나의 키로 관리하면
    - /api/v1/auth/register

# application-local.yml
security:
  public-paths:        # 같은 키를 정의하는 순간 위 목록이 사라진다
    - /actuator/**     # → /api/v1/auth/register 소실
```

이 문제를 피하려고 키를 두 개로 분리했다:

- `common-public-paths`: 공통 경로 (application.yml에만 정의)
- `env-public-paths`: 환경별 추가 경로 (각 profile yml에 정의)

```java
public String[] allPublicPaths() {
    return Stream.concat(commonPublicPaths.stream(), envPublicPaths.stream())
            .toArray(String[]::new);
}
```

---

## 8. SecurityConfig의 위치 — 왜 `identity/adapter/in/security/`인가

Security 설정은 도메인 로직이 아닌 기술 설정이지만, `identity` 패키지 안에 두는 이유:

- 인증/인가는 Identity 도메인의 책임이다
- `package-structure.md`에 명시: "JWT 필터, Security 설정은 인증/인가 도메인의 인프라 구현"
- `global/config/`에 두면 Security 설정의 소유권이 불분명해진다

`adapter/in/`에 두는 이유:

- Security 필터는 들어오는 HTTP 요청을 처리하는 Driving Adapter다
- `JwtProvider`는 `IssueTokenPort`(out port)를 구현하지만, JWT 파싱도 담당해서 `JwtFilter`와 함께 둬야 이해하기 쉽다. 분리하면 복잡도만 높아진다.

---

## 9. Import 규칙 — FQCN 금지

구현 중 `java.util.Optional`을 import 없이 전체 경로로 코드 본문에 쓰는 실수가 있었다.

```java
// ❌ 전체 경로 — 코드가 지저분하고 import 실수를 숨긴다
private java.util.Optional<String> extractToken(...) { ... }
```

이 실수로 `coding.md`에 import 규칙이 없다는 것을 확인했고, 섹션 8에 추가했다. 코드 작성 시 FQCN 사용 여부를 검토한다.

---

## 10. coding.md와의 관계 매핑

이 문서는 "왜 이 방식을 선택했는가"의 배경이다. 실제 규칙(무엇을 해야 하는가)은 `docs/conventions/coding.md`에 있다.

| 주제 | coding.md 위치 |
|------|--------------|
| Domain Entity 정적 팩토리 메서드 | 섹션 5.1 |
| Port 메서드 비즈니스 언어 | 섹션 1 (Port 명명 원칙) |
| 파라미터 객체 (VO 묶기) | 섹션 1 (파라미터 객체 원칙) |
| 도메인별 ErrorCode enum | 섹션 4.3 |
| JPA Entity `@Builder` 금지 | 섹션 5.2 |
| Security 경로 프로퍼티 분리 | 섹션 8 |
| Import FQCN 금지 | 섹션 8 |
