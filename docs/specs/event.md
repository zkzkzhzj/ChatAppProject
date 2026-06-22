# Kafka 이벤트 명세: 마음의 고향

Transactional Outbox 패턴을 사용한다. 모든 이벤트는 먼저 `outbox_event` 테이블에 저장되고, `OutboxKafkaRelay`가 Kafka로 발행한다.

## user.registered

> 2026-06-23 issue #151 이후 저장형 사용자별 마을 상태를 만들지 않는다.
> 이 이벤트는 Identity outbox 내구성 예시/향후 확장 지점으로만 남아 있으며, 현재 Village 초기화 consumer를 요구하지 않는다.

| 항목 | 값 |
|------|-----|
| 토픽 | `user.registered` |
| 프로듀서 | Identity |
| 컨슈머 | 없음 (현재 기준) |
| 발행 시점 | 이메일 회원가입 완료 |
| 전달 보장 | At-least-once |
| 멱등성 키 | `outbox_event.event_id` |

### Payload

```json
{
  "userId": 42
}
```

### 처리 흐름

```text
RegisterUserService
  -> outbox_event 저장
  -> OutboxKafkaRelay
  -> Kafka "user.registered"
  -> 현재 저장형 Village record 생성 없음
```

일반 채팅 대화 요약 이벤트는 폐기되었다. 남아 있는 과거 outbox row는 DB cleanup migration에서 제거한다.
