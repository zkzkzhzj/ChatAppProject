# 59. WebSocket 서버 분리 vs 모놀리스 + Redis Pub/Sub — 배포 토폴로지 결정

> 작성: 2026-04-27 (Step 2 완료 직후 / Step 3 착수 직전)
> 트랙: `ws-redis`
> **결정 변경 기록**: 처음 ②(모놀리스) → 자기정정 후 ③(WS 서버 분리) 채택. 그 정정 과정 자체가 이 노트의 핵심 학습 가치.
>
> 관련: [learning/44 — Spring STOMP 외부 broker 선택](./44-spring-stomp-external-broker-choice.md) · [learning/45 — Raw WS + Redis Pub/Sub 재설계](./45-websocket-redis-pubsub-redesign.md) · [learning/46 — 마을·서버 확장 모델](./46-village-scaling-decisions.md) · [learning/53 — outbound port 호출자 룰](./53-hexagonal-outbound-port-caller-rule.md) · [docs/knowledge/realtime/chat.md](../knowledge/realtime/chat.md) · [부하 리포트 §2.8](../reports/load-test-2026-04-22.md)

---

## 0. 한 줄 결론 (최종)

**③ WebSocket 서버를 별도 배포 단위로 분리.** REST API 서버와 WebSocket 서버를 별개 컨테이너/모듈로 떼고, 도메인 호출은 Kafka/gRPC, 같은 방 fan-out은 Redis Pub/Sub.

처음에는 "②(모놀리스 + Redis)로 충분하다, 분리는 트리거 신호 후 검토"로 답했다. 사용자 재질문("이건 당연하게 분리하는 거던데")을 받고 다시 보니 **신규 채팅 서비스 설계의 일반 default는 ③**이고, 채널톡·LINE도 "트래픽 자라서 분리"가 아니라 **처음부터 분리**였다. 내가 "큰 회사 케이스"로 폄하한 게 부정확한 프레이밍이었다.

이 노트는 그 자기정정 과정 자체를 기록한다.

---

## 1. 배경 — ②를 골랐다가 ③으로 정정한 사고 흐름

### 1.1 처음 사용자 질문 (문제 제기)

> "채널톡 블로그를 보면 socket.io 서버 N대 + Redis로 브릿지하는 그림이 나와요. LINE LIVE도 Akka 채팅 서버를 따로 두고 Redis가 서버 간 동기화 역할만 한다고 하고요. 우리는 그런 '소켓 서버'라는 게 없잖아요. Spring Boot 한 덩어리 안에 REST 컨트롤러도 있고 WebSocket 핸들러도 같이 있는데, Redis Pub/Sub을 끼우는 게 의미가 있나요?"

여기서 정확히 짚은 것:

- Redis Pub/Sub은 "단일 프로세스 안의 fan-out 가속기"가 아니다 — 단일 JVM이면 `ConcurrentHashMap<roomId, Set<Session>>`으로 충분
- Redis Pub/Sub의 가치는 "여러 JVM 간 동기화 채널"
- "수평 확장한 모놀리스 N대"와 "WS 전용 서버 + REST 서버"는 **다른 결정**

### 1.2 처음 답변 (보수적 ②)

내가 처음 정당화한 핵심:

- 트리거 신호 4종 보고 분리 (풀 충돌·재연결 폭풍·따로 스케일 비용 이득·부하 재측정)
- 실유저 < 10명에서 ③ 비용은 즉시, 이득은 트래픽 자라야
- 헥사고날 덕분에 나중에 분리해도 비교적 싸다

### 1.3 사용자 재질문 (자기정정 트리거)

> "그러면 우리 프로젝트에서 지금 너는 분리할 필요가 없다고 판단하는 거야? 내가 좀 찾아보니까 이건 당연하게 분리하는 거던데."

이걸 받고 다시 보니 내 답변에 빠진 시각이 보였다:

1. **"트리거 신호 후 분리"는 이미 모놀리스인 걸 언제 쪼갤지의 답.** 신규 설계할 때는 default가 다르다.
2. **사례로 든 채널톡/LINE도 "처음부터 분리"였다.** Rails에서 떼낸 게 아니라 신규 설계 시점부터 socket.io 별도 서버. LINE LIVE도 신규 서비스 시작부터 Akka 별도. 내가 "트래픽 자라서 분리"로 잘못 인용.
3. **모놀리스 즉시 비용을 과소평가했다** — sticky session 강제, 모든 배포가 재연결 폭풍, heap·thread 풀 분리 불가. 트래픽 1명일 때도 즉시 발생.
4. **이 프로젝트의 정체성과 안 맞다.** 학습 + 실서비스 동시 추구인데, ②는 학습 가치 낮고 운영 best practice도 거스름.

ws-redis 트랙은 STOMP+SimpleBroker 걷어내고 다시 짜는 **재설계**다. 즉 신규 설계 맥락에 가깝다. "이미 만든 모놀리스를 언제 쪼갤지" 프레임이 적용되는 상황이 아니었다.

### 1.4 정정 후 결정

**③ 채택.** 이유는 §3에서.

---

## 2. 옵션 비교 — 4단계로 본 토폴로지

