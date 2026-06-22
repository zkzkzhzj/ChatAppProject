# Kafka 이벤트 명세: 마음의 고향

Transactional Outbox 패턴을 사용한다. 모든 이벤트는 먼저 `outbox_event` 테이블에 저장되고, `OutboxKafkaRelay`가 Kafka로 발행한다.

## confession.letter.sent

편지가 발송되면 같은 트랜잭션에서 Outbox에 저장하고 Kafka로 발행해 수신자 알림 큐에 전달한다.

| 항목 | 값 |
|------|-----|
| 토픽 | `confession.letter.sent` |
| 프로듀서 | Confession |
| 컨슈머 | Confession |
| 발행 시점 | 고백 편지 저장 완료 |
| 전달 보장 | At-least-once |
| 멱등성 키 | `outbox_event.event_id` |

### Payload

```json
{
  "authorUserId": 1,
  "confessionId": 10,
  "letterId": 20
}
```

### 처리 흐름

```text
SendConfessionLetterService
  -> confession_letter 저장
  -> outbox_event 저장
  -> OutboxKafkaRelay
  -> Kafka "confession.letter.sent"
  -> ConfessionLetterSentEventConsumer
  -> /queue/mail 알림 전달
```

`user.registered` 이벤트와 일반 채팅 대화 요약 이벤트는 현재 제품 범위에서 제거되었다.
