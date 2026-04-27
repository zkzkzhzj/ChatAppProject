# 21. 마을 공개 채팅 아키텍처 — ZEP/Gather.town에서 배우는 설계 패턴

> 작성 시점: 2026-04-13
> 맥락: NPC 1:1 채팅(Phase 3)에서 마을 공개 채팅으로 확장하면서, 메타버스 플랫폼들의 채팅 구조를 리서치하고 우리 서비스에 맞는 설계를 결정했다.
>
> ℹ️ **시점 공지 (2026-04-27 추가)**
>
> STOMP 시대 작성. 현재는 raw WS 재설계 중 ([#45](./45-websocket-redis-pubsub-redesign.md), [#59](./59-ws-server-separation-vs-monolith.md)).
>
> **유효한 도메인 결정**: §1~2 "Everyone" 채팅 채택 / REST + WebSocket 이중 채널 패턴 / @멘션 NPC / 게스트 읽기 전용
>
> **변경 예정**: §"스케일링 전략"의 Simple Broker → 외부 broker 부분 — 현재 [#46](./46-village-scaling-decisions.md) + [#59](./59-ws-server-separation-vs-monolith.md)에서 다시 정리됨

---

## 배경

현재 프로젝트의 채팅은 NPC와 유저 간 1:1 대화(`ChatRoomType.NPC`)만 존재한다. 마을이라는 공간에 여러 유저가 동시에 접속하면 "마을 전체 채팅"이 필요해진다. 이 문제를 어떻게 풀지 고민하다가, 같은 문제를 이미 해결한 ZEP과 Gather.town의 구조를 참고했다.

---

## 메타버스 채팅의 3단계 구조

ZEP/Gather.town 같은 2D 메타버스 서비스에서 채팅은 보통 3단계로 나뉜다.

```text
+-----------------+------------------+------------------+
|   Everyone      |   Nearby         |   Private (DM)   |
+-----------------+------------------+------------------+
| 공간에 있는     | 캐릭터가 근처에  | 특정 유저와      |
| 모든 유저에게   | 있는 유저에게만   | 1:1              |
| 메시지 전송     | 메시지 전송      | 메시지 전송      |
+-----------------+------------------+------------------+
```

- **Everyone**: 방(공간)에 접속한 모든 유저가 같은 채팅을 본다
- **Nearby**: 캐릭터의 물리적 거리 기준. 일정 반경 안에 있는 유저만 메시지를 받는다
- **Private (DM)**: 1:1 귓속말. 두 유저만 볼 수 있다

## 선택지 비교

| | Everyone (전체 채팅) | Nearby (근접 채팅) | Hybrid (둘 다) |
|--|---------|---------|---------|
| 핵심 개념 | 방 안의 모든 유저가 동일한 채팅 스트림을 공유 | 캐릭터 좌표 기반으로 수신 범위를 제한 | 탭/채널로 분리하여 두 방식을 모두 제공 |
| 장점 | 구현이 단순. 모든 유저가 같은 히스토리를 공유하여 커뮤니티 형성에 유리. 채팅을 통한 "공간감" 제공 | 더 사실적. 동시 접속자가 많아도 개인의 채팅 노이즈가 적음. 소규모 대화가 자연스러움 | 유저에게 선택권 제공 |
| 단점 | 유저 50명 이상이면 채팅이 빠르게 흐름. 대화 추적이 어려움 | 유저마다 메시지 히스토리가 달라짐 (이동 경로에 따라). 서버가 모든 유저의 좌표를 실시간으로 알아야 함. 구현 복잡도 급상승 | 두 가지를 다 만들어야 함. UI 복잡도 증가 |
| 적합한 상황 | 동시 접속 수십~백명 규모의 소규모 커뮤니티 | 수백~수천명이 하나의 맵에 동시 접속하는 대규모 메타버스 | Gather.town처럼 플랫폼 자체가 목적인 경우 |
| 실제 사용 사례 | Discord 채널, Twitch 채팅, ZEP 기본 모드 | Gather.town 기본 모드 (근접 시 비디오/채팅 활성화) | ZEP 확장 설정 |

## 이 프로젝트에서 고른 것

**선택: Everyone (마을 전체 채팅)**

이유:

1. **마을 규모가 작다.** "마음의 고향"은 수만 명이 모이는 플랫폼이 아니라, 수십~백명 단위의 아늑한 마을이다. 이 규모에서 Nearby는 오히려 대화를 파편화시킨다.
2. **커뮤니티 형성이 핵심 가치.** "대화가 그리운 사람을 위한 안식처"라는 컨셉에서, 모든 유저가 같은 대화 흐름을 공유하는 것이 마을의 온기를 느끼게 한다. 누군가의 대화를 옆에서 지켜보다가 끼어드는 것도 자연스럽다.
3. **Nearby의 구현 복잡도가 현재 Phase에서 감당할 수 없다.** 좌표 기반 필터링, 유저별 히스토리 분기, 이동 시 메시지 스트림 전환 등 해결해야 할 문제가 너무 많다.

---

## 핵심 개념 정리

### 1. 채팅방 생명주기 — Persistent Room

마을 공개 채팅방은 "유저가 만들어서 닫는" 게 아니다. 마을이 존재하는 한 채팅방도 존재한다.

```text
마을 생성  ──→  공개 채팅방 자동 생성 (Village와 1:1 매핑)
마을 삭제  ──→  채팅방도 비활성화
```

`ChatRoomType`에 `PUBLIC` 타입이 추가되어 있다. `PUBLIC` 타입의 채팅방은:

- 마을 생성 이벤트가 발생하면 자동으로 함께 생성된다
- 참가자(`Participant`) 관리가 유동적이다 (접속하면 참가, 나가면 해제)
- 삭제 없이 항상 유지된다

### 2. 과거 메시지 처리 — REST + WebSocket 이중 채널

유저가 마을에 입장할 때, 채팅 히스토리를 어떻게 보여줄 것인가?

```text
[유저 입장]
    │
    ├── (1) REST API: GET /api/villages/{id}/chat/messages?limit=50
    │       → 최근 50건 로드 (과거 메시지)
    │
    └── (2) WebSocket SUBSCRIBE: /topic/chat/village
            → 실시간 메시지 수신 시작
```

이 패턴은 Discord(최근 50건), Slack(최근 메시지 번들), Twitch(접속 시점부터) 등 거의 모든 채팅 서비스가 사용하는 업계 표준이다.

**왜 WebSocket으로 히스토리까지 안 보내나?**

- WebSocket은 실시간 스트림에 최적화되어 있다. 한 번에 50건을 묶어 보내는 건 HTTP가 더 적합하다.
- REST로 분리하면 페이지네이션, 캐싱, 에러 핸들링이 독립적으로 동작한다.
- 연결 불안정 시 REST 재시도와 WebSocket 재연결을 독립적으로 처리할 수 있다.

### 3. @멘션 NPC 패턴

NPC가 모든 메시지에 반응하면 채팅이 NPC 응답으로 도배된다. Discord 봇에서 이미 검증된 패턴을 차용한다.

```text
[유저 메시지: "안녕하세요~"]
    → 저장 + broadcast만. NPC 무반응.

[유저 메시지: "@할머니 오늘 뭐 해요?"]
    → 저장 + broadcast
    → @멘션 감지 → NPC 응답 트리거
    → NPC 타이핑 인디케이터 broadcast
    → NPC 응답 생성
    → NPC 응답 메시지 저장 + broadcast
```

Discord 봇의 멘션 패턴이 검증된 이유:

- **노이즈 제어**: 유저가 원할 때만 NPC가 반응한다
- **자연스러움**: 마을에서 "할머니~ 저예요!" 하고 부르는 느낌
- **구현 단순함**: 메시지 파싱에서 `@NPC이름` 패턴만 감지하면 된다

### 4. 게스트 읽기 전용 — Twitch 패턴

로그인하지 않은 방문자도 마을 분위기를 구경할 수 있어야 한다. 이건 유입 전략이기도 하다.

```text
STOMP SUBSCRIBE /topic/chat/village  → permitAll (구독은 인증 불필요)
STOMP SEND /app/chat/village             → authenticated (전송은 인증 필수)
```

Twitch/YouTube Live 채팅과 동일한 패턴. 로그인 없이 채팅을 읽을 수 있고, 대화에 참여하려면 로그인해야 한다.

### 5. WebSocket Destination 설계

```text
/topic/chat/village      ← 일반 메시지 (유저 + NPC 모두)
/topic/village/system         ← 시스템 알림 (입장/퇴장, NPC 타이핑 인디케이터)
/user/queue/errors            ← 개인 에러 메시지 (인증 실패, 권한 없음 등)
```

`/topic/`은 1:N broadcast, `/user/queue/`는 1:1 개인 전달. STOMP의 표준적인 destination 분리 방식이다.

---

## 스케일링 전략 — Simple Broker에서 Redis Pub/Sub로

현재는 Spring의 Simple Broker(인메모리)를 사용하고 있다. 이건 단일 인스턴스에서만 동작한다.

```text
Phase 현재: Simple Broker (단일 서버)
    ↓ 유저 증가, 서버 2대 이상
Phase 미래: Redis Pub/Sub 기반 Relay

[서버 A] ←→ [Redis Pub/Sub] ←→ [서버 B]
    │                               │
    └── 로컬 WebSocket 세션들        └── 로컬 WebSocket 세션들
```

전환 시 변경 범위:

- `WebSocketConfig`에서 broker 설정만 변경하면 된다
- 비즈니스 로직(Service, Domain)은 변경 없음
- RabbitMQ STOMP Relay도 선택지지만, 이미 Redis를 쓰고 있으므로 인프라 추가 없이 Redis Pub/Sub가 합리적

---

## 실전에서 주의할 점

- **메시지 순서 보장**: WebSocket은 TCP 기반이므로 단일 연결 내에서는 순서가 보장된다. 하지만 Redis Pub/Sub로 전환하면 서버 간 메시지 순서가 미세하게 어긋날 수 있다. Cassandra에 저장된 timestamp 기준으로 클라이언트가 정렬해야 한다.
- **채팅 도배 방지**: rate limiting이 필수. STOMP 메시지에 대한 인터셉터에서 초당 메시지 수를 제한한다.
- **REST 히스토리와 WebSocket 실시간 사이의 갭**: 유저가 REST로 50건을 로드하고, WebSocket 구독이 완료되기 전에 새 메시지가 올 수 있다. 클라이언트가 REST 응답의 마지막 messageId와 WebSocket으로 받은 첫 messageId를 비교하여 중복/누락을 처리해야 한다.
- **NPC 응답 지연**: LLM 응답이 느리면 타이핑 인디케이터가 오래 떠 있을 수 있다. timeout(예: 10초)을 설정하고 초과 시 fallback 메시지를 보내야 한다.

---

## 나중에 돌아보면

- **동시 접속 200명 이상**: Everyone 채팅이 너무 빠르게 흐른다면 Nearby를 도입하거나, "슬로우 모드"(메시지 간격 제한)를 고려한다.
- **마을 간 교류**: "옆 마을 놀러가기" 기능이 생기면, 채팅방 구독을 동적으로 전환하는 로직이 필요하다.
- **Redis Pub/Sub 한계**: Redis Pub/Sub는 메시지 영속성이 없다. 서버가 다운되면 그 사이의 메시지를 놓친다. 이게 문제가 되면 Redis Streams나 Kafka로 전환을 검토한다.
- **NPC 대화의 품질 불만**: @멘션 패턴은 "유저가 의도적으로 NPC를 부르는" 상황에만 동작한다. 나중에 NPC가 먼저 말을 거는 proactive 패턴이 필요할 수 있다. 이건 별도의 스케줄링/이벤트 시스템이 필요하다.

---

## 우리 프로젝트에서의 구체적 적용

현재 구현된 변경 사항:

1. **`ChatRoomType`에 `PUBLIC` 추가됨**: `PUBLIC` 타입은 마을과 1:1 매핑되는 공개 채팅방이다.
2. **`SendMessageService` 분기 구현됨**: 메시지 내용에 `@NPC이름` 패턴이 있으면 `GenerateNpcResponsePort`를 통해 NPC 응답을 트리거한다. 없으면 저장+broadcast만.
3. **`GenerateNpcResponsePort` 확장됨**: 대화 맥락을 받을 수 있도록 시그니처가 확장되었다 (공개 채팅에서는 여러 유저의 대화가 섞이므로).
4. **게스트 접근 제어 구현됨**: 게스트도 게스트 JWT를 발급받아 STOMP CONNECT 시 인증한다. 메시지 전송(SEND)은 로그인 유저만 가능.

---

## 더 공부할 거리

- [Spring WebSocket STOMP 공식 문서](https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html) — destination 라우팅, 인터셉터 설정
- [spring-redis-websocket 예제](https://github.com/RawSanj/spring-redis-websocket) — Redis Pub/Sub 기반 멀티 인스턴스 WebSocket 구현
- [redis-stomp-relay](https://github.com/itzg/redis-stomp-relay) — STOMP 메시지를 Redis Pub/Sub로 릴레이하는 구현체
- [Discord 봇 멘션 패턴](https://github.com/Rapptz/discord.py/discussions/5877) — 멘션 기반 봇 반응 구현
- 관련 학습노트: [15-websocket-stomp-deep-dive.md](./15-websocket-stomp-deep-dive.md) — WebSocket/STOMP 기초
- 다음 단계: [22-ollama-local-llm-spring-integration.md](./22-ollama-local-llm-spring-integration.md) — NPC 응답을 실제 LLM으로 구현하는 방법

### 채팅 시스템 설계 — 한국 기업 기술블로그

- [당근마켓 채팅 시스템이 현대화 되어온 과정](https://byline.network/2022/05/0512-2/) — 모놀리식(PostgreSQL) → MSA(Go + DynamoDB)로의 전환기. 2200만 사용자를 위한 채팅 아키텍처
- [당근 테크 블로그: DynamoDB 데이터 변경 이벤트 파이프라인 구축하기](https://medium.com/daangn/dynamodb-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%B3%80%EA%B2%BD-%EC%9D%B4%EB%B2%A4%ED%8A%B8-%ED%8C%8C%EC%9D%B4%ED%94%84%EB%9D%BC%EC%9D%B8-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0-feat-kinesis-1733db06066) — 라이브 스트리밍 채팅 데이터를 DynamoDB + Kinesis로 처리하는 파이프라인
- [LINE LIVE 채팅 기능의 기반이 되는 아키텍처](https://engineering.linecorp.com/ko/blog/the-architecture-behind-chatting-on-line-live) — 라이브 스트리밍 채팅의 WebSocket 구현과 대규모 동시 접속 처리
- [LINE 메신저 아키텍처 — 2억 MAU를 지탱하는 구조](https://speakerdeck.com/line_developers/line-campus-talk-in-uc-berkeley-by-yuto-kawamura) — LEGY 게이트웨이, Redis/HBase 데이터스토어, Kafka 비동기 처리
- [우아한형제들: 회원시스템 이벤트기반 아키텍처 구축하기](https://techblog.woowahan.com/7835/) — MSA 환경에서 이벤트 기반 아키텍처 설계와 메시징 시스템 활용
- [우아한형제들: 우리 팀은 카프카를 어떻게 사용하고 있을까](https://techblog.woowahan.com/17386/) — Transactional Outbox Pattern과 Kafka를 활용한 이벤트 순서 보장

### 실시간 통신 — WebSocket, STOMP, SSE 실무 경험기

- [토스증권의 미국 Option 시세 실시간 제공 사례](https://aws.amazon.com/ko/blogs/tech/toss-securities-nasdaq-options-realtime-pipeline/) — 실시간 시세 데이터를 국가 간 전송하는 파이프라인 설계
- [우아한형제들: Server-Sent Events로 실시간 알림 전달하기](https://techblog.woowahan.com/23199/) — REST API + SSE 조합의 실무 적용기. WebSocket과의 비교
- [Dale Seo: 실시간 양방향 통신을 위한 웹소켓(WebSocket)](https://daleseo.com/websocket/) — WebSocket 기초부터 실무까지 정리
- [Spring WebSocket & STOMP 실시간 채팅 기능](https://brunch.co.kr/@springboot/695) — Spring Boot에서 STOMP 기반 채팅 구현 실전 가이드

### 대규모 채팅 운영 — Discord, Slack, Twitch 엔지니어링

- [Slack Engineering: Real-time Messaging](https://slack.engineering/real-time-messaging/) — Slack의 Channel Server(stateful, in-memory) 기반 실시간 메시징 아키텍처
- [Slack System Architecture 분석](https://medium.com/geekculture/slack-system-architecture-aa9b8cfb886e) — Java 기반 핵심 서비스, consistent hashing, 수백 가지 이벤트 타입 처리
- [Twitch State of Engineering 2023](https://blog.twitch.tv/en/2023/09/28/twitch-state-of-engineering-2023/) — Go로 작성된 채팅 시스템이 하루 수천억 건의 메시지를 처리하는 방법
- [System Design Case Study: Slack의 Real-time Messaging Architecture](https://scaleyourapp.com/system-design-case-study-real-time-messaging-architecture/) — Slack 아키텍처를 시스템 설계 관점에서 분석

### 메시지 저장/검색 — Cassandra, ScyllaDB 등

- [Discord 공식 블로그: How Discord Stores Trillions of Messages](https://discord.com/blog/how-discord-stores-trillions-of-messages) — Cassandra → ScyllaDB 마이그레이션, Rust 기반 Data Services 계층, Request Coalescing 패턴
- [ByteByteGo: How Discord Stores Trillions of Messages](https://blog.bytebytego.com/p/how-discord-stores-trillions-of-messages) — Discord의 메시지 저장 아키텍처를 시각적으로 정리
- [Discord의 Cassandra → ScyllaDB 마이그레이션 상세](https://seifrajhi.github.io/blog/discord-cassandra-to-scylladb/) — 177노드 → 72노드 축소, p99 레이턴시 40~125ms → 15ms 개선
- [ScyllaDB vs Apache Cassandra 공식 비교](https://www.scylladb.com/compare/scylladb-vs-apache-cassandra/) — C++ 기반 shard-per-core 아키텍처가 JVM GC 문제를 해결하는 원리

### 유튜브 영상

#### WebSocket / 실시간 통신 기초~심화

- [WebSockets Crash Course — Hussein Nasser](https://www.youtube.com/watch?v=XgFzHXOk8IQ) — WebSocket 핸드셰이크, 사용 사례, 장단점, 멀티플레이어 게임 및 채팅 구현까지 다루는 5시간 35분 강좌. WebSocket의 근본 원리를 이해하고 싶으면 이 영상부터 보면 된다

#### 채팅/메시징 시스템 설계 (YouTube에서 검색 권장)

- 아래 영상들은 URL을 직접 확인하지 못해 검색 키워드만 제공한다. YouTube에서 검색하면 바로 찾을 수 있다:
  - **"Gaurav Sen WhatsApp System Design"** (채널: Gaurav Sen / gkcs) — WhatsApp 아키텍처를 그룹 메시징, 메시지 상태, 미디어 공유 관점에서 분석. Java/Kafka 기반 구현 예제도 GitHub에 있다
  - **"ByteByteGo Design A Chat System"** (채널: ByteByteGo) — Alex Xu의 System Design Interview 책 기반. WebSocket 연결, 프레즌스 서비스, 메시지 동기화 흐름을 시각적으로 설명
  - **"Hussein Nasser Scaling Websockets with Redis HAProxy"** (채널: Hussein Nasser) — Redis Pub/Sub + HAProxy로 WebSocket 채팅을 수평 확장하는 방법. 우리 프로젝트의 "Simple Broker → Redis Pub/Sub 전환" 계획과 직접 관련
  - **"Hussein Nasser Scalable Real-Time Backends with WebSockets"** — 2025년 출시된 유료 Udemy 강좌. I/O-intensive 채팅 시스템과 CPU-intensive 게임 두 가지를 설계하며 WebSocket 스케일링을 다룬다