|  | ① 모놀리스 단일 인스턴스 (인메모리) | ② 모놀리스 + Redis Pub/Sub (수평 확장) | ③ WS 전용 서버 + Redis 브릿지 | ④ WS 전용 서버 + RabbitMQ STOMP plugin |
|--|------------------------------------|-------------------------------------|-----------------------------|----------------------------------|
| 그림 | `[Spring Boot 1대]` 안에 REST + WS + 인메모리 broker | `[Spring Boot N대]` 각자 REST + WS + 로컬 레지스트리, 인스턴스 간 Redis | `[REST 서버 M대]` + `[WS 서버 N대]` + `[Redis]` (Kafka/gRPC 도메인 호출) | `[REST 서버 M대]` + `[WS thin 게이트웨이 N대]` + `[RabbitMQ + STOMP plugin]` |
| 메시지 라우팅 | JVM 내 `SubscriptionRegistry` | 로컬 fan-out (ConcurrentHashMap) + Redis publish/subscribe | 동일하지만 WS 서버 안에서만 | RabbitMQ가 native STOMP로 라우팅 (Spring Relay) |
| 도메인 코드 위치 | WS 핸들러 옆 | WS 핸들러 옆 | **분리** — WS 서버는 protocol gateway, 도메인은 REST 서버 | **분리** — WS 서버는 thin (RabbitMQ가 broker) |
| 호출 경로 (메시지 1건) | 1 hop (in-process) | 2 hop (publish to Redis → 다른 JVM subscribe) | **3+ hop** (WS → Kafka/gRPC → 도메인 → Redis → WS) | 3 hop (WS → RabbitMQ → WS) + Spring Relay가 native라 빠름 |
| 수평 확장 | 원천 불가 | 가능. 인스턴스 추가만 | 가능. WS와 REST를 따로 스케일 | 가능. WS 게이트웨이는 stateless에 가까움 |
| 배포 격리 | 한 번 배포 = 전체 재시작 | 같은 jar라 한꺼번에 (롤링은 가능) | **REST만 / WS만 배포 가능** | 동일 |
| 재시작 시 재연결 폭풍 | 전체 클라이언트 재연결 | 인스턴스 교체 1대당 1/N만 | **WS 서버만 재시작. REST 배포는 무영향** | 동일 |
| 장애 격리 | REST 5xx가 WS까지 영향 (heap·thread 공유) | 동일 (인스턴스 단위 격리만) | **REST OOM이 WS 세션 안 끊음** | 동일 |
| 운영 부담 | 최소 | 1 (Redis) | 3 (서비스 2개 + Redis + RPC 계약) | 3 (서비스 2개 + RabbitMQ + STOMP relay) |
| 헥사고날 정합성 | 그대로 | 그대로 | 어댑터 격리만 잘 돼 있으면 그대로 (도메인 코드 무변경) | 동일하나 RabbitMQ 학습 필요 |
| 신규 설계 default? | ❌ | ❌ | **✅** | △ (Spring 진영 보수적 default) |
| 실제 사례 | 거의 없음 (PoC 단계만) | 일부 작은 SaaS | **채널톡, LINE LIVE, Slack, Discord, 카카오톡** | RabbitMQ + Spring 보수파 |

### 2.1 ①의 한계는 이미 우리가 맞았다

§1의 부하 테스트 결과가 그것. 단일 dispatch thread + 인메모리 SubscriptionRegistry는 하드웨어 자원이 남아돌아도 fan-out 큐 깊이 때문에 막힌다. 그리고 마을 수가 늘면 한 서버로 절대 수용 불가능한 지점이 온다 (learning/46). ①은 옵션이 아니라 출발점.

### 2.2 ②와 ③의 차이 — "수평 확장 ≠ 분리"

흔히 혼동하는 지점이다. **모놀리스를 수평 확장하는 것**과 **WS 서버를 따로 분리하는 것**은 다른 결정이다.

```text
② 모놀리스 + Redis (수평 확장)
   [Spring Boot #1] ─┐         ┌─ [Spring Boot #2]
     REST + WS       │         │     REST + WS
                     ▼         ▼
                  [Redis Pub/Sub]
   - 같은 jar가 N개. 한 인스턴스가 REST·WS 둘 다 처리
   - WS 세션은 그 인스턴스에 묶여 있음 (sticky)
   - 메시지가 다른 인스턴스 세션에 가려면 Redis 경유

③ WS 서버 분리 + Redis (분리 토폴로지)
   [REST 서버 #1, #2, ...]              [WS 서버 #1, #2, ...]
        ▲                                       ▲
        │ HTTP API                              │ WebSocket
   클라이언트가 두 엔드포인트에 각각 접속
   도메인 호출은 [REST 서버]에만, broadcast는 [WS 서버]
   둘 사이는 Kafka / gRPC / Redis
```

②는 "큰 박스가 N개". ③은 "용도 다른 박스 두 종류". ②와 ③ 둘 다 Redis Pub/Sub을 쓰지만 의미가 다르다 — ②는 "같은 jar 인스턴스 간 동기화", ③은 "다른 종류 서버 간 동기화".

### 2.3 ③이 신규 설계 default인 이유

세 가지 본질적 이유:

**(a) 트래픽 프로파일 비대칭이 트래픽 적을 때부터 즉시 비용을 만든다**

| | REST | WebSocket |
|--|------|-----------|
| 연결 수명 | 짧음 (수십 ms) | **길다 (분~시간 단위)** |
| 동시 연결 수 | 낮음 (autoscale 흡수) | 높음 (활성 유저 ≈ 연결 수) |
| 메모리 점유 | 요청 처리 중에만 | **세션 객체가 계속 살아 있음** |
| autoscale 친화도 | 매우 좋음 (stateless) | 나쁨 — 세션이 sticky |
| 배포 영향 | 재시작 = 다음 요청부터 새 서버 | **재시작 = 모든 클라이언트 재연결** |
| 트래픽 패턴 | 짧은 burst | steady |
| 장애 모드 | 5xx 응답 | 세션 끊김 → 클라이언트 reconnect 폭풍 |

이 비대칭은 트래픽 1명일 때도 즉시 작동한다 — sticky session 정책 강제, 배포할 때마다 재연결 폭풍, GC 튜닝 평균치 타협. "트래픽 자라야 보이는" 게 아니다.

**(b) 신규 설계 시점에는 분리 비용이 가장 싸다**

모놀리스로 시작한 다음 나중에 쪼개는 비용 vs 처음부터 분리하는 비용을 비교하면 후자가 훨씬 싸다. 모놀리스 → 분리 마이그레이션 회고가 IT 업계에 쌓여 있고, 대부분 "처음부터 분리해야 했다"로 끝난다. 이 학습이 신규 설계 default를 ③으로 만들었다.

**(c) 채팅 도메인은 stateful이라는 본질**

