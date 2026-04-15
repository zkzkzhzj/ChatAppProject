# 31. Kafka 멱등성 키 설계 — offset에 의존하면 안 되는 이유

> 작성 시점: 2026-04-15
> 맥락: Kafka 컨슈머의 중복 처리 방지를 위해 `key + offset` 조합으로 멱등성 키를 만들었는데, docker-compose를 재시작하면 모든 이벤트가 "중복"으로 판정되는 버그가 발생했다.
> 관련 학습노트: [29. pgvector + 벡터 임베딩 도입기](./29-vector-embedding-pgvector-semantic-search.md) (같은 NPC 도메인의 이벤트 처리)

---

## 배경

이 프로젝트는 Transactional Outbox 패턴을 사용한다. 도메인 이벤트를 DB의 Outbox 테이블에 먼저 저장하고, 별도 프로세스가 Kafka로 발행한다. 컨슈머 쪽에서는 `processed_event` 테이블에 처리한 이벤트의 멱등성 키를 저장해서, 같은 이벤트가 두 번 오면 무시한다.

처음 설계한 멱등성 키:

```
idempotencyKey = kafkaRecord.key() + "-" + kafkaRecord.offset()
```

Kafka의 key는 도메인 식별자(예: `villageId`), offset은 파티션 내에서 메시지의 순번이다. 이 조합이면 유일하다고 생각했다.

**그런데 문제가 터졌다.**

---

## 문제: offset은 인프라 메타데이터다

개발 환경에서 `docker-compose down && docker-compose up` 하면 Kafka 볼륨이 초기화된다. 이때 offset이 0부터 다시 시작한다.

```
[첫 번째 실행]
이벤트 A → key=village-1, offset=0 → 멱등키: village-1-0 → 처리 완료

[docker-compose 재시작 후]
이벤트 B → key=village-1, offset=0 → 멱등키: village-1-0 → "이미 처리됨" → 무시!
```

이벤트 B는 완전히 다른 이벤트인데, 멱등성 키가 겹쳐서 처리되지 않는다. **모든 이벤트가 "중복"으로 판정된다.**

이건 개발 환경만의 문제가 아니다. 프로덕션에서도:
- Kafka 클러스터 마이그레이션
- 토픽 재생성
- 파티션 수 변경 후 리밸런싱

이런 상황에서 offset이 리셋될 수 있다. offset은 **Kafka 인프라가 관리하는 값**이지, 비즈니스 이벤트의 고유 식별자가 아니다.

---

## 선택지 비교

| | A. key + offset (기존) | B. Outbox eventId (UUID) | C. 비즈니스 복합키 |
|--|----------------------|--------------------------|-------------------|
| 핵심 아이디어 | Kafka 메타데이터 조합 | Outbox 테이블이 생성한 UUID를 Kafka 헤더로 전달 | `entityId + eventType + timestamp` 조합 |
| 장점 | 추가 구현 없음, Kafka에서 바로 추출 | 인프라 리셋에 영향 없음, UUID라 전역 유일 | 비즈니스 의미가 명확 |
| 단점 | **offset 리셋 시 충돌**, 인프라 의존 | Kafka 헤더에 ID를 넣는 코드 필요 | timestamp 정밀도 문제, 동시 이벤트 충돌 가능 |
| 유일성 보장 | 같은 토픽+파티션 내에서만 (리셋 전까지) | 전역 유일 (UUID v4) | 동시 이벤트 발생 시 보장 안 됨 |
| 인프라 리셋 대응 | 불가 | 가능 | 가능 |

---

## 이 프로젝트에서 고른 것

**선택: B. Outbox eventId (UUID)**

이유:
1. **이미 있는 걸 활용한다.** Outbox 테이블에 `UUID.randomUUID()`로 생성한 `event_id`가 이미 있었다. 새로운 ID 체계를 만들 필요 없이, 이걸 Kafka 헤더에 실어 보내면 된다.
2. **인프라에 독립적이다.** UUID는 Kafka의 offset, partition, 토픽 이름과 무관하다. Kafka를 완전히 다른 클러스터로 교체해도 멱등성 키는 영향받지 않는다.
3. **이벤트의 출처가 명확하다.** "이 이벤트는 Outbox의 어떤 레코드에서 왔는가"를 추적할 수 있다. 디버깅할 때 Outbox 테이블과 대조하기 좋다.

---

## 구현 구조

### Producer 쪽: Outbox eventId를 헤더에 추가

```java
ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, payload);
record.headers().add("outbox-event-id", eventId.toString().getBytes(UTF_8));
kafkaTemplate.send(record);
```

핵심은 Outbox 릴레이(스케줄러나 CDC)가 Kafka로 보낼 때 헤더에 UUID를 심는 것이다.

### Consumer 쪽: 헤더에서 추출, 없으면 fallback

```java
// KafkaEventIdExtractor
public static String extractIdempotencyKey(ConsumerRecord<?, ?> record) {
    Header header = record.headers().lastHeader("outbox-event-id");
    if (header != null) {
        return new String(header.value(), UTF_8);
    }
    // fallback: 헤더 없는 레거시 메시지 대응
    return record.key() + "-" + record.offset();
}
```

