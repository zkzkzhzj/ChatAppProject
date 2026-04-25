# 43. 256MB → 1GB, Breaking Point VU 50 → 200 — 그런데 병목은 RAM이 아니었다

> 작성 시점: 2026-04-23
> 맥락: Week 7 Task 1. 외부 블로그(Velog/Tistory) 발행을 전제로 한 기술 회고 초안.
> 원천 데이터: [docs/reports/load-test-2026-04-22.md](../reports/load-test-2026-04-22.md) (§2.1~§2.8)
> 관련 학습노트: [#15 WebSocket STOMP](./15-websocket-stomp-deep-dive.md) · [#21 마을 채팅 아키텍처](./21-village-public-chat-architecture.md) · [#40 관측 스택](./40-observability-stack-decisions.md) · [#41 k6 설계](./41-k6-load-testing-setup.md) · [#42 Grafana 읽기](./42-grafana-jvm-dashboard-reading.md)

---

## 1. 훅 — 숫자 세 줄, 그리고 반전 예고

```text
Heap Total        22%  →  87%      (1.65초 Major GC STW)
Threads Live      72   →  180+     (Tomcat 200 cap 턱밑)
Breaking Point    VU 50  →  VU 200 (4배 확장)
```

회사 밖에서 처음 직접 운영하는 실서버에 k6를 꽂았더니 **VU 50**에서 서버가 누워버렸다. Heap을 256MB에서 1GB로 늘리고, Tomcat 쓰레드를 200에서 400으로 올렸다. 그러자 VU 200까지 버텼다. 4배. 이 정도면 "인프라 증설이 답이네" 하고 끝낼 수 있었을 거다.

근데 이 글의 **진짜 교훈은 그게 아니다**. Sweep 3을 돌리고 Grafana를 보니 CPU 45%, Heap 44.8%, Threads 123/400. 리소스는 한참 여유가 있었다. 그런데 `stomp_connect_latency p99 = 12.98초`. 12초. 서버가 뻗은 것도 아닌데 연결 하나 맺는 데 12초가 걸렸다. **RAM을 아무리 키워도 해결 안 되는 병목**이 있었다. 이 글은 그 병목을 찾아간 이야기다.

읽고 나면 세 가지를 얻어간다. (1) Simple Broker 기반 STOMP가 언제 꺾이는지를 숫자로 안다. (2) GC Death Spiral이 실제로 어떻게 연쇄되는지 본다. (3) 리소스 모니터링만 보다가 "구조적 병목"을 놓치는 함정을 피한다.

---

## 2. 문제 정의 — "느려진" 게 아니라 "뻗었다"

테스트 시나리오는 단순했다. 마을에 접속한 유저 한 명이 하는 일을 그대로 흉내 냈다. WS로 `/ws/websocket`에 붙고, STOMP CONNECT 프레임에 JWT를 싣고, `/topic/chat/village`와 `/topic/village/positions`를 구독한 뒤, 500ms마다 position을 보내고 15~30초에 한 번 채팅을 친다. VU는 k6로 0 → 50 → 500 → 1000까지 램프업 예정이었다.

VU 53에 도달한 **T+32초** 시점, 첫 `handshake failed: status=502`가 떴다. 그 뒤로는 잘못된 방향으로만 굴러갔다. 6분간 36,046건의 에러. `status=0` 20,712건, `status=520` 15,310건. **handshake 성공 0건**. WebSocket upgrade 자체가 안 됐다. k6를 죽였는데 서버도 같이 죽어 있었다. `/actuator/health`가 504 Gateway Timeout을 60초 기다렸다가 돌려줬다. 수동으로 컨테이너를 재기동하기 전까지는 아무도 못 들어왔다.

결정타는 여기서 나왔다. Grafana에서 breaking 시점을 캡처하려고 했는데 **선이 끊어져 있었다**. 17:22부터 17:35까지, 거의 13분간 공백. 왜냐면 Prometheus가 15초마다 날리던 `/actuator/prometheus` scrape 요청도 504를 받고 있었기 때문이다. 서버가 너무 뻗어서 **모니터링 시스템조차 따라잡지 못했다**. 이건 단순히 "데이터 없음"이 아니라, 공백 그 자체가 서버 상태를 말해주는 증거였다.

![VU 50 도달 직후 Heap Total 22% → 87% 급등](loadtest/screenshots/c4-1-heap-87percent.png)
*캡션: C-4 2차 실행 17:22 KST. VU 53 도달 직후 Heap Total %가 22%에서 87%로 수직 상승.*

---

## 3. 첫 삽질 — 108,231건의 에러, 근데 부하 문제가 아니었다

사실 여기까지 오기 전에 한 번 크게 헛발질했다. 처음 C-4를 돌렸을 때 결과는 이랬다.

| 지표 | 값 |
|------|-----|
| `handshake failed: status=0` | **108,231건** |
| `close 1002 (protocol error)` | 42,847건 |
| `STOMP ERROR` | 42,834건 |
| `CONNECTED` 프레임 수신 | **0건** |

숫자만 보면 서버가 거대하게 망한 것 같았다. 그런데 Grafana를 열어보면 CPU 40%, Heap 24~53% sawtooth. **서버는 멀쩡**해 보였다. "부하를 받아서 뻗은" 그림이 아니었다. 그래서 진단을 시작했다.

```text
handshake 101 OK 1건은 있었다.        → WS 레이어는 정상
CONNECTED 프레임 0건.                  → STOMP 레이어에서 reject
close 1002 protocol error.             → 서버가 명시적으로 STOMP 프레임 거부
StompAuthChannelInterceptor 코드 추적. → parseTokenPort.parse() 가 Optional.empty()
application.yml 확인.                  → jwt.access-token-expiry-ms = 3600000 (1시간)
tokens.json 생성 시각 추적.            → 15:22 발급, 테스트는 17:00 시작. 1h 38m 경과.
```

**토큰이 전부 만료된 상태로 부하 테스트를 돌렸던 거다**. 1000개 JWT가 하나도 빠짐없이. 부하 테스트가 아니라 "만료 JWT rejection 테스트"를 한 셈. k6가 CONNECT를 보내면 서버가 ERROR 프레임을 돌려주고 close 1002. k6는 iteration을 끝내고 다음 VU로 또 같은 토큰을 시도. 무한 반복.

이 경험이 이 글에서 가장 말하고 싶은 포인트 중 하나다. **부하 테스트의 첫 실패는 대부분 테스트 셋업 문제다**. "서버가 뻗었다"라는 결론으로 가기 전에, 에러의 **레이어**를 먼저 봐야 한다. HTTP 레이어인지, WS 레이어인지, STOMP 레이어인지. close 코드(1002 vs 1006)와 상태 코드(502 vs 0)가 단서다. 이번 건은 close 1002라는 신호가 "서버가 의도적으로 거부했다"를 알려줬고, 그걸 따라가니 JWT 만료가 나왔다.

재발 방지로는 두 단계를 설계했다. 단기로는 `prepare-tokens.js` 출력에 `generatedAt: ISO8601`을 박고, k6 실행 래퍼에서 55분 초과 시 warn, 60분 초과 시 abort. 중기로는 운영 `.env`의 `JWT_ACCESS_TOKEN_EXPIRY_MS`를 **부하 테스트 수행 직전에만** 4시간으로 일시 적용하고 끝나면 원복. 이건 [#41 k6 설계](./41-k6-load-testing-setup.md) §7 "자주 만나는 함정"에 추가 예정.

---

## 4. 증거 5장 — Breaking Point 순간의 JVM

토큰을 재발급하고 C-4 2차를 돌렸다. 이번엔 **VU 53에서 T+32초에 502**가 떴다. 진짜 부하 문제였다. Grafana 5개 패널이 한꺼번에 튀었다.

| 지표 | Baseline (17:12~17:19) | Breaking point (17:20~17:22) | 배수 |
|------|----------------------|------------------------------|------|
| Heap Total %          | 22%  | **87%** 🔴             | 3.95x |
| Threads Live          | 72   | **180+** 🟠 (cap 200)  | 2.5x  |
| CPU Process           | ~0%  | **70%** 🟠             | ∞     |
| **Major GC pause**    | 0ms  | **1,650ms (1.65초)** 🔴 | ∞     |
| Minor GC pause        | ~5ms | **440ms** 🟠            | 88x   |

다섯 패널이 다 중요한데, 제일 무서운 건 **Major GC pause 0ms → 1,650ms**다. 1.65초는 그냥 수치가 아니다. 그 1.65초 동안 JVM은 Stop-The-World 상태에 들어간다. 무슨 뜻이냐면, Tomcat worker 쓰레드도 멈추고, STOMP broker dispatch도 멈추고, `/actuator/prometheus` scrape을 받을 HTTP 쓰레드도 멈춘다. **모든 애플리케이션 쓰레드가 1.65초간 동결된다**. 그동안 쌓이는 요청은 전부 대기 큐로 간다.

Heap Total 87%는 그 1.65초를 불러온 원인이다. VU 50이 진입하고 15초도 안 돼서 22%에서 87%로 튀었다. 256MiB heap에 G1 GC가 Mixed GC를 열심히 돌리다가 Full GC로 승격됐고, Full GC가 1.65초를 먹었다.

Threads Live 72 → 180+는 결과다. GC가 1.65초간 쓰레드를 멈춘 사이, Tomcat은 들어오는 WS upgrade 요청을 처리하려고 worker pool을 팽창시켰다. Spring Boot 기본 `server.tomcat.threads.max=200`의 턱밑. 180에서 200까지 남은 여유는 이미 health check, actuator, 기타 시스템 요청으로 다 먹혔다.

![Threads Live 72 → 180+ (200 cap 턱밑)](loadtest/screenshots/c4-2-threads-180.png)
*캡션: Threads Live가 baseline 72에서 breaking point 180+ 까지 2.5배 급증. Tomcat 기본 200 cap 직전.*

![Major GC pause 0 → 1,650ms STW](loadtest/screenshots/c4-4-major-gc-1650ms.png)
*캡션: Major GC pause가 평상시 0ms에서 1,650ms로 급등. 1.65초 Stop-The-World.*

CPU 70%는 사실 "여유"로 해석할 수도 있다. 2코어 중 1.4코어. 그런데 이게 왜 문제냐면, 이 70% 중 상당량이 **GC 쓰레드와 대기 큐 drain에 쓰이고 있었다**는 점. 정작 비즈니스 로직(STOMP 메시지 dispatch)은 기회를 못 잡았다.

그리고 앞서 말한 Prometheus scrape 공백. 17:22~17:35 구간, 5개 패널 전부 선이 없었다. "데이터 없음"은 "서버 멀쩡"이 아니라 **"서버가 /actuator/prometheus 엔드포인트조차 응답 못 할 정도로 마비"**였다. 이 공백 자체가 가장 강력한 증거다. 모니터링 시스템이 포기한 지점이 병목의 중심이었다.

---

## 5. 왜 정확히 VU 50에서 꺾이는가 — Simple Broker 수학

처음엔 "GC가 문제니까 heap만 키우면 되겠네" 싶었다. 근데 왜 **하필 VU 50**이었나? VU 48도 아니고, VU 60도 아니고. 이 숫자를 설명할 수 있어야 증설 후 예상치도 낼 수 있다.

답은 Simple Broker의 fan-out 수학이다. 우리는 `/topic/village/positions`를 모든 VU가 구독한다. VU 한 명이 position을 SEND하면, Simple Broker는 **구독자 전원**에게 MESSAGE 프레임을 뿌린다. VU가 N명이고 각자 초당 2회 SEND하면:

```text
초당 dispatch 수 = N (발신자) × N (수신자) × 2 (Hz)
                = N² × 2
```

숫자에 꽂아보면 감이 온다.

| VU | 초당 dispatch | 상태 |
|----|--------------|------|
| 10   | 200/s      | C-3.5 스모크에서 문제 없음. 실측 확인. |
| 50   | **5,000/s** | **여기서 꺾인다** |
| 100  | 20,000/s    | 이미 불가능 |
| 500  | 500,000/s   | 이론상 무의미 |
| 1000 | 2,000,000/s | 계산이 의미 없는 수준 |

VU 50에서 초당 5,000번의 MessageHeaders · Message 객체가 생성된다. 이게 대부분 단명 객체라 Young Gen에 쌓이는데, 256MiB heap에 Young Gen이 얼마나 할당되겠나. 수십 MiB. 5,000 obj/s × 수백 byte면 몇 초 안에 Young Gen이 찬다. Minor GC가 자주 돈다. 그런데 Minor GC에서 살아남은 객체가 Old Gen으로 승격되고, Old Gen도 금방 찬다. → Mixed GC → Full GC로 승격 → 1.65초 STW.

여기서 10단계 연쇄 반응이 시작된다. 이게 GC Death Spiral이라고 불리는 현상이다.

```text
① VU ~50 진입 (17:20 KST)
    ↓
② 초당 5,000 dispatch → MessageHeaders·Message 객체 대량 생성
    ↓
③ Heap 22% → 87% in ≤15초 (순간 포화)
    ↓
④ G1 Mixed GC 트리거 → Full GC 승격 → Major GC 1.65초 STW 🔴
    ↓
⑤ 1.65초 동안 모든 애플리케이션 쓰레드 정지:
   - Tomcat worker → HTTP 요청 수락 불가 → 큐에 쌓임
   - STOMP broker dispatch → 메시지 처리 정지
   - /actuator/prometheus scrape → 504 Timeout (공백 발생)
    ↓
⑥ GC 끝난 직후 Heap 여전히 높음 (해제된 건 Young Gen 일부)
   + 1.65초 동안 쌓인 대기 요청이 한꺼번에 들어옴
    ↓
⑦ Tomcat thread pool 팽창 72 → 180+
   → max-threads 200 접근 → 이후 요청 거부 시작
    ↓
⑧ CPU 70% 도달 — GC thread + 대기 큐 drain + broker dispatch 동시
    ↓
⑨ 또 Heap 꽉 참 → 또 Major GC → 반복 (Death Spiral)
    ↓
⑩ 서버 사실상 정지 — /actuator/health도 504
```

정확히 VU 50에서 꺾이는 이유는 세 가지가 **동시에** 임계치에 닿아서다.

1. **Simple Broker dispatch rate 임계** — 초당 5,000 dispatch는 단일 broker 쓰레드의 현실적 상한.
2. **Tomcat 200 threads 한계** — WS 세션 1개가 subscribe + send + receive 3개 path를 점유하면 VU 50 × 3 ≈ 150, 여기에 system thread들이 얹히면 200 근접.
3. **256 MiB heap의 GC 수거 능력** — 초당 5,000 dispatch 객체 churn을 Young GC로 못 수거 → Old Gen promotion → Full GC.

이 세 개가 **같은 VU 지점**에서 부딪친 건 우연이 아니다. 헤로쿠 공짜 티어 스펙 · Spring Boot 기본값 · Simple Broker 설계가 서로 맞물려서 "작은 앱 하나 돌리기 좋은" 지점에 자연스럽게 수렴하기 때문이다. 그게 VU 50 근처다. 우리 인프라가 특별히 나쁘거나 좋은 게 아니라, "기본값으로 돌아가는 STOMP Simple Broker 앱"의 일반적 한계다.

원래 [#15 WebSocket STOMP 딥다이브](./15-websocket-stomp-deep-dive.md)와 [#21 마을 채팅 아키텍처](./21-village-public-chat-architecture.md)에 "스케일아웃 시 외부 broker(Redis Pub/Sub Relay)로 교체 예정"이라고 문서화해둔 가정이 있었다. 이번 테스트로 그 가정이 **실측으로 입증**됐다. 문서 상의 가정이 숫자로 바뀌는 순간이 부하 테스트의 진짜 가치다.

---

## 6. 수습 — 3가지 선택지, 왜 A를 골랐나

breaking point를 확정하고 나면, 즉시 선택의 순간이 온다. 세 가지 길이 있었다.

| 옵션 | 방식 | 예상 효과 | 공수 | 리스크 |
|------|------|---------|-----|-------|
| **A. 단기 패치** | JVM `-Xmx 1024m` + Tomcat `threads.max=400` | VU 100~150 상향 예상. Simple Broker 한계는 여전 | **30분** | 낮음. 근본 해결 아님 |
| **B. 근본 해결** | Simple Broker → Redis Pub/Sub Relay (`enableStompBrokerRelay`) | VU 500~1000+ 확장. 멀티 인스턴스 지원 | 1~2일 | 중. 채팅 아키텍처 재설계 |
| **C. 코드 최적화** | position throttling 서버에서 10Hz → 2Hz 강제 · broker outbound pool 증설 | VU 100 선까지 개선. 실시간 반응성 일부 저하 | 4시간 | 낮음. UX 트레이드오프 |

솔직히 B가 "엔지니어링적으로 올바른 답"이다. Simple Broker는 태생적으로 단일 인스턴스용이고, 이걸 쓰는 한 수평 확장이 막혀 있다. [#21 채팅 아키텍처](./21-village-public-chat-architecture.md)에도 그렇게 써뒀다.

근데 내 프로젝트는 지금 **MVP 검증 단계**다. ghworld.co를 친구들에게 돌리고 피드백을 모으는 중. 동시접속 VU 500이 필요한 상황이 아니다. 오히려 "당장 뻗지 않는 서버"가 시급했고, 다음 데모까지 시간이 4시간밖에 없었다. 이 맥락에서 B는 오버엔지니어링이었다.

그래서 순서를 이렇게 잡았다. **A(즉시) → 재측정 → 필요 시 C → 실유저 부하 커지면 B**. A는 30분이면 끝난다. `deploy/.env`에 `JAVA_TOOL_OPTIONS=-Xmx1024m -Xms512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:InitiatingHeapOccupancyPercent=70`을 박고, `SERVER_TOMCAT_THREADS_MAX=400`을 추가하고, 컨테이너 재기동. 이게 PR #23이다.

이 선택의 트레이드오프는 분명하다. **A는 아키텍처 문제를 푼 게 아니다**. 용량만 키웠다. 그래서 이 글에서 반전이 나온다.

---

## 7. Sweep 3 — 리소스는 여유인데 p99가 13초였다

PR #23 머지 후 동일 시나리오를 다시 돌렸다. 이번엔 `--stage 30s:100 --stage 1m:100 --stage 30s:150 --stage 1m:150 --stage 30s:200 --stage 1m:200 --stage 30s:0`. 6분 동안 VU 100 → 150 → 200 plateau sweep.

Before (Sweep 2, 256MB) vs After (Sweep 3, 1GB) 는 이랬다.

| 지표 | Sweep 2 (256MB) | **Sweep 3 (1GB)** |
|------|-----------------|---------------------|
| checks_succeeded | 0% (0/N) | **99.93%** (1429/1430) |
| stomp_errors | 42,834 | **1** |
| Major GC pause | 1,650ms | **0ms** (없음) |
| Minor GC pause p99 | 960ms | 600ms |
| Breaking Point | VU 50 | **VU 200 (4배)** |
| Heap Total | 87% | **44.8%** |
| Threads Live | 180+ (200 cap) | 123 / **400** (여유 277) |
| CPU Process | 70% | 45% |

숫자만 보면 완승이다. Hard crash가 완전히 사라졌다. checks 99.93%, stomp_errors 단 1건. Major GC STW 0ms. 축하할 만하다.

![Sweep 3 Grafana 대시보드 — 8패널 한 화면](loadtest/screenshots/sweep3-01-load-test-live.png)
*캡션: Sweep 3 실행 중 Grafana 전체 대시보드. Heap · CPU · Threads 모두 안정 영역.*

그런데 한 패널이 계속 눈에 걸렸다.

![sweep3-05-stomp-latency — p99 0 → 13초 급등](loadtest/screenshots/sweep3-05-stomp-latency.png)
*캡션: `k6_stomp_connect_latency_p99`가 0에서 13초로 급등. Hard crash는 없지만 연결 자체가 느려지는 구조적 병목.*

VU 200 plateau 구간에서 `stomp_connect_latency p99 = 12.98초`, `max = 13.92초`. **12초**. 이게 말이 되는 숫자인가?

여기서 값들을 다시 봤다. VU 200 시점에:

- CPU Process: **45%** (2코어 중 1.1코어만 씀. 여유 55%)
- Heap Total: **44.8%** (1GB 중 450MB. 여유 550MB)
- Threads Live: **123 / 400** (pool 여유 277)
- `ws_connecting p95` (WebSocket upgrade 자체): **538ms** (빠름)
- HTTP p95 `/ws/**`: **<50ms** (빠름)

**리소스는 전부 여유였다**. WS upgrade도 0.5초면 끝났다. 그런데 STOMP CONNECT 프레임을 보내고 CONNECTED 프레임을 받기까지가 **12초**.

이게 뭘 뜻하냐면, 문제는 "프로세스가 바쁘다"가 아니라 **"프로세스 안의 한 쓰레드가 큐를 먹고 있다"**라는 거다. 구체적으로, Simple Broker의 단일 dispatch 쓰레드가 초당 80,000 dispatch의 position fan-out 큐를 처리하는 동안, 신규 CONNECT 프레임도 같은 inbound 채널의 같은 큐 뒤에 줄을 서 있었다.

VU 200에서의 fan-out 수학:

```text
dispatch/s = 200 × 200 × 2 = 80,000/s
```

실측도 맞았다. `position_sent 61,459 → received 3,754,461` (**61배 fan-out**). chat은 더 가관이다. `chat_sent 642 → received 203,977` (**317배 fan-out**). 서버는 초당 수만 건의 메시지를 뿌리느라 바빴고, CONNECT 프레임은 그 뒤에서 12초 기다렸다.

**이게 이 글의 메인 반전이다**. 인프라를 키우면 Hard crash는 막을 수 있다. 그런데 Simple Broker라는 설계 자체가 가진 **단일 dispatch 쓰레드 제약**은 heap 1GB, 2GB, 10GB로 키운다고 풀리지 않는다. 리소스 여유는 병목이 구조로 이동했을 뿐 사라진 게 아니다.

숫자로 다시 정리하면 두 가지 Breaking Point가 있다.

- **Hard Breaking Point (256MB heap · Tomcat 200)**: VU ~50 — 서버가 뻗는다. GC Death Spiral.
- **Soft Breaking Point (1GB heap · Tomcat 400)**: VU ~200 — 서버는 살아있지만 CONNECT latency가 12초. 유저 체감상 "접속 안 됨"과 구분되지 않는다.

이제 다음 단계가 명확해졌다. **Simple Broker → Redis Pub/Sub Relay 전환**. Spring의 `enableStompBrokerRelay` 설정을 켜고 외부 broker를 둔다. RabbitMQ STOMP도 선택지지만, 이미 Redis를 쓰고 있으니 Redis Pub/Sub Relay가 인프라 추가 없이 합리적이다. 이게 원래 Phase 3 설계 당시 [#15](./15-websocket-stomp-deep-dive.md)와 [#21](./21-village-public-chat-architecture.md)에 "스케일아웃 시 외부 broker 교체 예정"이라고 문서화한 가정이었다. 이번 Sweep 3가 그 가정을 **숫자로 입증**했다.

---

## 맺음말 — 부하 테스트는 설계 가정 검증이다

이번 한 번의 부하 테스트가 드러낸 진실은 세 겹이었다.

1. **테스트 환경의 함정**: 108,231건의 에러가 실은 JWT 1시간 만료 때문이었다. "부하 문제처럼 보이는 것"은 대부분 셋업 문제다.
2. **인프라 용량의 한계**: 256MB heap은 VU 50의 dispatch 객체 churn을 못 버텼다. 1.65초 Major GC STW가 GC Death Spiral을 만들었다.
3. **아키텍처 구조의 한계**: heap을 1GB로 키워도 Simple Broker의 단일 dispatch 쓰레드는 여전히 단일이다. 리소스는 여유인데 p99는 13초였다.

만약 당신이 비슷한 작은 서비스를 운영하고 있고, STOMP + Simple Broker + 기본 Tomcat 설정을 쓰고 있다면, 이 글을 읽고 지금 당장 해볼 수 있는 체크 세 가지가 있다.

- **당신 서비스의 fan-out 공식을 종이에 적어봐라**. "VU N명일 때 초당 몇 번의 메시지가 broker를 통과하는가?" 이 숫자가 VU²에 비례하면 Simple Broker는 수십 명이 한계다.
- **JVM Heap Total % 와 Major GC pause 두 개만이라도 Grafana에 꽂아라**. Heap 80% 지속 + Major GC 500ms+ 가 같이 떠 있으면 Death Spiral 전조다.
- **부하 테스트할 때 모니터링이 같이 뻗는지 확인하라**. Prometheus scrape이 공백이면 그 공백 자체가 병목 증거다. 나중에 원인을 찾을 때 이게 결정타다.

부하 테스트는 "서버가 몇 명까지 버티나" 를 숫자로 찍는 행위가 아니다. **설계 단계에서 했던 가정들 — "스케일아웃 시에는 외부 broker로 바꿀 것이다" 같은 문장들 — 이 진짜로 필요해지는 지점이 어디인지 실측으로 확인하는 행위**다. 그 지점이 훨씬 일찍 올 수도 있고, 생각보다 훨씬 늦게 올 수도 있다. 숫자를 보기 전까지는 모른다.

---

## 외부 블로그 발행 시 수정 체크리스트 (내부 노트용)

이 파일은 내부 학습노트 컨벤션을 따르되 Velog/Tistory 발행 초안으로 작성됨. 발행 전 아래를 정리한다.

- [ ] `docs/learning/NN-xxx.md` 내부 상대 링크 전부 **제거 또는 GitHub absolute URL로 치환** (`https://github.com/zkzkzhzj/ChatAppProject/blob/main/docs/learning/15-websocket-stomp-deep-dive.md` 형태)
- [ ] `docs/reports/load-test-2026-04-22.md` 링크 처리 방침 결정 (공개 레포면 absolute URL, 비공개면 각주로 "내부 리포트 §2.7 참조" 식으로 대체)
- [ ] 스크린샷을 Velog/Tistory 이미지 업로드 후 경로 치환 (`loadtest/screenshots/*.png` → 호스팅 URL). **`loadtest/screenshots/`는 현재 gitignored** 라 외부에서 접근 불가.
- [ ] 본문 중 "이번 테스트", "우리 인프라" 같은 자기 참조는 유지 (회고 톤이라 OK). 다만 "ghworld.co" 같은 실제 도메인은 **익명화 여부 결정** (유입 원한다면 그대로, 공격 대상 되기 싫으면 "내 사이드 프로젝트" 로).
- [ ] 제목은 확정대로: `256MB → 1GB, Breaking Point VU 50 → 200 — 그런데 병목은 RAM이 아니었다`
- [ ] 태그: `#부하테스트` `#k6` `#WebSocket` `#STOMP` `#SpringBoot` `#GC` `#JVM튜닝` `#Grafana` `#관측성` `#백엔드`
- [ ] 썸네일: `sweep3-05-stomp-latency.png` (p99 13초 급등 그래프)가 가장 임팩트 있음
- [ ] 마지막 "맺음말" 위에 CTA 한 줄 추가 검토 ("비슷한 경험 있으신 분 댓글로 공유 부탁드립니다" 류)
- [ ] 정적 분석·ESLint 같이 이 글과 무관한 학습노트 링크는 발행본에서 제거

---

## 원본 데이터 참조 (내부용)

| 섹션 | 원본 위치 |
|------|----------|
| §2 문제 정의 | `docs/reports/load-test-2026-04-22.md` §2.6 |
| §3 JWT 만료 삽질 | 동일 리포트 §2.3~§2.5 |
| §4 증거 5장 | 동일 리포트 §2.7.1 (5패널 요약표) |
| §5 Simple Broker 수학 + Death Spiral | 동일 리포트 §2.7.2~§2.7.3 |
| §6 3-way 트레이드오프 | 동일 리포트 §2.7.5 |
| §7 Sweep 3 반전 | 동일 리포트 §2.8 |
| 숫자 전량 | 동일 리포트에서만 인용. 가공·추정 없음. |
