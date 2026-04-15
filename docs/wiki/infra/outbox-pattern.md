---
title: Outbox + Kafka 이벤트
tags: [infra, outbox, kafka, idempotency, event]
related: [infra/docker-local.md, communication/npc-conversation.md]
last-verified: 2026-04-13
---

# Outbox + Kafka 이벤트

## Transactional Outbox 패턴

도메인 간 통신은 Kafka 이벤트를 통해서만 한다. 이벤트 발행의 신뢰성을 위해 Transactional Outbox 패턴을 사용한다 (ADR-003).

### 흐름

```
Service (비즈니스 로직)
  → outbox_event 테이블에 INSERT (같은 트랜잭션)
  → 트랜잭션 커밋

OutboxKafkaRelay (@Scheduled 1초)
  → status=PENDING 이벤트 조회
  → Kafka 발행
  → status=PUBLISHED 업데이트
  → 실패 시 status=FAILED, retry_count 증가
```

### 왜 직접 Kafka로 보내지 않는가

DB 트랜잭션과 Kafka 발행은 원자적이지 않다. DB는 커밋됐는데 Kafka 발행이 실패하면 이벤트가 유실된다. Outbox 테이블에 같은 트랜잭션으로 저장하면 "DB 커밋 = 이벤트 보장"이 된다.

## 멱등성 처리

컨슈머는 At-least-once 전달을 전제한다. 같은 메시지가 두 번 올 수 있으므로 `processed_event` 테이블로 중복을 방지한다.

### IdempotencyGuard

```java
// global/infra/idempotency/IdempotencyGuard.java
isAlreadyProcessed(eventId)  → boolean
markAsProcessed(eventId)     → void
```

모든 Kafka 컨슈머는 이 컴포넌트를 사용한다.

## 현재 등록된 이벤트

| 토픽 | 프로듀서 | 컨슈머 | 용도 |
|------|---------|--------|------|
| `user.registered` | Identity | Village | 회원가입 → 캐릭터/공간 자동 생성 |
| `npc.conversation.summarize` | Communication (SendMessageService) | Communication (ConversationSummaryEventConsumer) | 유저 메시지 N회 누적 시 대화 요약 + pgvector 임베딩 저장 |

## Kafka 직렬화 전략

Key/Value 모두 `StringSerializer/StringDeserializer`. 도메인 코드가 `ObjectMapper`로 직접 JSON 변환한다. `JsonSerializer`의 `__TypeId__` 헤더 문제를 회피하기 위함.

## 핵심 코드 위치

| 파일 | 역할 |
|------|------|
| `global/infra/outbox/OutboxJpaEntity.java` | Outbox 테이블 매핑 |
| `global/infra/outbox/OutboxKafkaRelay.java` | @Scheduled 1초 릴레이 |
| `global/infra/idempotency/IdempotencyGuard.java` | 멱등성 처리 공용 |
| `identity/adapter/out/persistence/OutboxPersistenceAdapter.java` | Outbox 저장 어댑터 |
