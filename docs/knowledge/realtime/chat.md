# 채팅 시스템 기술 지식

> 관리: realtime-tech-agent | append only

---

<!-- 업데이트는 아래 형식으로 추가: ## YYYY-MM-DD -->

## 2026-04-23 — 채팅 broker 선택: 빅테크 사례와 최신 동향

### 0. 왜 이 섹션을 쓰는가

부하 테스트([load-test-2026-04-22](../../reports/load-test-2026-04-22.md))에서 Spring Simple Broker 의 단일 dispatch 쓰레드가 VU 200 · p99 12.98 s 병목을 만들었다. 외부 broker 전환을 검토하는 과정에서 다음 질문이 다시 올라왔다.

> "Redis Pub/Sub 은 빠르고, RabbitMQ 는 큐 방식이잖아. 그럼 채팅엔 뭐가 좋지?"

이 이분법은 채팅 맥락에선 **반만 맞다**. 이유를 빅테크 실제 구현으로 검증해둔다. 결정 근거는 [learning/44](../../learning/44-spring-stomp-external-broker-choice.md) 에 정리되어 있고, 이 문서는 그 위에 "외부 사례 레퍼런스 레이어"를 덧붙인다.

---

### 1. 빅테크 케이스별 아키텍처 요약

#### 1.1 Discord — Elixir/OTP 기반 self-built broker (Redis 아님)

Discord 는 실시간 메시징 백엔드를 Elixir + Erlang OTP 로 짰다. 핵심 모델은 **프로세스-per-엔티티** 다.

- 서버(길드)마다 `guild process` 하나가 라우팅/조정 책임
- 접속한 유저마다 `session process` 하나
- 새 메시지가 오면 `guild process` → 해당 `session process` 들로 fan-out → 세션이 WebSocket 으로 클라이언트에 push

즉 "broker 를 별도 미들웨어로 두는" 구조가 아니라, **BEAM VM 자체가 broker 역할** 을 한다. 단일 서버가 1,500만 유저를 서빙한 레퍼런스는 이 프로세스 모델과 OTP supervision 덕분이다. 2026-03 InfoQ 기사는 이 위에 distributed tracing 을 올리면서 "million-user fanout" 을 여전히 dynamic sampling 으로 처리하고 있다고 밝혔다.

**핵심 포인트:** Discord 는 Redis Pub/Sub 이나 RabbitMQ 를 메시지 fan-out 의 주 경로로 안 쓴다. 이유는 "자체 BEAM 프로세스가 훨씬 싸기 때문". Redis 를 써도 세션/캐시 용도이지 broker 가 아니다.

출처:

