# 16. 헥사고날 리팩토링 — 책임 경계가 흐려지는 세 가지 패턴

> Phase 3 완료 후 Cucumber Green 상태에서 수행한 안전한 리팩토링 기록.
> "돌아가는 코드"를 "의도가 드러나는 코드"로 바꾸는 과정에서 발견한 공통 패턴.

---

## 배경

Happy Path(Phase 0~3)가 Cucumber로 모두 검증된 상태에서 리팩토링을 진행했다.
테스트가 Green인 상태에서 시작하고, 리팩토링 후 다시 Green인지 검증하는 것이 전제다.

---

## 패턴 1: 중간 DTO 레이어의 함정 — MessageData

### 무슨 일이 있었나

`SendMessageUseCase`에 `MessageData`라는 record가 존재했다.

```java
// SendMessageUseCase.java
record MessageData(UUID id, long participantId, String body, Instant createdAt) {}
record Result(MessageData userMessage, MessageData npcMessage) {}
```

그리고 `SendMessageService`에는 변환 헬퍼가 있었다.

```java
// SendMessageService.java
private MessageData toMessageData(Message message) {
    return new MessageData(
        message.getId(), message.getParticipantId(),
        message.getBody(), message.getCreatedAt()
    );
}
```

### 왜 생겼나

"포트(UseCase 인터페이스)가 도메인 객체를 직접 노출하면 안 된다"는 원칙에서 출발했다.
도메인이 바뀌어도 포트 계약은 유지되어야 한다는 의도다.

### 왜 잘못됐나

의도는 맞지만, 실제 구현에서 `MessageData`의 필드가 `Message` 도메인과 **완전히 동일**했다.
변환이 아니라 복사였다. 이름만 다른 똑같은 구조체를 하나 더 만든 것이다.

게다가 `Message`는 순수 POJO다. `@Entity`, `@Table` 같은 인프라 어노테이션이 없다.
JPA 엔티티(`MessageCassandraEntity`)는 Persistence Adapter 안에 갇혀 있고, Controller가 받는 건
이미 변환된 도메인 객체다. "도메인 노출"이라는 문제 자체가 이 경우엔 존재하지 않았다.

### 무엇이 달라졌나

```text
Before: Service → Message → MessageData(UseCase) → MessageResponse(Controller)
After:  Service → Message → MessageResponse(Controller)
```

`MessageData` 레이어를 제거하고, 변환 책임을 어댑터(Controller)로 이동했다.

```java
// Before — 서비스가 변환 책임까지 보유
return new Result(toMessageData(userMessage), toMessageData(npcMessage));

// After — 서비스는 도메인만 반환
return new Result(userMessage, npcMessage);
```

```java
// Before — MessageData를 중간에 거쳐서 변환
public static MessageResponse from(SendMessageUseCase.MessageData data) {
    return new MessageResponse(data.id(), data.participantId(), ...);
}

// After — 어댑터가 도메인에서 직접 변환
public static MessageResponse from(Message message) {
    return new MessageResponse(message.getId(), message.getParticipantId(), ...);
}
```

### 교훈

중간 DTO 레이어를 만들기 전에 확인할 것:

- 도메인 객체에 인프라 어노테이션이 있는가? → 있으면 중간 DTO 정당함
- 변환 로직이 실질적으로 존재하는가? → 복사라면 제거 대상
- 포트가 실제로 다른 구현체로 교체될 가능성이 있는가? → 없으면 YAGNI

---

## 패턴 2: 어댑터의 private 메서드 — 서비스의 private 메서드와 다르다

### 원칙 오해 주의

"서비스 레이어에서 private 메서드 금지"가 과제 요구사항이었다.
이것은 **서비스 레이어 한정**이다. 어댑터(Kafka 컨슈머, Controller 등)의 private 메서드는
다른 맥락이다.

