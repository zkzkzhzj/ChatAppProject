# Kafka 이벤트 명세 — 마음의 고향

> Phase 1~3 구현 기준.
> 이벤트 전송은 Transactional Outbox 패턴을 사용한다 (ADR-003 참조).

---

## 공통

- 모든 이벤트는 `outbox_event` 테이블에 먼저 저장된 후 `OutboxKafkaRelay`(@Scheduled 1s)에 의해 Kafka로 발행된다.
- 키(Key): 집계 루트 ID (String)
- 값(Value): JSON 문자열. `JsonSerializer`/`__TypeId__` 헤더 없이 plain String으로 직렬화한다.
- 멱등성: 컨슈머는 `processed_event` 테이블로 중복 처리를 방지한다.
- 재시도: `DefaultErrorHandler` + `FixedBackOff(1초, 3회)`. 실패 시 예외를 rethrow하여 Spring Kafka가 재시도한다.

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
| 멱등성 키 | `outbox_event.event_id` (UUID, Kafka 헤더 `outbox-event-id`) |

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

```text
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

- `userId` 필드 누락(null): 로그 경고 후 멱등성 마킹하고 스킵 (메시지 손실 허용 -- 이미 DB에 유저 존재)
- JSON 파싱 오류 / 비즈니스 예외: `AlertPort.critical()`로 운영 알람 발행 후 **예외를 rethrow**한다. Spring Kafka 재시도 정책에 따라 재처리된다. poison pill 메시지는 자동 스킵되지 않으므로 DLT(Dead Letter Topic) 또는 수동 개입이 필요하다.
- 중복 이벤트: `processed_event` 테이블 확인 후 무시

---

## npc.conversation.summarize

### 개요

| 항목 | 값 |
|------|-----|
| 토픽 | `npc.conversation.summarize` |
| 프로듀서 | Communication (`ConversationSummaryOutboxAdapter`) |
| 컨슈머 | Communication (`ConversationSummaryEventConsumer`) |
| 발행 시점 | 유저별 3회 메시지 누적 시 |
| 전달 보장 | At-least-once (Outbox 기반) |
| 멱등성 키 | `outbox_event.event_id` (UUID, Kafka 헤더). 헤더 미존재 시 `key + offset` 조합 UUID fallback |

### Payload

```json
{
  "userId": 42,
  "chatRoomId": 1
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | Long | 대화 요약 대상 유저 ID |
| chatRoomId | Long | 채팅방 ID |

### 처리 흐름

```text
SendMessageService (3회 누적 시)
  → outbox_event 저장 (같은 트랜잭션)
  → OutboxKafkaRelay (1초 주기) → Kafka "npc.conversation.summarize"
  → ConversationSummaryEventConsumer
      → processed_event 중복 체크
      → Cassandra에서 최근 10개 메시지 로드
      → SummarizeConversationPort (LLM) → 요약 텍스트 생성
      → npc_conversation_memory 테이블에 저장 (PostgreSQL/pgvector)
```

### 컨슈머 에러 처리

- LLM 호출 실패 / 기타 예외: `AlertPort.critical()`로 운영 알람 발행 후 **예외를 rethrow**한다. Spring Kafka 재시도 정책에 따라 재처리된다. 원본 메시지는 Cassandra에 보존되므로 데이터 손실은 없지만, 반복 실패 시 컨슈머 지연이 발생할 수 있다.
- 중복 이벤트: `processed_event` 테이블 확인 후 무시