REST는 stateless라 cloud-native autoscaling에 자연스럽다. WebSocket은 connection state를 들고 있어서 stateful하다. 이 둘을 한 풀에 묶는 건 본질적으로 무리한 결합이다 — Discord가 BEAM(Erlang)을 고른 것도, Slack이 Channel Server를 별도로 둔 것도, 채널톡이 socket.io를 분리한 것도 다 같은 이유.

### 2.4 ④가 escape hatch인 이유

[learning/44](./44-spring-stomp-external-broker-choice.md)의 결론이 RabbitMQ + STOMP plugin. ④는 그 변형 — STOMP를 살리되 broker를 RabbitMQ로, WS 게이트웨이는 thin하게.

매력은 "broker를 직접 짤 필요 없음". 단점은 RabbitMQ 자체가 새 학습/운영 부담. [learning/45 §1](./45-websocket-redis-pubsub-redesign.md)에서 학습 가치 이유로 의도적으로 비켜난 길. ③ 운영 후 broker 자체가 한계면 그때 ④ 검토.

---

## 3. 이 프로젝트에서 고른 것 — ③

**③ WebSocket 서버 분리 + Redis 브릿지.**

### 3.1 왜 ③인가 (세 가지 이유)

**(1) 신규 설계의 일반 default가 ③**

ws-redis 트랙은 재설계 트랙이다. "이미 모놀리스 → 언제 쪼갤지" 결정이 아니라 "어떻게 만들지" 결정. 이 자리에서 ②로 가는 건 운영 best practice를 거스르는 단순화 선택이고, 단순화 비용(즉시 발생)과 단순화 이득(인프라 1풀 절약)을 비교해야 한다. 우리 단계에서 단순화 이득이 단순화 비용을 넘지 않는다.

**(2) 모놀리스 즉시 비용**

| 비용 | 발생 시점 |
|------|----------|
| sticky session 강제 (ALB cookie/IP hash) | 인스턴스 ≥ 2 즉시 |
| 모든 배포가 재연결 폭풍 | 매 배포 |
| heap·thread 풀 분리 불가 — GC 평균치 타협 | 운영 시작 즉시 |
| autoscale 정책 한쪽 손해 | 트래픽 비대칭 시 즉시 |

처음 답변에서 "이득은 트래픽 자라야"라고 적은 게 잘못이었다. 모놀리스 비용은 즉시 발생한다.

**(3) 학습 + 실서비스 양립**

이 프로젝트는 학습과 실서비스 런칭 동시 목표 (CLAUDE.md §2). ③이 두 목표 모두에 더 잘 맞는다:

- **학습**: 분리 토폴로지 + RPC 경계 + 배포 격리 직접 구축. ②는 단순 모놀리스의 변형이라 학습 깊이 얕음
- **실서비스**: 신규 채팅 서비스의 운영 best practice 부합. "제대로 만든 채팅 인프라"라는 자기 정합성

### 3.2 왜 ④가 아닌가

[learning/44](./44-spring-stomp-external-broker-choice.md)가 RabbitMQ 권했지만, [learning/45](./45-websocket-redis-pubsub-redesign.md)에서 raw WS + Redis 직접 설계가 **구조적 학습 가치**가 더 크다고 판단. 채널톡 (O(M×N)) 사례를 흡수해서 함정 회피 설계도 됐다. ④는 broker 자체가 한계일 때 escape hatch로 보존.

### 3.3 ③ 분리 깊이 — 어디까지 분리할 것인가

분리에도 단계가 있다:

| 단계 | 내용 | 우리 선택 |
|------|------|----------|
| (a) 패키지 분리 | `communication/adapter/in/websocket/`을 별도 Gradle 모듈로 (같은 jar 내) | Step 3 동시 |
| (b) 같은 EC2의 별도 컨테이너 | docker-compose 안에 `app`, `ws-server` 두 컨테이너. RPC는 host network | **Step 5 (목표)** |
| (c) 별도 EC2 | WS 서버를 별도 EC2 풀로. ALB target group 분리 | 트래픽이 분리 비용을 정당화할 때 (§7) |

**우리는 (b)까지 즉시 가고, (c)는 트리거 시.**

(b)와 (c)의 차이:

- (b)는 같은 머신 비용으로 **배포 격리 + 풀 분리 + 학습 가치**를 얻는다
- (c)는 추가 비용(EC2 풀 2개)으로 **진짜 따로 스케일**을 얻는다

실유저 < 10명에서 (c)는 과하지만 (b)는 합리적. (b)가 ②보다 추가로 얻는 것은 **컨테이너 분리만으로도 heap·thread 풀이 분리되고 배포 격리가 가능**하다는 점. (c)에 비하면 따로 스케일은 못 하지만, 그건 트래픽이 자라면 (c)로 자연스럽게 진화 가능.

### 3.4 헥사고날 덕분에 분리가 비교적 쌈

Step 2 산출물 (handover/track-ws-redis.md §4):

- `ChatWebSocketHandler`가 inbound 어댑터로 격리
- `RedisChatRelay`가 어댑터 내부 인터페이스(`RoomMessageBus`)로 분리 ([learning/53](./53-hexagonal-outbound-port-caller-rule.md))
- `SendMessageUseCase` 호출자가 어댑터 1개로 격리
- `WebSocketV2Config`가 `SimpleUrlHandlerMapping` 직접 사용 — routing 명시적

이 구조 덕분에 (a)→(b)로 갈 때:

1. `communication/adapter/in/websocket/` 패키지를 별도 Gradle 모듈 / 별도 jar로 분리
2. `SendMessageUseCase` 호출을 in-process → Kafka 이벤트 publish (publish-subscribe 패턴) 또는 gRPC 호출
3. 도메인 코드는 그대로

**분리 결정 자체는 비싸지만, 분리 작업의 코드 변경 범위는 작다.** 헥사고날의 진짜 효용 — 토폴로지 결정이 어댑터 변경으로 끝남.

### 3.5 결정 트레이드오프