`UserRegisteredEventConsumer`는 어댑터다. 거기에 `UserRegisteredPayload`라는 private inner record를
만들어 JSON 파싱 로직을 담은 건 private 메서드 금지 원칙과 무관하다. 오히려 권장되는 구조다.

### 왜 어댑터는 다른가

서비스의 private 메서드가 문제인 이유는 **비즈니스 로직을 객체 밖에서 절차적으로 처리**하기 때문이다.
어댑터의 private 메서드나 inner record는 **인프라 변환 로직을 캡슐화**하는 것이다. 목적이 다르다.

---

## 패턴 3: 어댑터가 인프라 레포지토리를 직접 아는 문제

### 무슨 일이 있었나

`UserRegisteredEventConsumer`(Kafka 어댑터)가 `ProcessedEventJpaRepository`를 직접 주입받고 있었다.

```java
// Before
@Component
public class UserRegisteredEventConsumer {
    private final ProcessedEventJpaRepository processedEventJpaRepository; // 어댑터가 레포 직접 보유

    public void handle(...) {
        if (processedEventJpaRepository.existsByEventId(key)) return;
        initializeUserVillageUseCase.execute(userId);
        processedEventJpaRepository.save(ProcessedEventJpaEntity.of(key));
    }
}
```

### 왜 문제인가

두 가지 문제가 있었다.

**첫째, 책임 혼재.** `handle()` 메서드가 JSON 파싱, UUID 계산, 중복 체크, 비즈니스 실행, DB 저장을
전부 순서대로 했다. 읽으면 "무슨 일이 일어나는가"가 보이지 않고, "어떻게 하는가"만 보였다.

**둘째, 복붙 위험.** 새로운 Kafka 토픽이 생길 때마다 멱등성 처리 코드(existsByEventId + save)를
그대로 복사해야 했다.

### 해결: IdempotencyGuard 분리

```java
// IdempotencyGuard.java — 멱등성 처리 전담 컴포넌트
@Component
public class IdempotencyGuard {
    public boolean isAlreadyProcessed(UUID key) { ... }
    public void markAsProcessed(UUID key) { ... }
}
```

```java
// After — handle() 메서드가 비즈니스 의도만 표현
public void handle(ConsumerRecord<String, String> record) {
    var payload = UserRegisteredPayload.from(record, objectMapper);
    if (idempotencyGuard.isAlreadyProcessed(payload.idempotencyKey())) return;
    initializeUserVillageUseCase.execute(payload.userId());
    idempotencyGuard.markAsProcessed(payload.idempotencyKey());
}
```

**변경 전후 비교:**

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| `handle()` 줄 수 (try 블록 내) | 12줄 | 4줄 |
| JPA 레포 직접 참조 | 있음 | 없음 (IdempotencyGuard 안에 캡슐화) |
| 멱등성 로직 재사용 | 불가 (인라인) | 가능 (IdempotencyGuard 주입) |
| 비즈니스 의도 가독성 | JSON + UUID + DB 로직 혼재 | 흐름만 보임 |

### IdempotencyGuard 위치

`global/infra/idempotency/` 패키지에 배치했다.
Kafka 도메인 특화가 아니라 어느 어댑터에서도 쓸 수 있는 인프라 공통 컴포넌트이기 때문이다.

---

## 리팩토링 원칙 정리

1. **테스트가 Green인 상태에서만 시작한다.** 테스트가 없으면 리팩토링이 아니라 도박이다.
2. **"편하니까 여기 놓자"를 경계하라.** 서비스에서 바로 쓰니까 서비스에, 컨슈머에서 쓰니까 컨슈머에 — 이 관성이 책임 혼재를 만든다.
3. **중간 DTO는 의도가 있어야 한다.** 도메인과 필드가 동일한 DTO는 존재 이유가 없다. 실질적 변환이 없는 DTO는 계층만 늘린다.
4. **어댑터의 private 메서드 금지와 서비스의 private 메서드 금지는 다른 이유다.** 원칙을 외우지 말고 이유를 이해하라.
