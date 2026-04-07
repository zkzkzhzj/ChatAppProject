# Domain Entity 설계 패턴

> 작성 시점: 2026-04-06
> 맥락: Phase 1 Identity 구현 중 Domain Entity 작성 방식에 대해 결정한 내용을 기록한다.

---

## 왜 생성자 대신 정적 팩토리 메서드인가

Domain Entity를 처음 작성할 때 자연스럽게 `new User(...)` 형태의 생성자를 떠올린다.
그런데 이 프로젝트에서는 아래처럼 정적 팩토리 메서드를 쓴다.

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

`User.newMember()`는 "새 회원을 만든다"는 의도가 이름에 있다.
`User.restore(...)`는 "DB에서 꺼낸 걸 Domain Entity로 복원한다"는 의도가 이름에 있다.

### 이유 2 — 생성 경로를 명시적으로 구분한다

Domain Entity의 생성 경로는 두 가지다:

| 경로 | 설명 | 메서드 |
|------|------|--------|
| 신규 생성 | 비즈니스 유스케이스에서 새 Entity 생성 | `User.newMember()` |
| 복원 | Persistence Adapter가 DB → Domain 변환 | `User.restore(id, type, createdAt)` |

이 두 경로를 구분하지 않으면, Persistence Adapter에서 `id`가 있는 User를 만들 때와
Service에서 `id`가 없는 User를 만들 때 같은 생성자를 쓰게 된다. 혼동의 여지가 생긴다.

### 이유 3 — id는 영속화 이후에 부여된다

신규 생성 시점에는 `id`가 없다 (DB가 auto-increment로 부여한다).
`newMember()`에서 `id = null`로 명시하면, 이 Entity가 아직 저장되지 않았음을 코드로 표현한다.

---

## 안티패턴으로 오해하지 말 것

정적 팩토리 메서드 자체는 안티패턴이 아니다. 오히려 Effective Java가 Item 1에서 권장한다.
아래 경우에 문제가 생긴다:

- `getInstance()` 처럼 의미 없는 이름을 쓸 때
- 생성자를 `private`으로 완전히 막아 테스트가 불가능해질 때
- `Builder` 패턴이 더 적합한 복잡한 객체에 팩토리를 억지로 쓸 때

이 프로젝트의 Domain Entity는 생성 경로가 단순(2가지)하고 파라미터가 적어 팩토리 메서드가 적합하다.
필드가 많아지면 `Builder` 도입을 검토한다.

---

## coding.md와의 관계

이 문서는 "왜 이 방식을 선택했는가"의 배경을 설명한다.
실제 규칙(무엇을 해야 하는가)은 `docs/conventions/coding.md`에 있다.

| 주제 | coding.md 위치 |
|------|--------------|
| Domain Entity 정적 팩토리 메서드 | 섹션 5.1 |
| Port 메서드 비즈니스 언어 | 섹션 1 (Port 명명 원칙) |
| 파라미터 객체 (VO 묶기) | 섹션 1 (파라미터 객체 원칙) |
| 도메인별 ErrorCode enum | 섹션 4.3 |

---

## GUEST 설계 결정 (방식 A)

Phase 1 작업 중 GUEST 유저 처리 방식도 결정했다.

**선택한 방식:** GUEST = DB 레코드 없이 JWT claim만으로 식별  
**이유:** MVP 단계에서 복잡도를 낮추기 위함. GUEST 전환율 추적, GUEST 데이터 이어받기는 필요해질 때 추가한다.

```
입장 시 → GUEST JWT 발급 (claim: role=GUEST, userId 없음)
채팅 시도 → 서버가 role=GUEST 확인 → 403 + 회원가입 안내
회원가입 → 새 MEMBER users 행 생성, 새 JWT 발급
```

**포기한 것:** GUEST → MEMBER 전환 시 세션 연속성 (GUEST가 머물렀던 공간 등을 이어받는 기능)