| 얻은 것 | 잃은 것 |
|--------|--------|
| 신규 설계의 default 토폴로지 — 운영 best practice | 컨테이너 1개 → 2개. docker-compose·CD 복잡도 ↑ |
| 배포 격리 — REST 핫픽스가 WS 안 끊음 | 도메인 호출 in-process → Kafka/gRPC 1단 추가 (지연 + 실패 모드) |
| 풀 분리 — REST OOM이 WS heap 안 흔듦 | 두 서비스 버전 호환 관리 필요 (envelope 버전 명시) |
| 학습 가치 — 분리 토폴로지 + RPC 경계 직접 구축 | Step 5 운영 배포 작업량 ↑ (docker-compose, CD 갱신) |
| 채팅 인프라로서의 자기 정합성 | 단일 JVM 디버깅 편의 포기 — 분산 trace 필요 (zipkin/jaeger 검토) |

---

## 4. ②(모놀리스)를 정당화하는 조건 — 분리 미루기 신호

§3과 반대 방향. **어떤 상황에서는 분리 안 하는 게 맞다.** 다음 조건이 다 맞으면 ②도 합리적:

### 4.1 운영 단위가 1개여야만 하는 제약

- 인프라 비용이 가장 큰 제약 — EC2 1풀로 묶어야 할 단계
- 운영 인력이 1명 — 모니터링/배포 2배 부담을 못 짐
- 우리 케이스 ❌ (이미 docker-compose, CD 인프라 있음)

### 4.2 단일 JVM의 가시성·디버깅이 critical

- 메시지 흐름 추적이 분산 trace 없이는 어려운 단계
- 우리 케이스 ❌ (로그 일관성 정도면 충분)

### 4.3 학습 가치 < 단순화 가치인 단계

- 도메인 정합성·기능 완성이 우선이고 인프라 학습은 후순위
- 우리 케이스 ❌ (인프라 학습 자체가 트랙 목표)

### 4.4 이번 부하 테스트는 ②/③ 결정 신호가 아니었다

이번 부하 테스트(2026-04-22)에서 본 `p99 = 12.98s`는:

- ①(인메모리 broker) 한계 신호 ✓
- ②(Redis 도입) 정당화 ✓
- ③(분리) 신호와는 무관 ✗ — REST 트래픽 같이 안 돌렸음, heap/thread 다 여유

**분리 결정은 부하 테스트가 아니라 설계 단계의 best practice 판단**(처음 설계할 때) **또는 운영 incident·비용 분석**(이미 모놀리스인 경우)으로 한다. 우리는 신규 설계 맥락이라 best practice 판단으로 ③ 채택.

부하 테스트는 ③ 채택 후 검증 도구로 쓴다 (Step 6 — ③ 토폴로지에서 VU 200 p99 < 500ms 통과 검증).

---

## 5. 핵심 메시지 정리

### 5.1 신규 설계 vs 마이그레이션 — 다른 게임

```text
신규 설계 (ws-redis 트랙):
  ③이 default. ②는 단순화 선택 — 단순화 이득이 즉시 비용보다 클 때만.

이미 모놀리스 운영 중:
  ②가 default. ③은 비용 큰 마이그레이션 — 트리거 신호 보고 결정.
```

처음 답할 때 두 게임을 섞어버렸다 (마이그레이션 프레임을 신규 설계에 적용). 이게 핵심 실수.

### 5.2 Redis Pub/Sub의 "진짜 자리"

| 위치 | Redis가 하는 일 | 우리가 만든 부분 |
|------|----------------|----------------|
| 한 JVM 안의 메시지 fan-out | 안 함 | `RoomSubscriptionRegistry` (ConcurrentHashMap) |
| 여러 JVM 사이 메시지 동기화 | **함** (`PUBLISH chat:room:42`) | `RedisChatRelay`, `RoomChannelNaming` |
| 영속 저장 | 안 함 | Cassandra |
| 재연결 시 누락 메시지 복구 | 안 함 | `LoadChatHistoryUseCase` |
| 세션 lifecycle 관리 | 안 함 | `ChatWebSocketHandler` 어댑터 내부 |

Redis 도입했다고 모든 게 Redis 거치지 않는다. **Redis는 "인스턴스 간" 동기화 채널일 뿐**. 단일 JVM 안의 fan-out은 여전히 메모리에서. 이 분리가 LINE LIVE 그림이다.

③ 토폴로지에서도 Redis는 같은 자리 — WS 서버 N대 사이의 fan-out 동기화.

### 5.3 통념을 폄하할 때 한 번 의심

이 노트의 진짜 학습 — "큰 회사들이 다 분리하니까"라는 통념을 "케이스가 다르다"고 폄하했을 때, 한 번 더 의심해야 했다. 통념이 default가 된 데에는 이유가 있고, 그 이유가 우리 케이스에도 적용되는지 따져야지 일축하면 안 된다.

---

## 6. 실전 주의점

1. **sticky session 정책** — ② / ③ 모두 필요. ③ 분리해도 같은 사용자는 같은 WS 인스턴스로. ALB cookie-based 또는 IP hash. Step 5 배포 시 가장 먼저 설정.

2. **재연결 폭풍 대비** — 클라이언트 exponential backoff + jitter. Step 3 작업, 토폴로지 무관 필수. ③은 폭풍을 줄이지만 없애지 못함.

3. **Redis Pub/Sub의 O(M×N) 함정** — ② / ③ 모두 적용. [learning/45 §1.4](./45-websocket-redis-pubsub-redesign.md)의 함정 회피 룰("방당 1채널 + 각 서버는 자기 접속자 있는 방만 SUBSCRIBE") 양쪽 다 유지.

4. **헥사고날 어댑터 격리** — ③ 분리 비용을 가시적으로 줄이는 핵심. Step 2에서 잘 됐으니 Step 3 분리 시 작업량 적음.

