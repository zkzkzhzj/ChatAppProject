# 53. 헥사고날 outbound port의 호출자 기준 — publish는 port로, subscribe lifecycle은 어댑터 내부로

> 작성 시점: 2026-04-26
> 트랙: `ws-redis` Step 2 (raw WebSocket + Redis Pub/Sub 어댑터 설계 중)
> 맥락: [learning/45](./45-websocket-redis-pubsub-redesign.md) 의 "방 단위 채널 publish/subscribe/unsubscribe" 셋을 한 outbound port (`RoomMessageBus`) 로 묶을지 결정해야 했다.

---

## 0. 한 줄 결론

**outbound port 의 정의는 "도메인이 인프라에게 무엇을 요청하는가" 다. 호출자가 application service 가 아니면 outbound port 가 아니다.**

- publish 의 호출자는 application service (`SendMessageService`, `NpcReplyService`) → outbound port 로 끌어올린다.
- subscribe / unsubscribe 의 호출자는 다른 어댑터 (WebSocket inbound 핸들러) → 어댑터 내부 협업으로 둔다.
- 단, 마음의 고향 ws-redis Step 2~5 동안은 V1 STOMP·V2 raw WS 가 동시 운영되어 `BroadcastChatMessagePort` 빈 충돌이 생긴다 → publish 조차 임시로 V2 어댑터 내부에 두고, **Step 6 cutover 에서 port 로 끌어올린다**.

---

## 1. 배경

### 1.1 무엇을 만드는 중이었는가

[learning/45](./45-websocket-redis-pubsub-redesign.md) 에서 "raw WebSocket + Redis Pub/Sub" 으로 가기로 했다. 핵심은 다음 셋이다.

| 동작 | 호출 주체 | 시점 |
|------|----------|------|
| `publish(roomId, msg)` | `SendMessageService` (유저 메시지 저장 후), `NpcReplyService` (NPC 응답 후) | 비즈니스 이벤트 |
| `subscribe(roomId)` | `ChatWebSocketHandler` (WebSocket 핸들러) | 첫 세션이 그 방에 join 할 때 |
| `unsubscribe(roomId)` | `ChatWebSocketHandler` | 그 방의 마지막 세션이 떠날 때 |

이 셋을 **하나의 outbound port `RoomMessageBus`** 로 묶을지가 쟁점이었다. 표면적으로는 "한 인터페이스에 셋 다 모아놓는 게 응집도 높지 않나?" 가 자연스러운 질문이다.

### 1.2 왜 이 결정이 중요한가

- 헥사고날을 "그냥 인터페이스로 인프라 분리하는 패턴" 으로 받아들이면 outbound port 의 정의가 흐려진다. **outbound port 는 "도메인이 인프라에게 무엇을 원하는가" 의 표현** 이지, "어댑터끼리 통신용 인터페이스" 가 아니다.
- 한 번 잘못 끌어올리면 어댑터끼리의 협업이 "도메인 → port → 어댑터" 처럼 위장되어, ArchUnit 으로도 잡히지 않는 의존 방향 위반이 생긴다 ([ADR-008](../architecture/decisions/008-ci-dx-tool-stack.md) 의 ArchUnit 규칙은 패키지 의존만 본다).
- ws-redis 트랙의 [§4 "건드리지 않는 것"](../handover/track-ws-redis.md) 룰 — V1 STOMP 코드 손대지 않기 — 와 빈 충돌 회피까지 같이 풀어야 한다.

---

## 2. 선택지 비교