- [Discord — Tracing Discord's Elixir Systems (Without Melting Everything)](https://discord.com/blog/tracing-discords-elixir-systems-without-melting-everything)
- [elixir-lang.org — Real time communication at scale with Elixir at Discord](https://elixir-lang.org/blog/2020/10/08/real-time-communication-at-scale-with-elixir-at-discord/)
- [InfoQ 2026-03 — Discord Engineers Add Distributed Tracing to Elixir's Actor Model](https://www.infoq.com/news/2026/03/discord-elixir-actor-tracing/)
- [ByteByteGo — How Discord Serves 15-Million Users on One Server](https://blog.bytebytego.com/p/how-discord-serves-15-million-users)

#### 1.2 Slack — Channel Server + Gateway Server 분리

Slack 은 Java 로 짠 stateful in-memory 서버 클러스터를 쓴다.

- **Channel Server (CS)**: consistent hashing 으로 채널을 샤딩. 각 host 가 수천만 채널을 in-memory 로 들고 있음. 메시지 전송/이력을 담당
- **Gateway Server (GS)**: stateful, 유저 WebSocket 세션과 subscription 정보를 보관. 지리적으로 분산 배치
- 클라이언트는 GS 에 붙고, GS 가 CS 에 라우팅

즉 Slack 은 **전용 채널 서버** 를 만들었고, Redis/Kafka 같은 범용 broker 를 실시간 fan-out 에 직접 쓰지 않는다. 실시간 경로는 WebSocket + 내부 RPC + CS 의 in-memory subscription registry 다. 채널 서버가 교체될 때 해당 팀 유저가 20 초 이하의 elevated latency 를 겪는다고 공개한 게 2023 InfoQ 기사의 세부.

**핵심 포인트:** 대규모 실시간 fan-out 을 "애플리케이션 레벨 전용 서버" 로 풀었다. 범용 broker 를 backbone 으로 둘 수 있는 스케일이 아니라 판단한 것.

출처:

- [Slack Engineering — Real-time Messaging](https://slack.engineering/real-time-messaging/)
- [InfoQ 2023-04 — Real-Time Messaging Architecture at Slack](https://www.infoq.com/news/2023/04/real-time-messaging-slack/)
- [ByteByteGo — How Slack Supports Billions of Daily Messages](https://blog.bytebytego.com/p/how-slack-supports-billions-of-daily)

#### 1.3 WhatsApp — Erlang/BEAM 고전 레퍼런스

Discord 의 선배 모델. 연결당 하나의 Erlang 프로세스, Mnesia 로 세션/라우팅 정보, MySQL 샤딩으로 영속 저장. 단일 서버가 2 million concurrent connection 을 처리한다고 공개되어 있고, 50 명 엔지니어로 20 억 유저를 유지한 사례는 지금도 회자된다.

WhatsApp 도 Redis Pub/Sub / RabbitMQ 를 실시간 메시지 경로의 backbone 으로 쓰지 않는다. BEAM 프로세스 + Mnesia 조합이 broker 역할을 겸한다.

**핵심 포인트:** Elixir/Erlang 생태계는 "broker 를 외부 의존성으로 두느냐" 자체를 질문으로 여기지 않는다. VM 이 broker 다.

출처:

- [ByteByteGo — How WhatsApp Handles 40 Billion Messages Per Day](https://blog.bytebytego.com/p/how-whatsapp-handles-40-billion-messages)
- [System Design One — 8 Reasons Why WhatsApp Supports 50B Messages/Day With 32 Engineers](https://newsletter.systemdesign.one/p/whatsapp-engineering)
- [scalewithchintan.com — WhatsApp Erlang Architecture · Scaling to 2 Billion Users](https://scalewithchintan.com/blog/whatsapp-erlang-architecture-2-billion-users)

#### 1.4 LINE LIVE — Akka Actor + **Redis Pub/Sub 을 "서버 간 동기화" 용도로** 사용

이 프로젝트와 가장 가까운 JVM 진영 사례. LINE LIVE (라이브 스트리밍 채팅) 는 WebSocket + Akka + Redis Cluster 조합을 공식 블로그에 공개했다.

- `ChatSupervisor` (JVM 당 1개) → `ChatRoomActor` (방당 1개) → `UserActor` (유저당 1개) 3층 actor 구조
- `ChatRoomActor` 가 **Redis Pub/Sub** 에 publish
- **다른 JVM 인스턴스의** `ChatRoomActor` 가 같은 채널을 subscribe 해서 자기 서버에 붙은 유저들에게 다시 broadcast
- Lettuce 클라이언트로 master/slave failover · topology refresh 처리

여기서 중요한 건 Redis Pub/Sub 의 **역할 범위** 다. LINE 은 "Redis 가 전체 fan-out broker 다" 라고 쓰는 게 아니라, **"멀티 인스턴스 간 메시지 브릿지"** 로만 쓴다. 각 서버 내부의 fan-out 은 Akka actor 가, 서버 간 동기화만 Redis 가 맡는다. Akka Cluster 와 event bus 를 검토했지만 "운영이 쉽고 구현이 쉬운" 기준으로 Redis Pub/Sub 을 선택했다고 명시.

**핵심 포인트:** Redis Pub/Sub 이 채팅에 쓰이는 **실제 용도의 전형** 이다. Simple Broker 를 통째로 대체하는 게 아니라, 애플리케이션 레벨 fan-out 위에 얹는 "cross-instance bridge".

출처:

- [LINE Engineering — The architecture behind chatting on LINE LIVE](https://engineering.linecorp.com/en/blog/the-architecture-behind-chatting-on-line-live/)
- [SlideShare — LINE LIVE のチャットが 30,000+/min のコメント投稿を捌くようになるまで](https://www.slideshare.net/linecorp/line-live-30000min-98811987)

#### 1.5 LINE 본체 메시징 — Kafka 백본

LINE 은 메시징/블록체인/광고/LINE LIVE 등 전사 서비스의 이벤트 백본으로 **Kafka** 를 쓴다. 일일 2,500 억 건 · 210 TB 유입, 피크 4 GB/s. 단, 여기서 Kafka 의 역할은 **메시지 저장/분석/다른 서비스로의 전파** 이지 "채팅 메시지를 받은 순간 바로 같은 방 유저한테 푸시하는 경로" 가 아니다.

**핵심 포인트:** Kafka 는 채팅 시스템에서 "영속·재처리·팬아웃(서비스 간)" 레이어로 자주 등장한다. **실시간 클라이언트 push 경로는 별도**. LINE LIVE 의 Redis / 본체의 Kafka 가 역할을 분담하는 이유가 이것.

출처:

- [LINE Engineering — LINE에서 Kafka를 사용하는 방법 1편](https://engineering.linecorp.com/ko/blog/how-to-use-kafka-in-line-1/)

#### 1.6 카카오톡 — JVM 포팅 + Redis 클러스터 (세션/미확인 카운트)

카카오톡 메시징 시스템 재건축 발표(2023, Speaker Deck) 에 따르면, 10년 된 C++ 메시지 릴레이 서버를 Java/Kotlin JVM 으로 포팅 중이다. Redis 클러스터는 **세션 정보 · 읽지 않은 메시지 개수** 같은 고도화된 상태 저장에 쓰인다. 버킷당 100k TPS 이하로 스케일 관리.

공개된 자료 범위에선 "Redis Pub/Sub 이 메시지 fan-out 의 backbone 이다" 같은 주장은 없다. 메시지 릴레이 자체는 **자체 서버** (구 C++, 신 JVM) 가 담당하고 Redis 는 상태 저장소 역할.

**핵심 포인트:** 국내 최대 메신저도 실시간 fan-out 경로는 "직접 짠 서버" 고 Redis 는 보조다.

출처:

- [Speaker Deck — 카카오톡 메시징 시스템 재건축 이야기](https://speakerdeck.com/kakao/kakaotog-mesijing-siseutem-jaegeoncug-iyagi)

#### 1.7 Twitch — Go 기반 전용 서버, Pubsub 은 내부 에지 간 분배용

Twitch Chat 은 Go 로 짠 분산 시스템. 일일 100 억+ 메시지 · 피크 200만 동시 시청자. 구조는 2계층이다.

- **Edge**: TCP/WebSocket 으로 IRC 프로토콜 처리. 클라이언트 종단
- **Pubsub**: Edge 노드 간 내부 메시지 분배

IRC 를 클라이언트 프로토콜로 쓰되 RFC1459 의 **subset 만** 지원해서 효율화. 여기서도 Pubsub 은 **"내부 분산 경로용"** 이지 Redis/Rabbit 같은 외부 broker 가 아니다.

**핵심 포인트:** 수백만 동접 채팅도 "자체 분산 fan-out" 이 정답. 외부 broker 는 일정 규모 이상에선 오히려 장애물.

출처:

- [Twitch Blog — Twitch Engineering: An Introduction and Overview](https://blog.twitch.tv/en/2015/12/18/twitch-engineering-an-introduction-and-overview-a23917b71a25/)
- [mcclain.sh — The Secret of the Twitch Chat API](http://mcclain.sh/posts/twitch-chat-api/)

#### 1.8 당근마켓 — MSA 전환 + DynamoDB

바이라인네트워크 2022 기사와 당근 테크 블로그 기준, 당근마켓은 채팅을 별도 마이크로서비스(Go) 로 분리하고 저장소를 PostgreSQL → DynamoDB 로 옮겼다. 사유는 "메인 DB 의 60% 가 채팅 데이터" 였기 때문. DynamoDB Streams → Lambda → Firehose → S3 → Athena 로 분석 파이프라인 구축.

실시간 fan-out broker 는 공개 자료에 구체적으로 명시되지 않지만, **저장 문제와 실시간 문제를 분리** 한 게 핵심. 채팅 시스템 설계에서 "저장은 별도, 실시간 전달은 별도" 라는 패턴이 반복된다.

출처:

- [바이라인네트워크 — 당근마켓 채팅 시스템이 현대화 되어온 과정](https://byline.network/2022/05/0512-2/)
- [당근 테크 블로그 — DynamoDB 데이터 변경 이벤트 파이프라인 구축하기 (feat. Kinesis)](https://medium.com/daangn/dynamodb-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%B3%80%EA%B2%BD-%EC%9D%B4%EB%B2%A4%ED%8A%B8-%ED%8C%8C%EC%9D%B4%ED%94%84%EB%9D%BC%EC%9D%B8-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0-feat-kinesis-1733db06066)

#### 1.9 채널톡 — Redis Pub/Sub → NATS 전환 여정 (국내 최고 레퍼런스)

채널톡은 Socket.IO + `socket.io-redis-adapter` 로 시작해서 운영 중 Redis Pub/Sub 의 **O(M×N) 부하 폭발** 을 실측으로 맞고 NATS 로 이주했다. 2편짜리 기술 블로그가 국내에서 가장 잘 정리된 "broker 이주 실전기".

요지:

- Socket.IO adapter 구조상 broadcast 시 N 클라이언트 × M 메시지 부하를 Redis 에 그대로 꽂음 → Redis 가 병목
- NATS 는 subject 기반 라우팅이고, clustered NATS 가 메시지 분산을 CPU 효율적으로 처리
- 이주 후 지연/CPU 개선 확인

**핵심 포인트:** Redis Pub/Sub 이 "소규모엔 잘 되는데 특정 스케일에서 무너진다" 는 구체적 증거. 이주 대안으로 Kafka 가 아니라 **NATS** 를 고른 것도 주목.

출처:

- [채널톡 — 실시간 채팅 서버 개선 여정 1편: 레디스의 Pub/Sub](https://channel.io/ko/blog/real-time-chat-server-1-redis-pub-sub)
- [채널톡 — 실시간 채팅 서버 개선 여정 2편: Nats.io로 Redis 대체하기](https://channel.io/ko/blog/real-time-chat-server-2-redis-pub-sub)

#### 1.10 치지직 · SOOP — 공개 자료 제한

네이버 치지직, SOOP(구 아프리카TV) 는 공식 기술 블로그에 채팅 아키텍처 상세를 공개한 자료를 찾지 못했다. 비공식 API 라이브러리가 WebSocket 엔드포인트를 역공학한 수준. 사용자 취업 타깃이라 향후 컨퍼런스 발표 / 채용 JD 에서 단서 모니터링 필요.

단, **라이브 스트리밍 채팅** 은 위 LINE LIVE / Twitch 패턴 (WebSocket 엔드포인트 + 지역 edge + 내부 pub/sub) 이 사실상 업계 표준이다.

참고:

- [GitHub — kimcore/chzzk: 치지직 비공식 API](https://github.com/kimcore/chzzk)
- [GitHub — dokdo2013/awesome-chzzk](https://github.com/dokdo2013/awesome-chzzk)
- [GitHub — zzik2/soop4j: SOOP 비공식 API](https://github.com/zzik2/soop4j)

---

### 2. broker 기술 비교표

| 축 | Redis Pub/Sub | Redis Streams | RabbitMQ | Kafka | NATS / Centrifugo |
|-----|-------------|---------------|----------|--------|-------------------|
| 전달 보장 | at-most-once (fire-and-forget) | at-least-once (consumer group + ACK) | at-least-once (ACK/DLQ) | at-least-once + 순서(파티션 단위) | NATS core at-most-once / JetStream at-least-once |
| 영속성 | 없음 | 있음 (stream) | 있음 (queue durable) | 있음 (log, 기본 영속) | JetStream 기준 있음 |
| 지연 | 매우 낮음 (메모리) | 낮음 | 낮음 | 중간 (batching/poll) | 매우 낮음 |
| 처리량 | 높음 | 높음 | 중간 (4k–10k/s 레퍼런스) | 매우 높음 (1M/s급) | 매우 높음 |
| STOMP 네이티브 | ❌ | ❌ | ✅ (`rabbitmq_stomp`) | ❌ | ❌ (Centrifugo 는 자체 프로토콜 + WebSocket) |
| Spring broker relay | ❌ 직결 불가 | ❌ | ✅ 공식 | ❌ | ❌ |
| 용도 적합 | cross-instance bridge, presence | 짧은 이력 저장 + 재처리 | **Spring STOMP 생태 실시간 fan-out** | 영속 · 분석 · 서비스 간 | cloud-native 고성능 pub/sub |
| 대표 사례 | LINE LIVE (서버 간 동기화), 채널톡 (이주 전) | SaaS adapter, 경량 chat | 다수 Spring 기반 서비스 | LINE 본체 이벤트 백본, 카카오 이벤트 | 채널톡, Centrifugo 사용자군 |

### 3. 워크로드 특성별 추천

| 워크로드 | 추천 | 이유 |
|----------|------|------|
| 1:1 DM (양방향) | RabbitMQ + STOMP plugin (JVM) / 자체 서버 (Elixir, Go) | 라우팅은 destination 기반, 메시지 영속은 별도 DB. broker 는 실시간 전달만 |
| 소규모~중규모 그룹 채팅 (채널/방) | RabbitMQ + STOMP plugin | 방당 `/topic/...` destination + SimpMessagingTemplate 로 해결. 운영 복잡도 최저 |
| 대규모 라이브 스트리밍 채팅 (수천~수만 동접 방) | Akka/Actor + Redis Pub/Sub cross-bridge (LINE LIVE) / 전용 edge (Twitch) | in-memory subscription 이 방당 유지되고 Redis 는 서버 간 동기화만 |
| 초대규모 (수백만 동접) | 자체 broker (Discord/WhatsApp BEAM, Slack CS, Twitch Edge) | 외부 broker 가 오히려 병목 |
| 멀티 리전 · 재해 복구 | Kafka 백본 + 리전별 WebSocket edge | Kafka 는 영속 + 지역 복제 강점, 실시간 경로는 분리 |
| 모바일 오프라인 후 재동기화 | Kafka/Redis Streams + offset 저장 | 클라이언트가 마지막 읽은 offset 을 들고 오면 그 뒤를 재플레이 |
| 채팅 + 음성/영상 통합 | 별도 SFU (LiveKit, mediasoup) + 채팅 broker 분리 | 시그널링만 채팅 broker 태우고, 미디어는 별도 경로 |

### 4. 핵심 질문 5개에 대한 답

#### Q1. "빠른 속도 = Redis, 큐 = RabbitMQ" 라는 이분법이 왜 반만 맞는가

**채팅은 "큐 패턴" 이 아니라 "pub/sub + 별도 저장소" 패턴이기 때문이다.** 채팅 메시지는 구독자 전원에게 동시에 뿌려지고, 대부분의 빅테크 구현에서 실시간 전달은 fire-and-forget 이다. "받지 못한 메시지" 는 broker 가 쌓아뒀다가 재배달하는 게 아니라, 클라이언트가 재접속할 때 **별도의 영속 저장소**(Cassandra/DynamoDB/MySQL) 에서 역으로 조회한다. 따라서:

- "빠르니까 Redis" → 절반 맞다. 단 Redis Pub/Sub 의 "빠름" 은 **in-memory + fire-and-forget** 의 산물이고, STOMP 생태에선 프로토콜 미스매치가 더 큰 비용
- "큐니까 RabbitMQ" → 오히려 맞는 부분은 **AMQP 큐가 아니라 RabbitMQ 가 STOMP 를 말할 줄 안다는 것**. Spring 의 `enableStompBrokerRelay()` 가 요구하는 게 이것

즉 "채팅 = 큐가 필요한 워크로드" 가 맞지 않다. 채팅 = **토픽 pub/sub + 영속 저장소** 가 맞다.

#### Q2. Redis Pub/Sub 이 채팅 빅테크에서 실제로 어떻게 쓰이는가

대부분 **"Simple Broker 대체"** 가 아니라 **"멀티 인스턴스 fan-out 브릿지"** 로 쓰인다.

- LINE LIVE: Akka actor 가 서버 내 fan-out 을 담당, Redis Pub/Sub 은 서버 간 동기화만
- Socket.IO (Node 진영): `socket.io-redis-adapter` 로 멀티 인스턴스 브릿지 — 채널톡이 이 용법으로 시작했다가 O(M×N) 부하로 NATS 이주
- 자체 서버 스케일아웃 시의 cross-instance 동기화 채널

Redis Pub/Sub 이 "메시지 라우팅의 주 경로" 가 되는 케이스는 소규모 프로젝트 외엔 드물다. 스케일이 올라오면 O(M×N) 이 터진다.

#### Q3. RabbitMQ 가 채팅에서 상대적으로 덜 자주 보이는 이유와, 그럼에도 Spring STOMP 생태계에서 왜 표준인가

덜 자주 보이는 이유:

- 초대규모 채팅은 애초에 자체 broker 를 짠다 (Discord/WhatsApp/Slack/Twitch). 범용 broker 의 큐/ACK 오버헤드가 과도함
- Erlang/Go 생태계는 "언어 기본기" 로 fan-out 이 해결됨

그럼에도 Spring STOMP 에서 표준인 이유:

- **RabbitMQ 가 STOMP 프로토콜을 네이티브로 말하는 유일하게 활발한 OSS broker**. `rabbitmq_stomp` plugin 이 TCP 61613 포트로 STOMP 1.0/1.1/1.2 프레임을 그대로 수락한다
- `enableStompBrokerRelay()` 는 말 그대로 "TCP 로 STOMP 프레임을 외부 서버에 중계" 이고, 그 외부 서버가 STOMP 를 이해해야 하는데 현실적 선택지가 **RabbitMQ 거의 독점** (ActiveMQ Artemis 도 지원하지만 Spring 생태 레퍼런스가 훨씬 적음)
- 결과: Spring STOMP 를 쓰는 순간 외부 broker 후보는 사실상 **RabbitMQ 1순위**

#### Q4. Kafka 가 채팅에 왜 잘 안 맞는가 (또는 어디에 쓰이는가)

**채팅 실시간 전달 경로엔 안 맞는 이유:**

- pub/sub 시맨틱이 다름. Kafka 는 **consumer group 당 offset 기반 pull** 이라 "토픽 구독자 전원에게 push" 구조가 아님. WebSocket 세션 단위 구독을 표현하려면 consumer group 을 세션마다 만들어야 하는데, 이게 경량이 아님
- partition 기반 순서 보장은 좋지만, 채팅 메시지는 **방 단위 순서만 맞으면 되고** 전역 순서는 불필요
- latency 는 broker polling / batching 구조라 RabbitMQ 대비 기본 레이턴시 높음
- STOMP 프레임을 Kafka 가 말하지 않음 → `enableStompBrokerRelay()` 불가

**그럼에도 채팅 시스템에서 Kafka 가 자주 쓰이는 위치:**

- 메시지 **영속/로그/분석** 파이프라인 (LINE 일일 2,500억 건 사례)
- 서비스 간 이벤트 백본 (채팅 → 알림 서비스, 채팅 → 검색 색인)
- 재해 복구용 리플레이 로그

즉 Kafka 는 "채팅이 broker 로 쓰는" 게 아니라 "채팅이 이벤트 소스로 Kafka 에 싣는다". 이 프로젝트의 현재 Kafka 사용도 이 범주에 속한다 (learning/31 idempotency key 참조).

#### Q5. STOMP 위에 자산이 쌓인 프로젝트의 현실적 판단 (빅테크들과의 차이)

빅테크 대부분은 **STOMP 를 안 쓴다**. Discord/WhatsApp/Slack/Twitch 모두 자체 프로토콜이거나 IRC subset 이다. 이들이 Redis/RabbitMQ/Kafka 를 쓰든 말든의 논의는 "STOMP 를 포기할 수 있는 팀" 의 논의다.

반면 이 프로젝트(와 수많은 Spring 기반 서비스) 는 STOMP 위에 이미 아래가 쌓여있다:

- `@MessageMapping` 기반 라우팅
- `SimpMessagingTemplate` 발행 코드 다수
- `ChannelInterceptor` JWT 검증 (learning/24)
- 멀티유저 배치 브로드캐스트 로직 (learning/25)
- 프론트 `@stomp/stompjs` + `SockJS` fallback

이 레이어를 버리고 "Redis 직결" 이나 "raw WebSocket + Kafka" 로 옮기는 비용은 수 주~수 개월이다. 반면 RabbitMQ + `rabbitmq_stomp` 는 `WebSocketConfig` 2줄 + compose 에 컨테이너 1개 추가로 끝난다. 변경 비용이 두 자릿수 배 차이.

**결론:** 빅테크가 "Redis 가 좋다/안 좋다" 를 말할 때 그들은 STOMP 컨텍스트가 아닌 raw WebSocket 컨텍스트에서 말하고 있다. 그걸 STOMP 프로젝트에 그대로 적용하면 안 된다. → 이 프로젝트는 **RabbitMQ + STOMP plugin** 으로 가고, Redis 는 **presence / 방 상태 L1 캐시 / 향후 cross-instance bridge 용** 으로 제한한다.

---

### 5. 2024~2026 신흥 트렌드

#### 5.1 Centrifugo — "채팅 전용 broker" 성숙

Centrifugo 는 real-time messaging 서버로 독립 실행되며 언어 agnostic 백엔드와 붙는다. 2024~2025 기준 NATS JetStream 백엔드 지원을 정식화해서, **WorkQueue 정책으로 클러스터 인스턴스 간 분산 처리** 가 된다. JetStream 이 at-least-once 를 보장하니 영속까지 확보.

- STOMP 호환 아님 → 이 프로젝트엔 직접 적합하지 않음
- raw WebSocket 기반 신규 프로젝트에선 강력한 옵션

출처:

- [Centrifugo — Comparing with others](https://centrifugal.dev/docs/getting-started/comparisons)
- [centrifugal/centrifugo#273 — NATS as Pub/Sub broker](https://github.com/centrifugal/centrifugo/pull/273)

#### 5.2 NATS JetStream — RabbitMQ/Kafka 사이의 새로운 후보

2025 기준 NATS JetStream 은 클라우드 네이티브 환경에서 "낮은 레이턴시 + 운영 단순성" 으로 RabbitMQ/Kafka 사이 포지션을 굳혔다. 채널톡 이주 사례가 증명. 단 JetStream 의 subject 모델이 STOMP destination 과 직결되지 않아서 Spring STOMP 로 쓸 땐 별도 어댑터가 필요.

출처:

- [onidel.com 2025 — NATS JetStream vs RabbitMQ vs Apache Kafka](https://onidel.com/blog/nats-jetstream-rabbitmq-kafka-2025-benchmarks)
- [sanj.dev — NATS vs Apache Kafka vs RabbitMQ: Messaging Showdown](https://sanj.dev/post/nats-kafka-rabbitmq-messaging-comparison)

#### 5.3 Chat SaaS — Stream Chat / Ably / PubNub / Sendbird

"채팅을 자체 구축하지 말고 API 로 쓴다" 트렌드가 견고. 특히:

- **Stream Chat**: UI kit + SDK + 멀티 테넌시. SOC2/HIPAA/GDPR 준수. 기능 풍부
- **Ably**: 저수준 pub/sub, DIY 성향. 메시지 순서/전달 보장 강점
- **PubNub**: pub/sub 인프라 → 채팅 기능 추가형. UI 컴포넌트 축소 중

채팅 기능이 주력이 아닌 서비스 (전자상거래 고객지원, 커뮤니티 보조 기능 등) 에서 빠르게 채택. 단, **도메인과 데이터가 자산인 서비스**(= 마음의 고향처럼 "대화 자체" 가 서비스 가치) 에서는 벤더 락인 + 커스터마이징 한계로 자체 구축이 일반적.

출처:

- [Stream — Ably Alternatives](https://getstream.io/blog/ably-alternatives/)
- [CometChat — PubNub vs Ably](https://www.cometchat.com/blog/pubnub-vs-ably)

#### 5.4 Kafka 의 채팅 영역 재등장 — 저장/분석 레이어

2024~2026 Kafka 의 채팅 영역 사용은 "실시간 broker" 가 아니라 **메시지 영속/이벤트 파이프라인** 으로 수렴. LINE 의 2,500억 건/일 사례, 카카오페이의 "전사 메시지 큐 = Kafka, 캐시 = Redis" 정책이 대표적. 이 프로젝트의 방향과 일치한다.

출처:

- [AWS — Redis와 Kafka 비교](https://aws.amazon.com/compare/the-difference-between-kafka-and-redis/)
- [Devzery 2025 — Kafka vs RabbitMQ Guide](https://www.devzery.com/post/kafka-vs-rabbitmq-complete-guide)

---

### 6. 이 프로젝트(마음의 고향) 에의 적용 정리

| 레이어 | 선택 | 근거 |
|--------|------|------|
| 클라이언트 ↔ 서버 실시간 | WebSocket + STOMP (유지) | 프론트 `stompjs` · `SockJS` 자산, JWT ChannelInterceptor |
| 단일 인스턴스 fan-out (현재) | Simple Broker (병목 확인됨) | Week 7 부하 테스트로 p99 13s 입증 |
| 단일 인스턴스 fan-out (차기) | **RabbitMQ + `rabbitmq_stomp`** | Spring 공식 경로 · 코드 변경 2줄 · STOMP 자산 보존 |
| 멀티 인스턴스 동기화 | RabbitMQ (broker 자체가 multi-instance 지원) | LINE LIVE 의 Redis 역할을 RabbitMQ 가 겸함 |
| 메시지 영속 | Cassandra (기존) | append-heavy, wide-column 적합. learning/21 참조 |
| 이벤트 파이프라인 | Kafka (기존) | 채팅 → 알림/분석/색인. 실시간 fan-out 과 분리 |
| Redis 역할 | presence, 방 상태 L1 캐시, 인증 | broker 로는 쓰지 않음 — learning/44 §6 |
| 향후 WebRTC (음성/영상) | SFU 별도 (LiveKit/mediasoup 후보), 시그널링만 STOMP | 채팅 broker 와 분리 |
| 초대규모 도달 시 | 자체 fan-out (Akka actor 또는 Kotlin coroutine + Redis Pub/Sub bridge) 검토 | LINE LIVE 패턴. 현 단계에선 불필요 |

### 7. 마음의 고향 관점의 해석

- "소규모 실시간 소통 + 따뜻한 대화" 가 핵심 가치. 초대규모 빅테크 패턴을 그대로 가져오면 오버엔지니어링이다
- 빅테크 자체 broker 는 "Redis/RabbitMQ/Kafka 가 답이 아니라서" 가 아니라 "그 스케일에선 어떤 범용 broker 도 병목" 이라서 만든 것. 이 프로젝트는 그 스케일이 아니다
- **RabbitMQ + STOMP plugin** 은 Spring 생태의 well-trodden path 를 따라 비용 최소 · 학습 자산 최대로 단일 인스턴스 병목을 푸는 방법. 이후 방 단위 수 천 동접이 필요해지면 LINE LIVE 패턴(서버 내 actor + Redis bridge) 또는 전용 채널 서버(Slack 패턴) 로 진화

---

## 참고: 이 섹션에서 인용한 출처 전체 목록

빅테크 구현:

- [Discord blog — Tracing Discord's Elixir Systems](https://discord.com/blog/tracing-discords-elixir-systems-without-melting-everything)
- [Elixir Lang — Real time communication at scale with Elixir at Discord](https://elixir-lang.org/blog/2020/10/08/real-time-communication-at-scale-with-elixir-at-discord/)
- [InfoQ — Discord Adds Distributed Tracing to Elixir's Actor Model (2026-03)](https://www.infoq.com/news/2026/03/discord-elixir-actor-tracing/)
- [ByteByteGo — Discord 15M Users on One Server](https://blog.bytebytego.com/p/how-discord-serves-15-million-users)
- [Slack Engineering — Real-time Messaging](https://slack.engineering/real-time-messaging/)
- [InfoQ — Real-Time Messaging Architecture at Slack (2023)](https://www.infoq.com/news/2023/04/real-time-messaging-slack/)
- [ByteByteGo — Slack Billions of Daily Messages](https://blog.bytebytego.com/p/how-slack-supports-billions-of-daily)
- [ByteByteGo — WhatsApp 40B Messages/Day](https://blog.bytebytego.com/p/how-whatsapp-handles-40-billion-messages)
- [System Design One — WhatsApp 50B msgs/day with 32 engineers](https://newsletter.systemdesign.one/p/whatsapp-engineering)
- [LINE Engineering — Architecture behind chatting on LINE LIVE](https://engineering.linecorp.com/en/blog/the-architecture-behind-chatting-on-line-live/)
- [LINE Engineering — LINE에서 Kafka를 사용하는 방법 1편](https://engineering.linecorp.com/ko/blog/how-to-use-kafka-in-line-1/)
- [Speaker Deck — 카카오톡 메시징 시스템 재건축 이야기](https://speakerdeck.com/kakao/kakaotog-mesijing-siseutem-jaegeoncug-iyagi)
- [Twitch Blog — Twitch Engineering Overview](https://blog.twitch.tv/en/2015/12/18/twitch-engineering-an-introduction-and-overview-a23917b71a25/)
- [mcclain.sh — The Secret of the Twitch Chat API](http://mcclain.sh/posts/twitch-chat-api/)
- [바이라인네트워크 — 당근마켓 채팅 시스템 현대화](https://byline.network/2022/05/0512-2/)
- [당근 테크 블로그 — DynamoDB 데이터 파이프라인](https://medium.com/daangn/dynamodb-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%B3%80%EA%B2%BD-%EC%9D%B4%EB%B2%A4%ED%8A%B8-%ED%8C%8C%EC%9D%B4%ED%94%84%EB%9D%BC%EC%9D%B8-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0-feat-kinesis-1733db06066)
- [채널톡 — 실시간 채팅 서버 개선 여정 1편 (Redis Pub/Sub)](https://channel.io/ko/blog/real-time-chat-server-1-redis-pub-sub)
- [채널톡 — 실시간 채팅 서버 개선 여정 2편 (NATS 이주)](https://channel.io/ko/blog/real-time-chat-server-2-redis-pub-sub)

기술 비교/트렌드:

- [AWS — Redis vs Kafka](https://aws.amazon.com/compare/the-difference-between-kafka-and-redis/)
- [Devzery 2025 — Kafka vs RabbitMQ Complete Guide](https://www.devzery.com/post/kafka-vs-rabbitmq-complete-guide)
- [CloudAMQP — When to use RabbitMQ or Kafka](https://www.cloudamqp.com/blog/when-to-use-rabbitmq-or-apache-kafka.html)
- [Centrifugo — Comparing with others](https://centrifugal.dev/docs/getting-started/comparisons)
- [onidel.com — NATS JetStream vs RabbitMQ vs Kafka 2025 benchmarks](https://onidel.com/blog/nats-jetstream-rabbitmq-kafka-2025-benchmarks)
- [Stream — Ably Alternatives](https://getstream.io/blog/ably-alternatives/)
- [CometChat — PubNub vs Ably](https://www.cometchat.com/blog/pubnub-vs-ably)
- [Spring Framework Docs — External Broker](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/handle-broker-relay.html)
- [RabbitMQ — STOMP Plugin](https://www.rabbitmq.com/docs/stomp)