5. **③ 추가: RPC 경계 설계** — WS 서버에서 도메인 호출을 Kafka로 갈지 gRPC로 갈지 명확히. 메시지 보내기 = ack 필요한가?
   - 동기 ack 필요 (`SendMessageUseCase`가 영속화 성공 응답을 클라이언트에 보내야 함) → gRPC
   - async event publish (NPC 트리거, 알림) → Kafka
   - 잘못 그으면 마이크로서비스 흔한 함정 (분산 트랜잭션, 일관성 지옥)

6. **③ 추가: 서비스 간 버전 호환** — WS 서버와 도메인 서버 배포 시점 불일치. 양방향 호환 (forward/backward) 필요. 메시지 envelope에 `version` 필드 명시. 깨는 변경 시 N+1 호환 1주기.

7. **③ 추가: 분산 trace** — 단일 JVM 디버깅 편의 포기. zipkin / jaeger / grafana tempo 중 하나 도입 검토. trace ID를 WebSocket envelope에서 도메인까지 전파.

---

## 7. 나중에 돌아보면

### 이 결정이 어떻게 검증되는가

- **Step 5 운영 배포 후 1개월 incident 리포트** — REST 핫픽스 시 WS 영향 0이면 ③ 가치 입증
- **Step 6 부하 재측정** — ③ (b)단계 토폴로지에서 VU 200 p99 < 500ms 통과
- **장기 운영 — 6개월 후 회고** — "분리 안 했더라면" 반사실 시나리오와 비교

### 스케일이 바뀌면

| 스케일 | 토폴로지 |
|-------|---------|
| 실유저 < 100 / 단일 마을 | **③(b) — 같은 EC2의 별도 컨테이너** (지금 목표) |
| 실유저 < 1,000 / 마을 < 10 | ③(b) 유지 + 모니터링 강화 + sticky session 정책 점검 |
| 실유저 1,000~10,000 / 마을 10~100 | **③(c) — 별도 EC2 풀 분리.** WS / REST autoscale 정책 분리 |
| 실유저 > 10,000 | broker 교체 검토 (RabbitMQ STOMP plugin 또는 자체 broker — Slack Channel Server 패턴) |
| 초대규모 | 전용 스택 (Erlang/Elixir + 자체 프로토콜 — Discord, WhatsApp) |

### 자기정정 자체의 가치

이 노트는 **결정을 한 번 뒤집는 과정**을 기록했다. "사용자 의문에 답하기 위해 한쪽으로 치우쳐 정당화하다가, 다시 받은 의문에서 한쪽 시각이었음을 인정하고 정정"하는 흐름.

학습 가치:

- **사용자 의문은 시그널이다.** "당연히 분리하는 거 아니냐"라는 통념을 "큰 회사 케이스"로 폄하했을 때 멈춰서 다시 보기.
- **신규 설계 vs 마이그레이션 게임 구분.** 같은 트레이드오프도 시작점에 따라 답이 다르다.
- **모놀리스 즉시 비용 vs 미래 비용** — 즉시 비용도 가시적이라는 점을 가벼이 적지 말 것.

다음에 비슷한 결정 마주칠 때:

- "처음 설계인가, 이미 만든 걸 바꾸는가?" 먼저 구분
- 통념을 폄하할 때 한 번 더 의심
- 트레이드오프의 "잃은 것" 칸을 가볍게 적지 말 것

---

## 8. 더 공부할 거리

> 한국 회사 사례 우선 → 해외 빅테크 → 일반론 → 검색 키워드 순. **`[필독]` 표시한 자료 4개**(채널톡 1편·2편 + 당근 바이라인 + Slack RTM + Figma multiplayer)가 이 결정의 4대 축이다.

### 8.1 직접 관련 (이 프로젝트)

- [learning/44 — Spring STOMP 외부 broker 선택](./44-spring-stomp-external-broker-choice.md) — ④가 escape hatch인 이유
- [learning/45 — Raw WS + Redis Pub/Sub 재설계](./45-websocket-redis-pubsub-redesign.md) — ②/③ 공통 fan-out 설계
- [learning/46 — 마을·서버 확장 모델](./46-village-scaling-decisions.md) — Hard Cap vs 채널 샤딩 vs 마을 다중화
- [learning/53 — outbound port 호출자 룰](./53-hexagonal-outbound-port-caller-rule.md) — 분리 결정의 코드 변경 비용을 줄이는 어댑터 격리 패턴
- [부하 테스트 리포트 §2.8](../reports/load-test-2026-04-22.md) — ①의 한계 실측
- [docs/handover/track-ws-redis.md](../handover/track-ws-redis.md) — Step 3~5에서 ③ 구현 진행

### 8.2 한국 빅테크 채팅·실시간 인프라

#### 채널톡 — 우리 케이스에 가장 가까운 결정 시리즈

