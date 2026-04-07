# JPA Persistence Entity 패턴

> 작성 시점: 2026-04-06
> 맥락: Phase 1 Identity Persistence Layer 구현 중 결정한 내용.
> 규칙 자체는 `docs/conventions/coding.md` 섹션 5.2에 있고, 여기서는 배경과 이유를 기록한다.

---

## 1. JPA Entity에 `@Builder` 쓰지 않는 이유

`@Builder`는 모든 필드를 빠뜨려도 컴파일이 통과된다.

```java
// 컴파일 OK — userId, passwordHash 없이도 빌드됨
UserLocalAuthJpaEntity.builder()
    .email("test@test.com")
    .build();
// → DB INSERT 시 NOT NULL 제약 위반 또는 NPE
```

JPA Entity는 저장 시점에 **반드시 유효한 상태**여야 한다.
김영한 ORM에서 강조하는 원칙이기도 하다.

**선택한 패턴: 정적 팩토리 메서드**

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
Domain Entity의 `newMember()` / `restore()` 패턴과 동일한 철학이다.

---

## 2. Port vs 구현체 내부 — 네이밍 규칙 적용 범위

Port (out) 인터페이스는 비즈니스 언어로 명명한다는 규칙이 있다.
이 규칙은 **Port 인터페이스에만 적용**된다. 구현체 내부는 해당 없다.

```
CheckEmailDuplicatePort.isEmailTaken()      ← Port: 비즈니스 언어 (규칙 적용)
    → UserPersistenceAdapter.isEmailTaken() ← 구현체: Port를 implements
        → UserLocalAuthJpaRepository
               .existsByEmail()             ← JPA 내부: 기술 언어 허용
```

`UserLocalAuthJpaRepository`는 `persistence` 패키지 안에 숨겨진 구현 세부사항이다.
외부에서 직접 접근하지 않으므로(package-private) JPA 파생 쿼리 이름을 써도 무방하다.

---

## 3. Adapter의 책임 범위 — DB 쿼리 개수는 관계없다

`saveWithLocalAuth`는 내부적으로 2번의 DB 저장을 한다.
이게 "책임이 너무 많다"는 것 아닌가 고민했지만, 결론은 **아니다.**

Port는 비즈니스 의도를 하나만 표현한다: `"유저와 로컬 인증 정보를 함께 저장한다"`
Adapter는 그 의도를 기술적으로 구현한다: 2개 테이블에 나눠 저장

만약 Port를 쪼개서 Service에서 조율하게 하면:

```java
// Service가 persistence 구현 세부사항을 알게 된다 — 잘못된 방향
User savedUser = saveUserPort.saveUser(newUser);
saveLocalAuthPort.saveLocalAuth(savedUser.getId(), credentials);
```

Service는 "왜 유저 저장이 2번인지" 알 이유가 없다.
내일 테이블이 추가되어 3번 저장이 필요해져도 Service는 몰라야 한다.

**결론:** Port의 의도가 단일하면, Adapter 내부 DB 쿼리가 몇 개든 책임 과다가 아니다.
Adapter 메서드가 길어지면 private 메서드로 단계를 분리해 가독성을 높인다.

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
