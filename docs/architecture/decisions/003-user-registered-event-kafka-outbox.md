# ADR-003: UserRegisteredEvent 전달 방식 — Kafka + Transactional Outbox

## 상태

확정 (2026-04-07)

---

## 맥락

회원가입이 완료되면 Village 컨텍스트가 이를 감지하고 해당 유저의 기본 캐릭터와 공간을 생성해야 한다.
이 흐름을 어떻게 구현할 것인가?

### 선택지

**A. Spring ApplicationEvent (동기)**
- `RegisterUserService`에서 `ApplicationEventPublisher.publishEvent()` 호출
- 같은 트랜잭션 내에서 캐릭터/공간 생성
- Village 코드가 Identity 서비스와 같은 트랜잭션에 묶인다
- 장점: 구현이 단순하고 즉시 일관성 보장
- 단점: 도메인 간 결합도 증가, Village 작업 실패 시 회원가입도 롤백됨

**B. Spring ApplicationEvent + @TransactionalEventListener(AFTER_COMMIT) (비동기)**
- 회원가입 트랜잭션 커밋 후 이벤트 발행
- Village는 별도 트랜잭션에서 처리
- 장점: 도메인 결합 없음, 회원가입 성공이 Village 생성 실패에 영향 없음
- 단점: 이벤트 발행 전 서버 크래시 시 이벤트 유실. 재시도 없음.

**C. Kafka + Transactional Outbox Pattern (비동기, 내구성 보장)**
- 회원가입 트랜잭션 내에서 `outbox_event` 테이블에 이벤트 저장 (같은 DB 트랜잭션)
- 별도 스케줄러(OutboxKafkaRelay)가 PENDING 이벤트를 Kafka로 발행
- Village Kafka 컨슈머가 이벤트 수신 → `processed_event` 테이블로 중복 방지 → 캐릭터/공간 생성
- 장점: At-least-once 보장, 서버 크래시에도 이벤트 유실 없음, 도메인 완전 분리
- 단점: 구현 복잡도 증가, 최종 일관성(Eventual Consistency)으로 캐릭터/공간이 즉시 생성되지 않음

---

## 결정

**C. Kafka + Transactional Outbox Pattern**을 채택한다.

이유:
- 실서비스에서 회원가입은 핵심 경로다. 이벤트 유실은 사용자가 마을에 들어갈 수 없는 치명적 버그다.
- `outbox_event` 테이블이 이미 ERD에 포함되어 있고, 스키마도 준비되어 있다.
- Village와 Identity는 서로 다른 도메인이다. 같은 트랜잭션으로 묶이면 안 된다.

---

## 최종 일관성 처리 방식

회원가입 직후 캐릭터/공간 생성까지 약 1~3초의 지연이 발생한다.
프론트엔드는 이 지연을 로딩 상태(스피너/로딩바)로 처리한다.

구체적으로:
- `GET /api/v1/village/characters/me` → 아직 생성 전이면 `404`
- 프론트엔드는 200 응답이 올 때까지 폴링
- 최대 10초 내에 생성이 완료되지 않으면 오류 화면 표시 (비정상 상황)

---

## 구현 흐름

```
[RegisterUserService]
  트랜잭션 시작
    → users INSERT
    → user_local_auth INSERT
    → outbox_event INSERT (event_type="user.registered", status=PENDING)
  트랜잭션 커밋

[OutboxKafkaRelay] (@Scheduled, 1초 주기)
  → outbox_event WHERE status=PENDING 조회
  → KafkaTemplate.send("user.registered", payload)
  → outbox_event UPDATE status=PUBLISHED

[UserRegisteredEventConsumer] (Kafka Listener)
  → processed_event WHERE event_id 존재 여부 확인 (중복 방지)
  → character INSERT
  → space INSERT (is_default=true)
  → processed_event INSERT
```

---

## 트레이드오프 기록

| 항목 | 선택 결과 |
|------|----------|
| 일관성 모델 | 최종 일관성 (Eventual Consistency) |
| 이벤트 내구성 | DB 커밋과 같은 원자성 보장 |
| 도메인 결합도 | 없음 (JSON 페이로드 스키마만 공유) |
| 프론트엔드 부담 | 로딩 처리 필요 |
| 복잡도 | Outbox + Relay + Consumer + 멱등성 처리 |
