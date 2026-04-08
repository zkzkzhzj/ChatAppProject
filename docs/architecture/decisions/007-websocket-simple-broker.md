# ADR-007 — WebSocket MVP에서 인메모리 Simple Broker 선택

## 상태

Accepted (Phase 3, 2026-04-08)

---

## 배경

STOMP 기반 WebSocket을 구현할 때 메시지 브로커를 선택해야 한다.

선택지는 두 가지다.

1. **Simple Broker** — Spring이 내장으로 제공하는 인메모리 브로커. 별도 설치 없음.
2. **External Broker** — RabbitMQ, ActiveMQ, Redis Pub/Sub 등. 외부 프로세스 필요.

---

## 결정

Phase 3 MVP에서는 Spring 내장 Simple Broker를 사용한다.

---

## 이유

- 현재 단계에서 다중 서버 인스턴스는 없다. 단일 노드에서 Simple Broker는 External Broker와 기능적으로 동일하다.
- 외부 브로커를 도입하면 운영 환경에 RabbitMQ/Redis 클러스터가 추가된다. 현재 이 복잡도를 감수할 이유가 없다.
- `GenerateNpcResponsePort`처럼 WebSocket 브로커도 인터페이스 뒤에 숨어있지 않다. 교체 시 `WebSocketConfig.java` 한 파일만 수정하면 된다.

---

## 스케일아웃 시 교체 계획

단일 노드를 벗어나는 시점에 Redis Pub/Sub 기반 외부 브로커로 교체한다.

```java
// 현재 (Simple Broker)
config.enableSimpleBroker("/topic", "/queue");

// 교체 후 (Redis Pub/Sub)
config.enableStompBrokerRelay("/topic", "/queue")
      .setRelayHost(redisHost)
      .setRelayPort(relayPort);
```

교체 범위: `WebSocketConfig.java` 수정 + Redis Pub/Sub 의존성 추가. 비즈니스 로직 변경 없음.

---

## 트레이드오프

| 항목 | Simple Broker | External Broker |
|------|--------------|-----------------|
| 설정 복잡도 | 낮음 | 높음 |
| 다중 인스턴스 지원 | 불가 | 가능 |
| 메시지 영속성 | 없음 | 구성에 따라 가능 |
| MVP 적합성 | 높음 | 과도함 |
