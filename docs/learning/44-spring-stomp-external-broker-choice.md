# 44. Spring STOMP 외부 Broker 선택 — 왜 RabbitMQ고 Redis Pub/Sub이 아닌가

> 작성 시점: 2026-04-23
> 맥락: 부하 테스트([load-test-2026-04-22](../reports/load-test-2026-04-22.md)) Sweep 3에서 리소스는 한참 여유인데 `stomp_connect_latency p99 = 12.98s` 가 관찰됐다. Simple Broker 단일 dispatch 쓰레드가 구조적 병목임이 실측으로 확정됐고, 외부 broker 전환이 다음 스텝이 됐다.
> 그런데 검토 초반에 "어차피 실시간 pub/sub이면 Redis Pub/Sub이 제일 가볍지 않나"라는 질문이 먼저 튀어나왔다. ADR-007에도 실제로 "Redis Pub/Sub 기반 외부 브로커로 교체"라고 적혀있다. 이게 **왜 틀렸는지**, 그리고 **왜 RabbitMQ 쪽이 정답인지**를 구조적으로 정리해둬야 다음 의사결정이 흔들리지 않는다.
> 관련: [15. WebSocket + STOMP 딥다이브](./15-websocket-stomp-deep-dive.md) · [21. 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md) · [24. STOMP JWT 인증](./24-stomp-websocket-jwt-channel-interceptor.md) · [43. 부하 테스트 서사](./43-load-test-breaking-point-story.md)

---

## 1. 배경 — "리소스는 여유인데 왜 12초가 걸리죠"

Sweep 3 (1 GiB heap + Tomcat 400 threads) 에서 VU 200 plateau 기준:

| 패널 | 값 | 판정 |
|------|-----|------|
| Heap Total | 44.8% | 여유 |
| CPU Process | 45% | 여유 |
| Threads Live | 123 / 400 | 여유 |
| Major GC pause | 0 ms | 여유 |
| **stomp_connect_latency p99** | **12.98 s** | 🔴 |

CPU·메모리·쓰레드 어느 것도 포화가 아닌데 **STOMP CONNECT → CONNECTED 응답까지 12초**. 원인은 단 하나로 좁혀진다.

> Simple Broker 의 단일 dispatch 쓰레드가 `VU × VU × 2Hz` = **80,000 dispatch/s** fan-out 을 처리하는 동안, 신규 CONNECT 프레임도 같은 큐 뒤에 줄 서 있다.