| | A. 셋 다 outbound port | B. publish 만 outbound port (선택) | C. UseCase 도입해서 subscribe 도 port 화 |
|---|---|---|---|
| 인터페이스 모양 | `RoomMessageBus.publish/subscribe/unsubscribe` 한 묶음 | `BroadcastChatMessagePort.broadcastUserMessage` 만 (subscribe 는 어댑터 내부) | `JoinRoomUseCase` (in) + `RoomSubscriptionPort` (out) 둘 다 |
| publish 호출자 | application service ✅ | application service ✅ | application service ✅ |
| subscribe 호출자 | **다른 어댑터 (WS 핸들러) ❌** outbound port 정의 위반 | 같은 어댑터 내부 협업 ✅ | 가짜 application service (`JoinRoomUseCase`) 를 거치게 함 ✅ (대신 도메인 오염) |
| 헥사고날 정합성 | 표면적으로만 정합. 의존 방향이 도메인 → 인프라가 아닌 어댑터 → 어댑터 | 호출자 기준으로 정확. publish 만 도메인의 의도 | 형식적으론 100%. 하지만 도메인이 connection lifecycle 을 알아야 함 |
| 도메인 오염 | 없음 (port 만 있고 도메인은 그 port 를 모름 → 더 이상함) | 없음 | **있음.** "방 입장" 이 비즈니스 이벤트로 격상되며 도메인이 WebSocket connection 개념을 흡수 |
| ws-redis 트랙 §4 룰 | publish 시그니처 그대로면 V1 어댑터와 빈 충돌 (`BroadcastChatMessagePort` 구현체 두 개) | Step 2~5: publish 도 V2 어댑터 내부에 두고 회피. Step 6 cutover 에서 끌어올림 | 같은 빈 충돌 + 도메인까지 V1·V2 동시 변경 → 더 위험 |
| ceremonial 추상화 | 있음. 만들어도 도메인은 그 port 를 안 씀 | 없음 | 매우 큼. 어차피 어댑터 내부에서 끝날 일을 도메인까지 끌어올림 |
| 적합한 상황 | 어댑터끼리의 통신을 명시적 계약으로 만들고 싶고, 도메인 오염을 감수할 수 있을 때 | publish 와 subscribe 의 호출 맥락이 다른 일반적인 pub/sub 시스템 | "방 입장" 자체가 비즈니스 이벤트인 시스템 (예: 입장료 차감, 방장 권한 검증, 입장 이벤트 emit 등) |

### 2.1 A 가 망가지는 지점 — 한 단계 더 깊게

A 를 골랐다고 가정하고 호출 그래프를 그려보면 다음과 같다.

```text
ChatWebSocketHandler  ─── subscribe(roomId) ──▶  RoomMessageBus  ◀── 구현 ── RedisPubSubAdapter
       (inbound 어댑터)                          (outbound port)              (outbound 어댑터)
```

문제 1. **호출자가 도메인이 아니다.** outbound port 는 "안쪽 → 바깥쪽" 으로 호출되어야 하는데, 여기선 바깥쪽 → 바깥쪽 호출이다. 안쪽 (도메인 / application service) 은 등장하지 않는다.

문제 2. **port 인터페이스가 도메인 패키지에 있는데, 도메인이 그걸 안 쓴다.** import 그래프를 보면 `application/port/out/RoomMessageBus` 를 inbound 어댑터가 직접 import 한다. ArchUnit 규칙으로 막는 건 어렵지 않지만, 막아야 한다는 사실 자체가 "이 port 는 outbound 가 아니다" 라는 신호다.

문제 3. **추상화가 도메인에 가치를 주지 않는다.** outbound port 의 효용은 "도메인을 인프라 교체로부터 보호" 하는 것인데, 도메인이 안 쓰면 보호할 게 없다. Redis 를 NATS 로 바꿔도 도메인은 영향 없는데, 그건 publish 만 port 화 해도 동일하게 보장된다.

### 2.2 C 가 도메인을 오염시키는 지점

`JoinRoomUseCase` 를 만들면 application service 에 다음 같은 코드가 생긴다.

```java
class JoinRoomService implements JoinRoomUseCase {
    private final RoomSubscriptionPort subscriptionPort;
    public void joinRoom(JoinRoomCommand cmd) {
        // 비즈니스 규칙? 없다. WebSocket 세션이 방에 참여한다는 사실을 인프라에 알릴 뿐.
        subscriptionPort.subscribe(cmd.roomId());
    }
}
```