- **[[필독·핵심] 채널톡 실시간 채팅 서버 개선 여정 1편 — Redis Pub/Sub](https://channel.io/ko/blog/real-time-chat-server-1-redis-pub-sub)**
  Socket.IO 채팅 서버를 Rails 본체에서 분리한 이유 + Redis Pub/Sub로 서버 간 fan-out 구조. socket.io-redis-adapter 채택 근거. **③ 채택의 1차 레퍼런스.**

- **[[필독] 채널톡 2편 — NATS.io로 Redis 대체하기](https://channel.io/ko/blog/real-time-chat-server-2-redis-pub-sub)**
  Redis Pub/Sub의 한계(scale-out, 메시지 손실 가능성)를 만나 NATS로 이전한 이유. ③ + Redis 운영하다 막히면 다음 단계가 무엇인지 미리 본다. **함정 회피용.**

- **[채널톡 3편 — 파티셔닝](https://channel.io/ko/blog/real-time-chat-server-3-partitioning)**
  채널(workspace) 단위 클러스터 파티셔닝. 마을 단위 파티셔닝이 미래에 필요해질 때의 청사진.

#### LINE — 분리 토폴로지의 정석

- **[LINE LIVE 채팅 기능의 기반이 되는 아키텍처](https://engineering.linecorp.com/ko/blog/the-architecture-behind-chatting-on-line-live)**
  WebSocket 서버 100대+, Akka 액터로 병렬 처리, Redis Cluster Pub/Sub로 서버 간 동기화. **분리된 WS 서버 + Redis bridge** 패턴의 한국어 정석.
- [LINE 메시징 서버가 새해 트래픽을 대비하는 과정](https://engineering.linecorp.com/ko/blog/how-line-messaging-servers-prepare-for-new-year-traffic/)
- [메시징 서버 개발 프로세스 개선 — LINE](https://engineering.linecorp.com/ko/blog/improving-the-messaging-server-development-process)

#### 카카오톡 — JVM 스택 동족 사례

- **[카카오톡 메시징 시스템 재건축 이야기 — if(kakao) 2022](https://speakerdeck.com/kakao/kakaotog-mesijing-siseutem-jaegeoncug-iyagi)**
  10년간 C++로 운영된 메시지 릴레이 서버를 JVM(Java/Kotlin)로 포팅. **세션 정보를 Redis 클러스터로 외부화**해서 K8s 기반 유연한 배포로 전환. **우리(Java 21 + Spring Boot)와 스택이 가장 가깝다.**
- [카카오톡 서버 개발의 추억](https://jeho.page/essay/2022/10/16/kakaotalk-server-development.html) — 트래픽 폭증 시 모놀리스가 무너지는 생생한 기록
- [서버 비용을 아끼던 사람들 (feat. 카카오 옛날 이야기)](https://jeho.page/essay/2024/03/07/people-saving-cost.html) — 인프라 비용·운영 관점
- [kakao tech YouTube 채널](https://www.youtube.com/channel/UCdQF7F6hwjSpulj_fwB9iDQ) — if(kakao) 발표 영상 보관소

#### 당근 — 모놀리스에서 분리로의 결정적 사례

- **[[필독] 당근마켓 채팅 시스템이 현대화 되어온 과정 — 바이라인네트워크](https://byline.network/2022/05/0512-2/)**
  채팅 시스템을 본체 모놀리스에서 **Go 기반 독립 마이크로서비스**로 분리. 이전 PostgreSQL의 60%를 차지하던 채팅 데이터를 별도 DB로 분리. **②→③ 전환 의사결정의 한국 대표 사례.**
- [당근마켓의 푸시알림을 지탱하고 있는 Node.js 서비스](https://medium.com/daangn/%EB%8B%B9%EA%B7%BC%EB%A7%88%EC%BC%93%EC%9D%98-%ED%91%B8%EC%8B%9C%EC%95%8C%EB%A6%BC%EC%9D%84-%EC%A7%80%ED%83%B1%ED%95%98%EA%B3%A0-%EC%9E%88%EB%8A%94-node-js-%EC%84%9C%EB%B9%84%EC%8A%A4-19023ad86fc) — 초당 1500건+ 알림을 별도 서비스로 분리
- [당근 테크 블로그](https://medium.com/daangn) — 도메인별 분리 결정 글 누적

#### 토스 — WebSocket 운영의 정교한 사례

- **[SLASH 24 — N개의 탭, 단 하나의 웹소켓](https://toss.im/slash-24/sessions/13)**
  PC에서 여러 탭을 열어도 SharedWorker로 WebSocket 연결 1개만 유지. **클라이언트 측 WS 자원 최적화.** 데스크탑 웹 우선인 우리에 직접 적용 가능.
- [SLASH 22 — 토스증권 실시간 시세 적용기](https://toss.im/slash-22/sessions/2-6) — 실시간 시세 ≈ 채팅 메시지 매핑
- [SLASH 23 — 실시간 시세 데이터 안전하고 빠르게 처리하기](https://toss.im/slash-23/session-detail/B1-7) — WS 백엔드 안정화·재연결·메시지 손실 방지
- [SLASH 21 — 토스 서비스를 구성하는 서버 기술](https://toss.im/slash-21/sessions/1-3) — Active-Active, K8s + Istio, 분리된 컴포넌트 묶기

#### 우아한형제들 — SSE를 택한 카운터 케이스

- **[Server-Sent Events로 실시간 알림 전달하기 — 우아한형제들 기술블로그](https://techblog.woowahan.com/23199/)**
  배민 사장님 주문 알림. **WebSocket이 아니라 SSE를 선택**한 이유: 단방향(서버→클라) 알림이 본질. **"실시간 = WebSocket"이 아니라는 것**을 일깨우는 케이스. 우리 알림 영역만은 SSE도 후보.
- [실시간 서비스 경험기(배달운영시스템)](https://techblog.woowahan.com/2547/)
- [우아한테크 YouTube](https://www.youtube.com/@woowatech) / [우아콘 2024 플레이리스트](https://www.youtube.com/playlist?list=PLgXGHBqgT2Tu7H-ita_W0IHospr64ON_a)

#### 하이퍼커넥트 — 미래 WebRTC 영역 참조

- [하이퍼커넥트 그룹콜 미디어 서버 인프라](https://hyperconnect.github.io/2024/09/25/introduction-to-groupcall-media-server.html) — 추후 음성·영상 통화 추가 시 정석. **미디어는 절대 모놀리스에 안 붙는다.**
- [Hyperconnect Tech Blog](https://hyperconnect.github.io/)

### 8.3 해외 빅테크 채팅 인프라

#### Slack — 분리 토폴로지의 정점

- **[[필독] Real-time Messaging — Engineering at Slack](https://slack.engineering/real-time-messaging/)**
  Slack 핵심 아키텍처: **Channel Server(채널 상태) + Gateway Server(WS 연결)** 가 별개 컴포넌트. consistent hashing으로 채널을 CS에 분배. 호스트당 1600만 채널, 메시지 전 세계 500ms. **③ 토폴로지의 빅테크 정점.**
- [Real-Time Messaging Architecture at Slack — InfoQ](https://www.infoq.com/news/2023/04/real-time-messaging-slack/) — 위 글의 다이어그램·트레이드오프 요약
- [Flannel: An Application-Level Edge Cache to Make Slack Scale](https://slack.engineering/flannel-an-application-level-edge-cache-to-make-slack-scale/) — WS 연결 앞 edge cache. mass reconnect 대비
- [Slack's Migration to a Cellular Architecture — InfoQ](https://www.infoq.com/presentations/slack-cellular-architecture/) — AZ 장애 대비 셀룰러 재아키텍처
- [How Slack Works — InfoQ](https://www.infoq.com/presentations/slack-infrastructure/) — Slack 인프라 전반 영상
- [Slack Architecture — System Design](https://systemdesign.one/slack-architecture/)

#### Discord — 분리를 다른 차원에서 푼 사례

- [How Discord Scaled Elixir to 5,000,000 Concurrent Users](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) — BEAM이 actor + 분산 메시지 패싱. **WS 게이트웨이와 채널(guild) 프로세스를 분리**. JVM과 다르지만 원칙은 동일
- [Real time communication at scale with Elixir at Discord](https://elixir-lang.org/blog/2020/10/08/real-time-communication-at-scale-with-elixir-at-discord/) — 엔지니어 5명이 20+ 서비스 운영. 분리 컴포넌트의 운영 효율성
- [Interfacing Elixir with Rust to Improve Performance](https://www.infoq.com/news/2019/07/rust-elixir-performance-at-scale/) — 분리 컴포넌트는 언어 단위 교체도 쉽다는 증거

#### WhatsApp — 단일 머신 100만 connection

- [The WhatsApp Architecture Facebook Bought For $19 Billion](https://highscalability.com/the-whatsapp-architecture-facebook-bought-for-19-billion/) — Erlang 기반 단일 머신 100만 TCP 세션. **WS 서버는 stateful이라 머신당 한계가 명확**
- [How WhatsApp Grew to Nearly 500M Users, 11K cores, 70M Messages/sec](https://highscalability.com/how-whatsapp-grew-to-nearly-500-million-users-11000-cores-an/) — 엔지니어 50명 5억 유저
- [Whatsapp, Facebook, Erlang and realtime messaging — process-one](https://www.process-one.net/blog/whatsapp-facebook-erlang-and-realtime-messaging-it-all-started-with-ejabberd/) — XMPP/ejabberd가 메신저 인프라의 시조

#### Figma — 협업·실시간 동기화 (우리 마을 공간 동기화에 가장 가까움)

- **[[필독·우리 케이스] How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)**
  WS로 클라이언트들과 연결된 **multiplayer 서버를 별도 프로세스로 운영**. 메모리에 문서 상태 유지, 30~60초 checkpoint. **우리 마을 공간 동기화(캐릭터 위치, 가구 배치)에 가장 가까운 패턴.**
- [Making multiplayer more reliable — Figma](https://www.figma.com/blog/making-multiplayer-more-reliable/) — WS 신뢰성·재접속·동기화 일관성
- [How Mozilla's Rust dramatically improved Figma's server-side performance](https://www.figma.com/blog/rust-in-production-at-figma/) — multiplayer 서버 TS → Rust. 분리 컴포넌트의 언어 교체 가능성
- [Inside Figma's multiplayer infrastructure — Runtime](https://www.runtime.news/inside-figmas-multiplayer-infrastructure/) — 외부 분석 다이어그램

### 8.4 토폴로지 결정 일반론

- [Martin Fowler — MicroservicePremium](https://martinfowler.com/bliki/MicroservicePremium.html) — 분리는 비싸다. ②를 고려했던 이론적 근거
- [Martin Fowler — Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) — 모놀리스로 시작해서 분리하라. **그러나 채팅은 예외**임을 보충 학습
- **[[중요·반대 입장] Martin Fowler — Don't start with a monolith](https://martinfowler.com/articles/dont-start-monolith.html)**
  **워크로드 특성이 다르면 처음부터 분리하라.** 채팅이 정확히 이 케이스. **③ default의 이론적 근거.**
- [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html) — 분리 비용·이득 표
- [Sam Newman — Building Microservices, 2nd Ed.](https://samnewman.io/books/building_microservices_2nd_edition/) — 특히 Chapter 3 "Splitting the Monolith"
- [Sam Newman — Monolith To Microservices](https://samnewman.io/books/monolith-to-microservices/) — 분리 패턴 카탈로그

### 8.5 WebSocket 스케일링 패턴

- [WebSockets at Scale — WebSocket.org](https://websocket.org/guides/websockets-at-scale/) — file descriptor, 메모리, sticky session, pub/sub backplane 종합
- [Scaling Pub/Sub with WebSockets and Redis — Ably](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis) — **③에서 직접 쓰는 패턴의 정석**
- [Challenges of scaling WebSockets — DEV (Ably)](https://dev.to/ably/challenges-of-scaling-websockets-3493) — sticky 한계, 재접속 폭풍, 백프레셔
- [WebSocket architecture best practices — Ably](https://ably.com/topic/websocket-architecture-best-practices) — 분리 토폴로지(connection layer / message routing layer) 표준 다이어그램
- [How to scale WebSocket — TSH](https://tsh.io/blog/how-to-scale-websocket) — 노드 수 늘리기 실전
- [WebSocket Scaling: Sticky Sessions vs. Distributed State](https://scalewithchintan.com/blog/websocket-scaling-sticky-sessions-vs-distributed-state) — sticky가 임시방편인 이유
- [Scaling WebSocket Connections: From Single Server to Distributed Architecture (2026)](https://dev.to/young_gao/scaling-websocket-connections-from-single-server-to-distributed-architecture-1men) — 최신 분산 아키텍처 가이드

### 8.6 한국어 실전 가이드 (Spring Boot 스택)

- [Spring Boot + WebSocket 채팅 서버 분산 처리(Scale out) — velog](https://velog.io/@hongjunland/Spring-Boot-Kafka-Spring-Boot-WebSocket-%EC%B1%84%ED%8C%85-%EC%84%9C%EB%B2%84-Scale-out-%EC%97%B0%EB%8F%99) — **우리 스택과 가장 가까운 한국어 자료**
- [채팅 서비스를 위한 인프라 — googy-blog](https://goo-gy.github.io/2023-01-05-chat-infra/) — 한국어 입문
- [Spring Websocket & STOMP — brunch](https://brunch.co.kr/@springboot/695) — STOMP + WS Spring 구현 정석

### 8.7 검색 키워드

**한국어**

- `채널톡 NATS Redis Pub/Sub 채팅 서버`
- `LINE LIVE Akka Redis Pub/Sub 채팅`
- `카카오톡 메시징 시스템 재건축 if(kakao)`
- `당근마켓 채팅 마이크로서비스 Go`
- `토스 SLASH WebSocket 실시간`
- `우아한형제들 SSE 실시간 알림`
- `하이퍼커넥트 WebRTC 미디어 서버`
- `Spring Boot WebSocket Scale out Kafka Redis`

**영어**

- `Slack Channel Server Gateway Server consistent hashing`
- `Discord Elixir BEAM WebSocket gateway`
- `WhatsApp Erlang ejabberd messaging`
- `Figma multiplayer WebSocket Rust`
- `WebSocket pub/sub backplane Redis Kafka NATS`
- `sticky session vs distributed state WebSocket`
- `monolith to microservices chat workload`

**영상 채널**

- kakao tech YouTube (if(kakao))
- 우아한테크 YouTube (우아콘)
- Toss SLASH (toss.im/slash-XX)
- NAVER D2 / DEVIEW (deview.kr)
- InfoQ Presentations (Slack/Discord/Figma 발표)

### 8.8 활용 팁

- **`[필독]` 4개 우선** — 채널톡 1편·2편 + 당근 바이라인 + Slack RTM + Figma multiplayer가 이 결정의 4축. ADR 또는 본문에 인용해두면 차후 재논의 시 빠르게 복원
- **카운터 케이스도 챙기기** — 우아한형제들 SSE 글은 "WebSocket이 정답이 아니다"를 일깨우는 균형추. ③이 default라는 결론이 도그마가 되지 않게 하는 안전장치
- **스택 매칭 우선순위** — 카카오톡 if(kakao) 2022 발표(JVM)가 우리와 스택이 가장 가깝고, 다음은 LINE LIVE(Akka, JVM 진영), 그 다음 채널톡(socket.io, JS) 순

---

## 9. 부록 — STOMP 시대 vs raw WS 시대 노트 매핑

> 처음 읽는 사람을 위한 통합 지도. ws 관련 노트 9개를 시대·상태·역할별로 정리.

| 노트 | 주제 | 시대 | 상태 | 비고 |
|------|------|------|------|------|
| [#15](./15-websocket-stomp-deep-dive.md) | WebSocket + STOMP 동작 원리 | STOMP | 🟡 시점 공지 | 프로토콜 레벨 설명은 무관 유효 |
| [#21](./21-village-public-chat-architecture.md) | 마을 공개 채팅 아키텍처 | STOMP | 🟡 시점 공지 | 도메인 결정("Everyone")은 불변, 스케일링 부분만 노화 |
| [#24](./24-stomp-websocket-jwt-channel-interceptor.md) | STOMP JWT 인증 (ChannelInterceptor) | STOMP | ⚠️ 폐기 예정 경로 | escape hatch ([#44](./44-spring-stomp-external-broker-choice.md)) 시에만 필요. raw WS는 `JwtHandshakeInterceptor`로 |
| [#25](./25-batch-broadcast-multiuser-message-attribution.md) | 배치 브로드캐스트 + 멀티유저 귀속 | STOMP | 🟡 시점 공지 | `senderId` 도메인 결정은 불변 |
| [#27](./27-realtime-chat-code-review-patterns.md) | 실시간 채팅 코드 리뷰 종합 | STOMP | ⚠️ 부분 갱신 | 이슈 3(검증) 경로만 raw WS 전환 시 변경. 나머지 5개 이슈는 그대로 |
| [#44](./44-spring-stomp-external-broker-choice.md) | STOMP vs RabbitMQ vs Redis broker | 양쪽 | 🟡 Superseded (escape hatch) | raw WS 경로 폐기 시 ④로 즉시 전환할 플레이북 |
| [#45](./45-websocket-redis-pubsub-redesign.md) | raw WS + Redis Pub/Sub 재설계 | raw WS | ✅ Active | 현재 진행 중인 설계서 |
| [#46](./46-village-scaling-decisions.md) | 마을·서버 확장 모델 | 양쪽 무관 | ✅ 현재 유효 | 도메인/인프라 직교 — 어느 토폴로지에도 적용 |
| [#59](./59-ws-server-separation-vs-monolith.md) | WS 분리 토폴로지 (이 노트) | raw WS | ✅ 최신 결정 | 2026-04-27 ② → ③ 자기정정 후 ③ 채택 |

**읽는 순서 추천**:

- **새 합류자**: [#46](./46-village-scaling-decisions.md) (도메인) → [#59](./59-ws-server-separation-vs-monolith.md) (토폴로지) → [#45](./45-websocket-redis-pubsub-redesign.md) (구현 설계)
- **STOMP 시대 맥락 궁금하면**: [#15](./15-websocket-stomp-deep-dive.md) → [#21](./21-village-public-chat-architecture.md) → [#44](./44-spring-stomp-external-broker-choice.md) → [#45](./45-websocket-redis-pubsub-redesign.md) (왜 STOMP를 떠났는가)
- **escape hatch 시나리오**: [#44](./44-spring-stomp-external-broker-choice.md) §6~9 + [#59 §3.2](#32-왜-④가-아닌가)

---

> 이 노트는 **Step 2 완료 / Step 3 착수 시점의 토폴로지 결정 기록 + 자기정정 과정**이다. ③ 채택 후 Step 3~5 진행. Step 5 배포 후 1개월 incident 리포트로 결정 검증.