[부하 리포트 §2.7.5](../reports/load-test-2026-04-22.md#275-수습-방향--3가지-선택지) 표에 "B. STOMP Simple Broker → Redis Pub/Sub (external)" 이라고 적혀있지만, 이 문장은 **정확히 틀렸다**. `enableStompBrokerRelay()` 에 Redis 를 그냥 꽂을 수 없다. 이 노트는 그 이유를 끝까지 파헤친다.

---

## 2. STOMP 프로토콜, 이 맥락에서만 딱 필요한 만큼

STOMP(Simple Text Oriented Messaging Protocol) 는 **메시지 라우팅 시맨틱을 담은 텍스트 프레임 포맷**이다. WebSocket 은 "양방향 바이트 파이프" 일 뿐 "어디로 보내라 / 누가 구독한다" 라는 개념이 없기 때문에, 그 위에 얹는 규약이 필요하다. STOMP 가 그 자리를 채운다.

프레임 예시 ([learning/15](./15-websocket-stomp-deep-dive.md) 에 전체 설명):

```text
SEND
destination:/topic/chat/village
content-type:application/json

{"text":"안녕하세요"}
\0
```

```text
SUBSCRIBE
id:sub-0
destination:/topic/chat/village

\0
```

프레임은 `COMMAND\n headers\n\n body \0` 구조다. 명령어(`CONNECT/SEND/SUBSCRIBE/MESSAGE/ACK/ERROR` 등) + 헤더 + 본문. **텍스트 기반이고 프로토콜이 정해져 있다는 것**이 이 노트의 핵심 포인트다.

이 프로젝트에서 STOMP 를 쓰는 위치:

| 레이어 | 위치 | 역할 |
|--------|------|------|
| 서버 라우팅 | `@MessageMapping("/chat/village/send")` | `/app/chat/village/send` 로 들어온 SEND 를 자바 메서드로 매핑 |
| 서버 발행 | `SimpMessagingTemplate.convertAndSend("/topic/...")` | Broker 에 MESSAGE 프레임 위임 |
| 인증 | `ChannelInterceptor` (CONNECT 프레임 JWT 검증) | [learning/24](./24-stomp-websocket-jwt-channel-interceptor.md) |
| 클라이언트 | `@stomp/stompjs` · `SockJS` | 브라우저측 STOMP 프레임 조립/파싱 |

"STOMP 를 쓴다" 는 말은 위 네 레이어 전부가 STOMP 프레임을 전제로 만들어져 있다는 뜻이다. 이걸 통째로 걷어내는 비용이 이 노트의 결정을 좌우한다.

---

## 3. Simple Broker 는 왜 단일 쓰레드에서 막히는가

`enableSimpleBroker("/topic", "/queue")` 는 내부적으로 `SimpleBrokerMessageHandler` 를 등록한다. 구조는 단순하다:

```text
                               ┌──────────────────────┐
  WS session A ─┐              │   Simple Broker      │
  WS session B ─┼─ inbound ───▶│  (single worker)     │──▶ subscriber fan-out
  WS session C ─┘    queue     │  SubscriptionRegistry│     (전원에게 MESSAGE)
                               └──────────────────────┘
```

- **inbound channel** 로 모든 CONNECT/SUBSCRIBE/SEND 프레임이 들어온다.
- **Simple Broker 의 dispatch 는 기본적으로 단일 쓰레드** 로 돌면서 Subscription Registry 를 조회하고, 매칭되는 subscriber 세션 각각에 MESSAGE 프레임을 push 한다.
- fan-out 계산식: `fan_out_rate = sender_rate × subscribers` . 마을 공개 채팅처럼 "전원이 전원을 구독" 하는 구조면 `VU × (VU × send_rate)` = `VU² × send_rate` 가 된다.

VU 200 · 초당 2 SEND 기준: `200² × 2 = 80,000 dispatch/s`. 이게 전부 한 쓰레드의 큐로 들어가니, CPU 가 남아돌아도 큐 대기 시간이 쌓인다. 신규 CONNECT 프레임도 같은 inbound 큐를 통과하기 때문에 "새 유저 입장이 12초 걸린다" 는 증상이 나온다.

> Simple Broker 의 진짜 제약은 "인메모리" 가 아니라 **"단일 JVM · 단일 dispatch thread"** 다. 멀티 인스턴스 불가는 덤.

---

## 4. `enableStompBrokerRelay()` 가 무엇을 요구하는가

Spring 은 외부 broker 로 옮길 때 `enableStompBrokerRelay()` 를 제공한다. 이름이 핵심이다 — **Relay**. Spring 은 직접 subscription 을 관리하지 않고, **받은 STOMP 프레임을 외부 서버에 그대로 TCP 로 전달**한다.

```text
  브라우저                    Spring (Relay 모드)              외부 broker
     │   WebSocket + STOMP        │    TCP + STOMP                  │
     │──── CONNECT ──────────────▶│───── CONNECT ─────────────────▶│ (STOMP 네이티브로
     │◀─── CONNECTED ─────────────│◀──── CONNECTED ────────────────│  이해해야 함)
     │──── SUBSCRIBE /topic/X ───▶│───── SUBSCRIBE /topic/X ──────▶│
     │                            │                                 │
     │                            │   (서버측 SEND도 마찬가지로    │
     │                            │    브로커로 중계)               │
     │◀─── MESSAGE ───────────────│◀──── MESSAGE ──────────────────│
```

포인트 둘:

1. **Spring 은 더 이상 dispatch 를 안 한다.** Subscription Registry 도, fan-out 도 전부 외부 broker 책임.
2. **외부 broker 가 STOMP 프로토콜을 네이티브로 이해해야 한다.** Spring 은 말 그대로 "던지기만" 한다.

이 두 번째 조건이 모든 걸 결정한다.

---

## 5. RabbitMQ + `rabbitmq_stomp` 가 표준이 되는 이유

RabbitMQ 는 본래 AMQP 브로커지만, 공식 plugin `rabbitmq_stomp` 를 켜면 TCP 포트 61613 에서 **STOMP 1.0/1.1/1.2 프레임을 네이티브로 수락**한다. `destination` 헤더 문법 (`/topic/...`, `/queue/...`, `/exchange/...`) 까지 STOMP 규약대로 해석한다.

활성화는 사실상 한 줄이다.

```bash
rabbitmq-plugins enable rabbitmq_stomp
```

Docker Compose 라면:

```yaml
rabbitmq:
  image: rabbitmq:3.13-management
  environment:
    RABBITMQ_PLUGINS: rabbitmq_stomp,rabbitmq_management
  ports:
    - "61613:61613"   # STOMP
    - "15672:15672"   # 관리 UI
```

Spring 측은 Config 두 줄 갈아끼우면 끝이다.

```java
// Before
config.enableSimpleBroker("/topic", "/queue");

// After
config.enableStompBrokerRelay("/topic", "/queue")
      .setRelayHost(rabbitHost)
      .setRelayPort(61613)
      .setClientLogin(user)
      .setClientPasscode(pass);
```

`@MessageMapping`, `SimpMessagingTemplate`, `ChannelInterceptor`, 클라이언트 `stompjs` — **어느 것도 변경 없음**. 이 조합이 Spring 공식 가이드가 첫 줄에 내세우는 표준이다.

---

## 6. Redis Pub/Sub 이 "바로는" 안 되는 이유

Redis 는 RESP(REdis Serialization Protocol) 를 쓴다. `*3\r\n$9\r\nSUBSCRIBE\r\n...` 같은 바이너리 텍스트 포맷이다. STOMP 프레임 (`SUBSCRIBE\nid:sub-0\ndestination:/topic/...\n\n\0`) 을 Redis 에 그대로 던지면 Redis 는 파싱조차 못 한다.

즉 **Redis Pub/Sub 은 `enableStompBrokerRelay()` 에 직접 꽂을 수 없다**. Spring 공식 Broker Relay 는 STOMP-speaking 서버 (RabbitMQ, ActiveMQ, HornetQ 등) 전용이다.

Redis 로 가려면 **셋 중 하나를 선택해야 한다**:

### A. Simple Broker 의 백엔드만 Redis 로 교체

`SimpleBrokerMessageHandler` 를 상속하거나 `AbstractBrokerMessageHandler` 를 직접 구현해, subscription registry 와 cross-instance fan-out 을 Redis Pub/Sub 으로 돌리는 방식. Spring Session 의 WebSocket 통합이 이 접근을 취한다.

- 장점: 클라이언트·API 는 그대로 STOMP
- 단점: **직접 구현해야 하고**, 수명 관리·ACK·에러 프레임 매핑 같은 세부를 전부 떠안는다. 공식 지원 없음
- 현실: 프로덕션에 띄우려면 몇 주 단위 작업. 그걸 그 자리에서 해야 할 이유가 있나?

### B. STOMP 자체를 걷어내고 raw WebSocket + Redis 구독

Spring STOMP 레이어를 아예 버리고, `TextWebSocketHandler` 로 JSON 메시지를 주고받으며 서버는 Redis Pub/Sub 채널을 구독해서 fan-out 하는 방식. Socket.IO 계열 튜토리얼에 자주 나온다.

- 장점: Redis 가 가볍고 익숙함
- 단점: **이 프로젝트에 쌓인 STOMP 자산을 전부 버려야 한다** — `@MessageMapping` 라우팅, `SimpMessagingTemplate`, `ChannelInterceptor` JWT 검증, 클라이언트 `stompjs`, SockJS fallback, learning 15/21/24/25 의 설계 결정 전부 재작성
- 현실: "브로커 교체" 가 아니라 "실시간 레이어 재작성" 이 된다

### C. Third-party STOMP-over-Redis 어댑터

오픈소스가 몇 개 있긴 하나 활발히 유지되는 건 사실상 없다. 프로덕션 의존하긴 리스크 큼.

> "Redis Pub/Sub 이 더 가벼우니 그쪽이 낫다" 는 감각적 판단은 **전제가 틀렸다**. Redis 가 가벼운 건 맞지만, Spring STOMP 의 Broker Relay 축에 얹으려는 순간 비용 구조가 역전된다.

---

## 7. 이 프로젝트에서 잃는 것 비교표

현재 STOMP 위에 쌓여 있는 자산:

| 자산 | 위치 | 비고 |
|------|------|------|
| STOMP 엔드포인트 · SockJS fallback | `WebSocketConfig` | [learning/15](./15-websocket-stomp-deep-dive.md) |
| `@MessageMapping` 라우팅 | `VillageChatController` 등 | destination prefix `/app` 기반 |
| `SimpMessagingTemplate` 발행 | 도메인 서비스 여러 곳 | 배치 브로드캐스트 포함 |
| CONNECT 프레임 JWT 검증 | `StompAuthChannelInterceptor` | [learning/24](./24-stomp-websocket-jwt-channel-interceptor.md) |
| 멀티유저 인터리빙 방지 | 메시지 귀속 로직 | [learning/25](./25-batch-broadcast-multiuser-message-attribution.md) |
| 클라이언트 `@stomp/stompjs` + `sockjs-client` | 프론트 | 구독 id · reconnect 로직 |

| 경로 | 서버 코드 변경 | 클라이언트 코드 변경 | 도메인 로직 영향 |
|------|-------------|--------------------|-----------------|
| RabbitMQ + STOMP plugin | `WebSocketConfig` 2줄 + `application.yml` 프로퍼티 + Compose 에 RabbitMQ 추가 | **없음** | **없음** |
| Redis Pub/Sub (위 A안 — 커스텀 broker) | 새 `BrokerMessageHandler` 구현 · 테스트 · 운영 검증 | 없음 | 간접 영향 (버그 리스크) |
| Redis Pub/Sub (위 B안 — raw WS) | 채팅 실시간 레이어 **재작성** | **재작성** | 직접 영향 |

변경 비용이 두 자릿수 배 차이난다. 이 프로젝트에서 "값싸게 Redis 로 가자" 는 선택지는 실제로 가장 비싼 선택이 된다.

---

## 8. 결정 트리 — 언제 무엇을 고르나

```text
이미 Spring STOMP 위에 자산이 쌓였다?
  └── yes → RabbitMQ + rabbitmq_stomp (또는 ActiveMQ Artemis) ← 이 프로젝트
  └── no  → 다음 질문

raw WebSocket + JSON 만 쓰고, 단지 멀티 인스턴스 fan-out 만 필요하다?
  └── yes → Redis Pub/Sub 이 합리적
  └── no  → 다음 질문

IoT 프로토콜 (MQTT/CoAP/AMQP) 을 섞어 써야 한다?
  └── yes → RabbitMQ (plugin 조합) 또는 EMQX 같은 IoT broker

대량 이벤트 스트리밍 · 리플레이 · 로그 저장이 목적이다?
  └── yes → Kafka (단, Kafka 는 STOMP Relay 아님 · pub/sub 시맨틱도 다름)
```

Kafka 는 이 프로젝트에서도 [31번 학습노트](./31-kafka-idempotency-key-design.md) 에서 다룬 것처럼 도메인 이벤트 백본으로 쓴다. 하지만 **실시간 클라이언트 fan-out 용 STOMP Relay** 로는 쓰지 않는다. 용도가 다르다.

---

## 9. 결론 — 이 프로젝트의 선택

**RabbitMQ + `rabbitmq_stomp` plugin**.

근거 (우선순위 순):

1. **STOMP 자산 전부 보존.** `@MessageMapping`, `SimpMessagingTemplate`, JWT ChannelInterceptor, 클라이언트 `stompjs` 코드 변경 없음.
2. **Spring 공식 권장 조합.** [Broker Relay 문서](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/enable.html) 가 첫 예제로 RabbitMQ 를 든다.
3. **설정 수준 변경으로 끝남.** `WebSocketConfig` 2줄 + `application.yml` 프로퍼티 + Docker Compose 에 서비스 하나 추가. PR 한 번 분량.
4. **AMQP 확장 여지.** 추후 운영 이벤트 큐, dead-letter, 지연 큐 같은 게 필요하면 같은 broker 에서 해결된다.

트레이드오프 (공평하게 적어둔다):

- 컨테이너 추가 1개 (~100 MB RAM · 기본 설정 기준). EC2 t3.medium 에선 여유.
- **새 장애 포인트.** RabbitMQ 가 죽으면 실시간 채팅 전체가 죽는다. HA 클러스터는 아직 고려 안 함.
- 네트워크 홉 1개 추가. 같은 VPC 내부라 무시할 수준이지만 측정 대상에는 포함.
- 운영 복잡도 증가. 메트릭·로그·백업 대상에 RabbitMQ 가 추가됨.
- Redis 는 이미 [세션·인증 캐시]로 도입되어 있어 "새 의존성" 은 아니지만, **"이미 있는 Redis 로 퉁치자"** 는 유혹은 위 §6 A·B 비용 때문에 접는 게 맞다.

### ADR-007 교정 메모

[ADR-007](../architecture/decisions/007-websocket-simple-broker.md) 스케일아웃 계획에 "Redis Pub/Sub 기반 외부 브로커로 교체" 라고 적혀있다. **이 문장은 Spring `enableStompBrokerRelay()` 의미에선 성립하지 않는다.** 이 학습노트를 근거로 ADR-007 을 Superseded 처리하거나 "RabbitMQ + rabbitmq_stomp" 로 교정한 새 ADR 을 추가해야 한다. (실제 마이그레이션 PR 에서 처리 예정.)

---

## 10. 빅테크 실제 구현 사례 — 리서치 요약

§1~§9 의 결론 "RabbitMQ + `rabbitmq_stomp`" 를 Spring 공식 권장만으로 끝내지 말고, 실제 대규모 채팅 시스템들이 이 문제를 어떻게 푸는지 외부 레퍼런스로 교차검증한다. 상세 서사와 URL 전체 목록은 [docs/knowledge/realtime/chat.md §2026-04-23](../knowledge/realtime/chat.md#2026-04-23--채팅-broker-선택-빅테크-사례와-최신-동향) 참조. 여기엔 이 노트의 결정을 보강하는 요점만 추린다.

### 10.1 빅테크들은 대부분 "외부 broker 를 실시간 fan-out backbone 으로 쓰지 않는다"

| 서비스 | 실시간 fan-out | 외부 broker (Redis/Rabbit/Kafka) 위치 |
|--------|---------------|------------------------------------|
| Discord | Elixir/OTP self-built (guild/session process) | Redis 는 세션·캐시, 주 경로 아님 |
| WhatsApp | Erlang/BEAM self-built (연결당 프로세스) | Mnesia + MySQL 샤드. broker 개념 자체 없음 |
| Slack | Java Channel Server + Gateway Server (stateful, consistent hashing) | 전용 채널 서버가 broker 역할 흡수 |
| Twitch | Go Edge + 내부 Pubsub | 내부 분산용 pubsub (자체). Redis/Rabbit 아님 |
| LINE LIVE | Akka actor (서버 내) | **Redis Pub/Sub 을 서버 간 동기화 bridge 로만** 사용 |
| LINE 본체 | 자체 메시지 릴레이 | Kafka 는 영속/분석/서비스 간 이벤트 백본 |
| 카카오톡 | 자체 메시지 릴레이 (C++ → JVM 포팅 중) | Redis 는 세션/미확인 카운트 |
| 채널톡 | Socket.IO + adapter | **Redis Pub/Sub → NATS 이주** (O(M×N) 부하 때문) |

→ 핵심 관찰: **초대규모에서 외부 broker 는 실시간 경로의 병목이 되고, 그래서 자체 broker 를 짠다.** 이 프로젝트는 그 스케일이 아니고, 반대로 **초기엔 외부 broker 가 저렴한 정답**인 구간에 있다.

### 10.2 Redis Pub/Sub 의 실제 용법은 "Simple Broker 대체" 가 아니다

가장 잘 정리된 실전 레퍼런스는 LINE LIVE 공식 블로그 (`The architecture behind chatting on LINE LIVE`) 와 국내 채널톡의 2편짜리 이주기. 공통된 사용 패턴:

- 각 서버 내부 fan-out 은 **애플리케이션 레벨 actor/worker** 가 담당
- Redis Pub/Sub 은 **멀티 인스턴스 간 브릿지 채널**
- 즉 "Simple Broker 역할을 Redis 로 대체" 가 아니라 "서버 간 메시지 동기화" 만 맡김

§6 에서 "Redis Pub/Sub 을 `enableStompBrokerRelay()` 에 직결 불가" 라고 쓴 판단이 외부 레퍼런스와 일치. LINE LIVE 도 Akka Cluster/event bus 와 비교 후 "운영 쉬움 + 구현 쉬움" 이 이유지, 성능 때문이 아니었다. 채널톡은 거기서 더 나아가 스케일이 올라오자 **Redis 자체를 NATS 로 바꿨다** — Redis Pub/Sub 의 한계를 실전에서 맞은 사례다.

### 10.3 "빠른 속도 = Redis, 큐 = RabbitMQ" 이분법 재검토

채팅의 워크로드는 **"큐" 가 아니라 "pub/sub + 별도 영속 저장소"**. 미수신 메시지는 broker 가 쌓아뒀다 재배달하는 게 아니라, 클라이언트가 재접속할 때 Cassandra/DynamoDB/MySQL 에서 조회하는 구조. 따라서:

- RabbitMQ 가 채팅에 적합한 이유는 **큐 기능이 아니라 STOMP 를 네이티브로 말한다** 는 점. AMQP 큐 semantics 는 부차적
- Redis Pub/Sub 이 빠른 건 맞지만, **Spring STOMP 생태에선 프로토콜 미스매치가 속도 이득보다 큰 비용**
- Kafka 는 채팅 실시간 경로엔 부적합 (consumer group + pull 구조, STOMP 미지원) 하지만 **메시지 영속·분석·서비스 간 이벤트** 엔 표준 선택 — LINE 이 2,500억 건/일로 증명

이 프로젝트 현 구조(Cassandra 저장 + Kafka 이벤트 + STOMP 실시간) 와 정확히 맞물린다.

### 10.4 최근 트렌드가 보강하는 방향 (2024~2026)

- **Centrifugo + NATS JetStream**: raw WebSocket 기반 신규 프로젝트에서 "managed broker" 느낌의 강력한 옵션. STOMP 호환 아님 → 이 프로젝트엔 직접 적합하지 않음. 기록만 남겨둠
- **SaaS (Stream Chat, Ably, PubNub)**: 채팅이 서비스 주가치 아닌 경우 빠르게 채택. 마음의 고향은 "대화 자체가 가치" 라 자체 구축 유지가 정답
- **Kafka의 채팅 영역 고착 위치**: 실시간 broker 가 아니라 **영속·이벤트 파이프라인**. 이 프로젝트 방향과 일치

### 10.5 이 노트의 결정에 대한 외부 레퍼런스 서포트

§9 결론 "**RabbitMQ + `rabbitmq_stomp`**" 는 외부 사례와 다음과 같이 정합한다:

1. **STOMP 자산 보존** — 빅테크는 STOMP 를 안 쓰지만 (그래서 Redis/self-built 같은 자유로운 선택지가 있는 것), 이 프로젝트는 STOMP 위에 쌓였음 → 빅테크 패턴을 그대로 들여올 수 없음
2. **현 규모 + Spring 생태** — LINE LIVE 가 Akka 를 고른 건 JVM + 초대규모 스트리밍 채팅이었기 때문. 이 프로젝트는 Spring + 소규모 시작 → **Spring well-trodden path = RabbitMQ**
3. **단계적 진화 여지** — 훗날 방 단위 수 천 동접이 필요해지면 LINE LIVE 패턴 (actor + Redis bridge) 또는 Slack Channel Server 패턴으로 진화 가능. RabbitMQ 로의 1차 이주가 그 진화를 막지 않음

→ §9 결정은 유지. 외부 사례로 교차검증 완료.

---

## 11. 참고 자료

- Spring 공식: [Enable STOMP — Broker Relay](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/enable.html)
- RabbitMQ: [STOMP Plugin 문서](https://www.rabbitmq.com/docs/stomp)
- 이 프로젝트: [부하 리포트 §2.7.5 수습 옵션 표](../reports/load-test-2026-04-22.md#275-수습-방향--3가지-선택지)
- 이 프로젝트: [43. 부하 테스트 서사 — Simple Broker 구조적 한계](./43-load-test-breaking-point-story.md)
- 이 프로젝트: [15. WebSocket + STOMP 딥다이브](./15-websocket-stomp-deep-dive.md)
- 이 프로젝트: [knowledge/realtime/chat.md — 빅테크 사례 전체 서사 + URL](../knowledge/realtime/chat.md#2026-04-23--채팅-broker-선택-빅테크-사례와-최신-동향)
- LINE Engineering: [Architecture behind chatting on LINE LIVE](https://engineering.linecorp.com/en/blog/the-architecture-behind-chatting-on-line-live/)
- 채널톡: [실시간 채팅 서버 개선 여정 — Redis Pub/Sub 한계와 NATS 이주](https://channel.io/ko/blog/real-time-chat-server-2-redis-pub-sub)
- Slack Engineering: [Real-time Messaging](https://slack.engineering/real-time-messaging/)
- Discord: [Tracing Discord's Elixir Systems](https://discord.com/blog/tracing-discords-elixir-systems-without-melting-everything)

---

> TBD: 실제 마이그레이션 과정 (RabbitMQ 컨테이너 추가, Spring Config 교체, 재부하 테스트, ADR-007 교정) 은 [45. STOMP Broker Relay · RabbitMQ 마이그레이션](./45-stomp-broker-relay-rabbitmq-migration.md) 에서 이어서.