이 service 가 검증하는 게 뭔가? "이 유저가 이 방에 들어갈 수 있는가" 같은 비즈니스 규칙이 있다면 의미 있다. 하지만 마음의 고향에서 마을 공개 채팅방은 인증된 유저면 누구나 들어갈 수 있다 ([learning/21](./21-village-public-chat-architecture.md) 의 "마을 = 공개 광장" 모델). 그럼 이 service 는 단지 어댑터 호출의 wrapper 다. **wrapper 를 만들기 위해 도메인이 connection lifecycle 개념을 알아야 한다** — 이게 도메인 오염이다.

언제 C 가 정답이 되는가? "방 입장에 입장료 100 P 차감" 같은 규칙이 생기면 그 즉시 C 가 옳다. 그 때는 비즈니스 이벤트가 되니까. 지금은 아니다.

---

## 3. 이 프로젝트에서 고른 것 — B 의 두 단계 적용

| 시점 | publish | subscribe / unsubscribe |
|---|---|---|
| **Step 2~5** (V1 STOMP · V2 raw WS 동시 운영) | V2 어댑터 내부에서 호출 (port 우회) | V2 어댑터 내부 |
| **Step 6 cutover 이후** | `BroadcastChatMessagePort.broadcastUserMessage` 추가, `SendMessageService` 가 호출 | V2 어댑터 내부 (그대로) |

### 3.1 왜 Step 2~5 동안은 publish 도 port 로 끌어올리지 않는가

V1 어댑터는 이미 `BroadcastChatMessagePort` 를 구현하고 있다 (현재 코드는 `broadcastNpcReply` 만 있지만, `broadcastUserMessage` 를 추가하면 V1 도 같은 인터페이스를 구현해야 한다). 같은 application service 가 그 port 에 의존하는 한, **V1·V2 어댑터 빈이 동시에 등록되어 충돌** 한다.

해결 방법 후보:

1. `@Primary` / `@Qualifier` 분기 — 코드가 지저분해지고 어떤 게 활성인지 모호
2. profile / property 기반 빈 분기 — yml 한 줄로 어댑터 토글 가능하지만, "양쪽 다 활성" 시나리오 (canary, A/B) 가 막힘
3. **port 끌어올리기를 미루고 V2 는 자체 컴포넌트로 publish 함수 호출** — 빈 충돌 자체가 안 생김

ws-redis 트랙 §4 룰이 "V1 코드 손대지 않기" 를 명시하므로, V1 의 `BroadcastChatMessagePort` 구현 시그니처도 손대지 말아야 한다. 그래서 3 을 골랐다.

### 3.2 Step 6 cutover 에서 어떻게 정리되는가

cutover 시점에 V1 어댑터가 통째로 제거된다. 그 즉시:

1. `BroadcastChatMessagePort` 에 `broadcastUserMessage(Message msg)` 추가
2. `SendMessageService` 에서 V2 어댑터를 직접 호출하던 코드를 port 호출로 변경
3. V2 의 `RedisPubSubBroadcastAdapter` 가 `BroadcastChatMessagePort` 의 단일 구현체가 됨 — 빈 충돌 해소
4. subscribe/unsubscribe 는 손대지 않음 (계속 어댑터 내부)

이 정리가 의미하는 것: **헥사고날 정합성은 cutover 라는 자연스러운 정리 시점이 있을 때만 단계적으로 회복하면 된다**. "지금 당장 100% 정합" 을 위해 V1 을 건드리는 건 트랙 룰 위반이고, 빈 충돌 위험을 감수하는 거래다. 학습 노트로 미루는 사유를 명시해두면 충분하다.

---

## 4. 핵심 개념 정리 — outbound port 의 호출자 기준

### 4.1 Cockburn 원전과 Vernon 의 정리

