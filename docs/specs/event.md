# Kafka 이벤트 명세 — 마음의 고향

> Phase 1~3 구현 기준.
> 이벤트 전송은 Transactional Outbox 패턴을 사용한다 (ADR-003 참조).

---

## 공통

- 모든 이벤트는 `outbox_event` 테이블에 먼저 저장된 후 `OutboxKafkaRelay`(@Scheduled 1s)에 의해 Kafka로 발행된다.
- 키(Key): 집계 루트 ID (String)
- 값(Value): JSON 문자열. `JsonSerializer`/`__TypeId__` 헤더 없이 plain String으로 직렬화한다.
- 멱등성: 컨슈머는 `processed_event` 테이블로 중복 처리를 방지한다.

---

## user.registered

### 개요

| 항목 | 값 |
|------|-----|
| 토픽 | `user.registered` |
| 프로듀서 | Identity (`OutboxPersistenceAdapter`) |
| 컨슈머 | Village (`UserRegisteredEventConsumer`) |
| 발행 시점 | 이메일 회원가입 완료 시 |
| 전달 보장 | At-least-once (Outbox 기반) |
| 멱등성 키 | `outbox_event.id` (UUID) |

### Payload

```json
{
  "userId": 42
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | Long | 신규 가입 유저 ID |

### 처리 흐름

```
RegisterUserService
  → outbox_event 저장 (같은 트랜잭션)
  → OutboxKafkaRelay (1초 주기 @Scheduled) → Kafka "user.registered"
  → UserRegisteredEventConsumer
      → processed_event 중복 체크
      → InitializeUserVillageService
          → Character 생성 (DB 저장)
          → Space 생성 (DB 저장)
```

### 컨슈머 에러 처리

- JSON 파싱 오류: 로그 후 스킵 (메시지 손실 허용 — 이미 DB에 유저 존재)
- 비즈니스 예외: AlertPort로 운영 알람 발행 후 스킵
- 중복 이벤트: `processed_event` 테이블 확인 후 무시