fallback을 둔 이유: 기존에 헤더 없이 발행된 메시지가 아직 Kafka에 남아있을 수 있다. 하위 호환성을 위해 key+offset으로 떨어진다. 새 메시지는 모두 헤더가 있으므로 점진적으로 fallback은 사라진다.

### 처리 흐름

```
[Producer]
Outbox 테이블 → event_id: 550e8400-e29b-41d4-a716-446655440000
  ↓ Kafka Relay
ProducerRecord 헤더: outbox-event-id = "550e8400-..."
  ↓
[Kafka Topic]
  ↓
[Consumer]
헤더에서 "550e8400-..." 추출
  ↓ processed_event 테이블 조회
없음 → 처리 실행 → processed_event에 "550e8400-..." 저장
있음 → 중복, 무시
```

---

## 핵심 개념 정리

### 멱등성 키의 본질

멱등성 키는 **"이 작업을 이미 했는가?"**를 판별하는 식별자다. 좋은 멱등성 키의 조건:

1. **전역 유일성**: 다른 이벤트와 절대 겹치지 않아야 한다.
2. **안정성**: 인프라 변경, 재시작, 리플레이에도 같은 이벤트는 같은 키를 가져야 한다.
3. **추적 가능성**: 이 키가 어디서 왔는지 역추적할 수 있어야 한다.

offset 기반 키는 1번(유일성)이 인프라 수명에 종속되고, 2번(안정성)이 보장되지 않는다. UUID 기반 키는 세 조건을 모두 만족한다.

### Outbox 패턴과 멱등성의 관계

Transactional Outbox는 "이벤트 발행의 신뢰성"을 보장한다 (DB 트랜잭션과 이벤트가 원자적). 하지만 **Outbox 릴레이가 같은 이벤트를 두 번 보낼 수 있다** (at-least-once). 그래서 컨슈머 쪽 멱등성이 반드시 필요하고, 이때 Outbox의 eventId를 쓰면 자연스럽게 연결된다.

```
[도메인 트랜잭션] ──┬── 도메인 상태 변경
                    └── Outbox에 이벤트 저장 (eventId = UUID)
                           ↓
[Outbox Relay] ── Kafka 발행 (헤더에 eventId)
                           ↓
[Consumer] ── eventId로 중복 체크 ── processed_event 테이블
```

Outbox의 eventId가 이벤트의 전체 수명 주기를 관통하는 식별자가 되는 것이다.

---

## 실전에서 주의할 점

- **processed_event 테이블이 무한히 커진다.** 모든 처리된 이벤트 ID를 영구 저장하면 테이블이 계속 커진다. 일정 기간(예: 7일)이 지난 레코드는 정리하는 배치가 필요하다. Kafka의 retention period보다 길게 유지하면 안전하다.
- **헤더가 유실될 수 있는 환경을 조심하라.** Kafka Connect, Kafka Streams 등 중간 파이프라인이 헤더를 드롭하는 경우가 있다. 현재 이 프로젝트는 직접 produce/consume이라 괜찮지만, 중간에 무언가 끼면 헤더 전달 여부를 확인해야 한다.
- **fallback 로직의 수명 관리.** key+offset fallback은 "레거시 대응"이라고 했지만, 코드에 영원히 남으면 아무도 못 지운다. Kafka retention이 지나서 레거시 메시지가 확실히 없어졌으면 fallback을 제거하는 게 맞다.

---

## 나중에 돌아보면

- 이벤트 규모가 커지면 processed_event 조회가 병목이 될 수 있다. 그때는 **Redis에 TTL 기반으로 멱등성 키를 캐싱**하고, DB는 보조 저장소로 쓰는 방식을 고려할 수 있다.
- CDC (Change Data Capture, 예: Debezium)로 Outbox 릴레이를 교체하면, Debezium이 알아서 Outbox의 eventId를 Kafka 메시지 키로 사용할 수 있다. 이러면 헤더가 아니라 메시지 키 자체가 UUID가 된다.
- 멱등성 키를 **Kafka 메시지 키**로 쓸지 **헤더**로 쓸지도 설계 포인트다. 메시지 키로 쓰면 같은 이벤트가 같은 파티션으로 가는 보장이 깨질 수 있다 (UUID는 랜덤이니까). 이 프로젝트에서는 파티셔닝 키(villageId)와 멱등성 키(eventId)를 분리하기 위해 헤더를 선택했다.

---

## 더 공부할 거리

- [Gunnar Morling — On Idempotency Keys](https://www.morling.dev/blog/on-idempotency-keys/) — 멱등성 키 설계의 원칙을 잘 정리한 글
- [Lydtech — Kafka Idempotent Consumer & Transactional Outbox](https://www.lydtechconsulting.com/blog-kafka-idempotent-consumer.html) — Outbox + 멱등 컨슈머 조합의 실전 구현
- [DEV Community — Achieving Idempotency with the Inbox Pattern](https://dev.to/actor-dev/inbox-pattern-51af) — Inbox 패턴 (컨슈머 쪽 Outbox)이라는 관련 패턴
- [Conduktor — Event Sourcing Patterns with Kafka](https://www.conduktor.io/glossary/event-sourcing-patterns-with-kafka) — 더 넓은 맥락에서의 이벤트 처리 패턴
- Debezium의 Outbox Event Router를 공부하면 CDC 기반 Outbox에서 멱등성이 어떻게 자연스럽게 해결되는지 볼 수 있다