Alistair Cockburn 의 2005 년 "Hexagonal Architecture" 원전 ([alistair.cockburn.us](https://alistair.cockburn.us/hexagonal-architecture/)) 은 "primary actor" / "secondary actor" 라는 표현을 쓴다.

- **primary actor**: 시스템에게 일을 시키는 쪽. 사용자, 외부 시스템 등. inbound (driving) port 를 호출.
- **secondary actor**: 시스템이 일을 시키는 쪽. DB, 메시지 큐, 외부 API 등. outbound (driven) port 를 통해 호출됨.

핵심은 화살표 방향이다. **primary → 시스템 → secondary**. 시스템 (application service) 이 가운데 있고, 양쪽 port 를 모두 자기가 호출하거나 자기가 호출당한다.

Vaughn Vernon 의 _Implementing Domain-Driven Design_ 4장은 이걸 더 쪼개서, "application service 가 domain 을 조정하면서 outbound port 를 부른다" 로 정리한다. **outbound port 의 호출자는 항상 application service (혹은 domain service)** 다. 다른 어댑터가 호출하면 그건 outbound port 가 아니다.

### 4.2 "어댑터끼리의 협업" 은 헥사고날 위반인가

학파에 따라 견해가 갈린다.

- **엄격파** (Tom Hombergs, _Get Your Hands Dirty on Clean Architecture_): 어댑터 간 직접 의존 금지. 모든 협업은 application 을 경유.
- **실용파** (Spring 진영 다수, jOOQ 의 Lukas Eder): 같은 카테고리 어댑터 (둘 다 outbound, 또는 둘 다 outbound) 끼리의 협업은 허용. 단 다른 카테고리 (inbound → outbound 직접 호출) 는 금지.

이 프로젝트는 실용파 쪽이다. 이유:

1. 모든 협업을 application 을 통하면 도메인 오염이 발생 (위 §2.2 의 C 같은 가짜 UseCase)
2. ArchUnit 으로 패키지 의존만 통제하면 충분히 잡힘
3. "어댑터 안에서의 협업" 은 그 어댑터의 내부 사정 — 외부에 노출 안 됨

다만 이 결정을 내릴 때 명심할 것: **어댑터 내부 협업이 늘어날수록 그 어댑터가 '미니 application' 처럼 비대해진다**. 임계점에 도달하면 C 의 UseCase 도입이 정답이 된다. 그 임계점 = "이 협업에 비즈니스 규칙이 끼어든다" 는 시점.

### 4.3 Spring `@MessageMapping` 패턴 — V1 ChatMessageHandler 가 그 예

Spring 의 STOMP `@MessageMapping` 핸들러는 inbound 어댑터지만, 보통 application service 를 거치지 않고 broker (`SimpMessagingTemplate`) 로 직접 publish 한다. 우리 V1 코드도 `ChatMessageHandler` 가 `SendMessageUseCase` 를 부른 뒤, NPC 응답 경로에서만 application service 가 `BroadcastChatMessagePort` 를 호출하는 구조다 (유저 메시지 broadcast 는 STOMP 자체 메커니즘에 위임).

raw WS + Redis 로 가면 STOMP 가 빠지므로 유저 메시지 broadcast 도 application 이 명시적으로 호출해야 한다. 그래서 cutover 시점에 `broadcastUserMessage` 가 추가되는 것이다.

---

## 5. 실전에서 주의할 점

1. **publish 는 application service 호출, subscribe 는 어댑터 내부 호출.** 이 비대칭은 의도된 것이다. 일관성 있게 만들겠다고 셋 다 끌어올리지 말 것.
2. **어댑터 내부 협업이 비즈니스 규칙을 흡수하기 시작하면 즉시 UseCase 로 끌어올린다.** "방 입장에 입장료 차감" 같은 규칙이 추가되는 순간이 그 임계점.
3. **빈 충돌 회피를 위해 port 를 늦게 끌어올리는 건 "임시 결정" 임을 명시.** 지금처럼 학습 노트에 cutover 시점 정리 계획을 적어두지 않으면, V1 제거 후에도 V2 가 어댑터 내부에서 publish 하는 형태가 그대로 남는다.
4. **ArchUnit 규칙은 패키지 의존만 본다.** outbound port 의 호출자 검증은 자동화가 어려우므로 코드 리뷰에서 잡는다 — "이 port 의 호출자가 누구인가" 를 PR 체크리스트에 포함.
5. **port 명을 호출자 관점으로 짓는다.** `RoomMessageBus.publish` 보다 `BroadcastChatMessagePort.broadcastUserMessage` 가 application service 입장에서 의도가 명확. ([coding.md Port 명명 원칙](../conventions/coding.md))

---

## 6. 나중에 돌아보면

- **이 결정이 틀렸다고 느낄 시점:** 마을 입장에 비즈니스 규칙이 추가되는 순간 (입장료, 방장 승인, 차단 유저 검증 등). 그 때는 C 옵션이 정답이 된다.
- **B 를 그대로 유지해도 되는 시점:** 마을 공개 채팅이 "인증되면 자유 입장" 모델을 유지하는 한.
- **셋 다 끌어올린 A 가 정답이 되는 시점:** 거의 없다. A 가 옳은 시점이 보이면 B 가 무너지고 있는 신호일 가능성이 더 크다 — application service 가 너무 많은 어댑터 협업을 흡수해서 가짜 wrapper 가 늘어났다는 뜻.

스케일이 바뀌면? 서버 수가 늘어 멀티 인스턴스가 되어도 이 결정은 그대로다. subscribe lifecycle 은 connection lifecycle 의 일부고, connection 은 한 서버에 묶여 있다. publish 는 Redis 가 모든 서버에 fan-out 하므로 application service 가 호출하면 끝.

---

## 7. 더 공부할 거리

- **Cockburn 2005 원전** — [Hexagonal Architecture (alistair.cockburn.us)](https://alistair.cockburn.us/hexagonal-architecture/) — "primary / secondary actor" 의 정의가 호출자 기준의 근거.
- **Vernon, _Implementing DDD_ 4장 — Architecture** — application service 가 domain 을 조정하며 outbound port 를 부르는 구조도.
- **Tom Hombergs, _Get Your Hands Dirty on Clean Architecture_** — 엄격파 시각. Adapter 간 직접 의존을 금지하는 논거.
- **채널톡 socket.io-redis 케이스** — [docs/knowledge/realtime/chat.md](../knowledge/realtime/chat.md), [learning/45 §1](./45-websocket-redis-pubsub-redesign.md) — 어댑터 내부 라우팅 + 포트는 도메인 메시지만 추상화한 사례. socket.io 의 namespace/room 개념은 어댑터 내부에 머물고, application 은 "방에 메시지 보내라" 만 안다.
- **LINE LIVE Akka actor + Redis bridge** — [learning/45 §1.5](./45-websocket-redis-pubsub-redesign.md) — actor 라는 인프라 개념을 도메인이 모르도록 격리한 패턴.
- **Spring `@MessageMapping` vs application service** — [learning/15](./15-websocket-stomp-deep-dive.md), [learning/24](./24-stomp-websocket-jwt-channel-interceptor.md) — STOMP 핸들러가 inbound 어댑터로서 application 을 어떻게 부르는가.
- **ArchUnit 규칙의 한계** — [ADR-008](../architecture/decisions/008-ci-dx-tool-stack.md) — 패키지 의존은 잡지만 호출자 의미는 못 잡는다는 것.
- **연관 학습 노트** — [learning/45](./45-websocket-redis-pubsub-redesign.md) (이 결정의 모태가 된 재설계서), [learning/44](./44-spring-stomp-external-broker-choice.md) (STOMP 외부 broker 트레이드오프).
- **헥사고날 3부작** — [learning/08](./08-phase1-layer-patterns.md) (Phase 1 — 정적 팩토리·Port 명명 원칙) → [learning/16](./16-hexagonal-refactoring-responsibility.md) (Phase 3 — 책임 경계 리팩토링) → 본 노트(ws-redis Step 2 — 호출자 기준 port 정의). 시점·범위 매핑.
- **검색 키워드** — "outbound port caller hexagonal", "secondary actor cockburn", "adapter to adapter communication clean architecture".
