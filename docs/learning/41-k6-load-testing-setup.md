# 41. k6 사용법 · 설계 학습노트 — 부하 테스트 시나리오 준비

> 작성 시점: 2026-04-21
> 맥락: Week 7 Step C(부하 테스트) 실행 전에 "k6를 실제로 어떻게 쓰는지·우리 STOMP 서버에 어떻게 찔러볼지"를
> 한 번에 정리해 두는 참조 노트. 나중에 스크립트 짤 때 다시 펴볼 때 5분 만에 맥락이 붙도록 한다.
> 관련 학습노트: [40. 관측성 스택 도입기 — 도구 선택 결정](./40-observability-stack-decisions.md),
> [15. WebSocket + STOMP 동작 원리](./15-websocket-stomp-deep-dive.md),
> [21. 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md),
> [24. STOMP JWT 인증](./24-stomp-websocket-jwt-channel-interceptor.md)

---

## 1. 배경 — 왜 k6인가, 왜 지금인가

### Week 7 Step C의 목표

"**시스템의 breaking point를 찾는다**". 숫자 한 방을 뽑는 게 아니라, 어느 지점에서 **지연이 급격히 꺾이는지**, **어디서 실패가 시작되는지**를 확인해 병목 좌표를 얻는다.

측정 대상:

- 마을 공개 채팅 STOMP broadcast (NPC 제외)
- 부하 프로파일: 동시 접속자 5 → 1000 까지 램프업
- 지표: `http_req_duration` p(95)/p(99), `ws_session_duration`, `ws_msgs_sent`, 실패율, EC2 CPU/메모리

### 도구 선정 결과만 요약

상세 비교는 [40. 관측성 스택](./40-observability-stack-decisions.md#3-결정-2--부하-테스트-도구는-뭘로) 참조. 요약:

| 도구 | 기각 이유 |
|------|----------|
| Gatling | Scala/Kotlin DSL 러닝커브, 1회성 과제엔 부담 |
| JMeter | WebSocket/STOMP 플러그인의 세션 협상이 부실 |
| nGrinder | 컨트롤러/에이전트 분리 → 단일 EC2 과제에 오버킬 |
| **k6** | JS 기반·WebSocket 네이티브·단일 바이너리·CI 친화 |

**선택 근거 한 줄**: "JS로 짜고, CI에서 바로 돌고, Grafana에 결과 붓기 쉬운 경량 도구".

### 타겟

- **포함**: `/ws` → STOMP CONNECT → SUBSCRIBE `/topic/chat/village` → SEND `/app/chat/village`
- **제외**: NPC 파이프라인 (OpenAI API 호출·임베딩·pgvector). `NPC_ADAPTER=hardcoded`로 일시 전환해서 "우리 시스템 한계"만 측정

---

## 2. k6 핵심 개념 (5분 정리)

### 2.1 용어 3개만 먼저

| 용어 | 의미 | 비유 |
|------|------|------|
| **VU** (Virtual User) | 동시에 시나리오를 돌리는 가상 유저 스레드 | 브라우저 탭 1개 |
| **Iteration** | VU가 `default function`을 1회 실행한 단위 | 탭에서 1번 클릭 |
| **Stage** | 시간 구간별 VU 수 목표 | "5분 동안 0→100 램프" |

k6는 **"VU N명이 T시간 동안 몇 iteration 돌았는가"**를 측정한다. 여기에 각 요청의 응답시간·실패율이 붙는다.

### 2.2 Executor — 부하 프로파일 엔진

executor는 "**어떤 방식으로 부하를 만드는가**"를 결정한다. 자주 쓰는 4종만 외우면 된다.

| executor | 동작 | 언제 쓰나 |
|----------|------|----------|
| `constant-vus` | N명을 T시간 동안 그대로 유지 | 정상 상태 측정 |
| `ramping-vus` | 단계별로 VU 수 증가/감소 | **breaking point 탐색** (우리 케이스) |
| `constant-arrival-rate` | "초당 R개 요청"을 VU 수와 무관하게 유지 | 실제 서비스 QPS 재현 |
| `ramping-arrival-rate` | 초당 R개를 단계별 조정 | 트래픽 패턴 모사 |

**VU-based vs arrival-rate-based 차이**:

- VU 기반은 "유저 수"가 고정, 서버가 느려지면 자연스럽게 iteration이 줄어듦 (현실적 유저 모사)
- arrival-rate 기반은 "초당 요청 수"가 고정, 서버가 느려져도 밀어붙임 (stress test 적합)

부하 테스트 초심자는 VU 기반이 직관적이라 여기서 시작해도 된다.

### 2.3 Scenarios와 Thresholds

- **scenarios**: 여러 executor를 동시/순차로 조합. 예) "채팅 유저 900 + 관람자(SUBSCRIBE만) 100 동시" 같은 믹스 부하 표현
- **thresholds**: 합격 기준. `http_req_failed < 1%` 같은 SLO를 코드로 박는다. 미달 시 exit code 비영(非零) → CI 실패

```js
export const options = {
  scenarios: {
    chat: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },    // 워밍업
        { duration: '3m', target: 500 },   // 점진 증가
        { duration: '5m', target: 1000 },  // 고부하 유지
        { duration: '2m', target: 0 },     // 쿨다운
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'ws_connecting': ['p(95)<500'],
    'ws_session_duration': ['p(95)>10000'],
  },
};
```

### 2.4 내장 Metrics (자주 보는 것만)

| metric | 의미 | 주로 쓰는 통계 |
|--------|------|---------------|
| `http_req_duration` | HTTP 응답시간 | avg, p(95), p(99) |
| `http_req_failed` | HTTP 실패율 | rate |
| `ws_connecting` | WS 핸드셰이크 시간 | p(95) |
| `ws_session_duration` | WS 연결 유지 시간 | avg |
| `ws_msgs_sent` / `ws_msgs_received` | WS 송수신 수 | count |
| `vus` | 현재 활성 VU 수 | value |
| `iterations` | `default function` 실행 횟수 | count |

커스텀 metric도 만들 수 있다(`Counter`, `Rate`, `Trend`). "NPC 응답 도착 시간" 같은 도메인 지표는 커스텀으로 뽑는다.

---

## 3. 설치·실행 기본

### 3.1 OS별 설치

```bash
# Windows
winget install k6 --source winget
# 또는
choco install k6

# Mac
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

설치 확인:

```bash
k6 version
# k6 v0.49.0 (commit/..., go1.22.0, linux/amd64)
```

### 3.2 기본 실행 패턴

```bash
# 스모크 테스트 (VU 1, 30초)
k6 run --vus 1 --duration 30s script.js

# 옵션을 스크립트 안 export const options 에 박는 게 권장
k6 run script.js

# 결과를 JSON으로 남기기 (크기 주의)
k6 run --out json=result.json script.js

# 요약만 저장 (CI 친화)
k6 run --summary-export=summary.json script.js

# Prometheus Remote Write로 바로 쏘기
k6 run --out experimental-prometheus-rw script.js
```

### 3.3 리포트 옵션

- k6 종료 시 콘솔에 text summary 자동 출력 (기본)
- HTML 리포트는 `k6-reporter` 같은 3rd-party 스크립트로 `handleSummary`에서 생성
- Grafana Cloud k6는 클라우드 실행 시 자동 대시보드. 로컬 실행도 Prometheus Remote Write로 붓고 self-hosted Grafana에서 그릴 수 있다

---

## 4. WebSocket + STOMP 직접 조립 — 이 노트의 핵심

### 4.1 왜 "직접 조립"인가

**k6는 STOMP 네이티브 지원이 없다**. 선택지는 두 가지:

| 방법 | 장단 |
|------|------|
| `xk6-stomp` extension | 별도 바이너리 빌드 필요(`xk6 build --with ...`), CI에서 이미지 따로 관리 |
| **raw WebSocket 위에 STOMP 프레임 수동 조립** | 외부 의존 없음, k6 표준 바이너리 그대로 사용 |

우리는 후자를 선택한다. STOMP 프레임은 **텍스트 기반**이라 직접 만드는 게 어렵지 않다.

### 4.2 STOMP 프레임 포맷

STOMP는 프레임을 다음 구조로 정의한다:

```text
COMMAND\n
header1:value1\n
header2:value2\n
\n
body\0
```

포인트:

- 첫 줄: COMMAND (`CONNECT`, `SUBSCRIBE`, `SEND`, `DISCONNECT` 등)
- 헤더 줄들: `key:value\n`
- 헤더 끝에 **빈 줄 하나** (`\n\n`) — 헤더와 바디 구분
- 바디 뒤에 **null byte `\x00`** — 프레임 종료 마커 (프로토콜 필수)

**가장 많이 실수하는 부분이 `\x00` 누락**. 이게 빠지면 서버는 프레임을 계속 기다리며 핸드셰이크가 영원히 끝나지 않는다.

### 4.3 JS 헬퍼 함수 — 재사용할 stompFrame()

```js
// loadtest/lib/stomp.js
export function stompFrame(command, headers = {}, body = '') {
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  return `${command}\n${headerLines}\n\n${body}\x00`;
}

export function parseStompFrame(raw) {
  // \x00 제거
  const text = raw.replace(/\x00$/, '');
  const [headerPart, ...bodyParts] = text.split('\n\n');
  const [command, ...headerLines] = headerPart.split('\n');
  const headers = Object.fromEntries(
    headerLines.map((line) => {
      const idx = line.indexOf(':');
      return [line.slice(0, idx), line.slice(idx + 1)];
    }),
  );
  return { command, headers, body: bodyParts.join('\n\n') };
}
```

### 4.4 프레임 예시 — 우리 프로젝트 기준

**CONNECT 프레임** (인증 JWT 포함):

```text
CONNECT
accept-version:1.2
host:ghworld.co
Authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

\x00
```

`host`는 서버가 `allowedOriginPatterns("*")`라 값 자체는 덜 중요하지만 STOMP 스펙상 필수. JWT는 [24. STOMP JWT 인증](./24-stomp-websocket-jwt-channel-interceptor.md)의 `ChannelInterceptor`가 CONNECT 프레임에서 파싱한다.

**SUBSCRIBE 프레임**:

```text
SUBSCRIBE
id:sub-0
destination:/topic/chat/village

\x00
```

`id`는 이 클라이언트 내에서만 고유하면 된다. 나중에 UNSUBSCRIBE 할 때 쓴다.

**SEND 프레임** (메시지 전송):

```text
SEND
destination:/app/chat/village
content-type:application/json

{"body":"안녕하세요"}
\x00
```

서버의 `ChatMessageHandler` `@MessageMapping("/chat/village")`가 받아 처리하고, `SimpMessagingTemplate`이 `/topic/chat/village`로 broadcast한다.

---

## 5. 우리 프로젝트용 시나리오 스크립트 초안

실제 파일(`loadtest/chat-broadcast.js`)은 Step C 실행 때 작성한다. 여기엔 **구조 설계**만 남긴다.

### 5.1 디렉토리 레이아웃

```text
loadtest/
├── chat-broadcast.js      # 메인 시나리오
├── lib/
│   ├── stomp.js           # stompFrame, parseStompFrame
│   └── auth.js            # 토큰 발급·풀 관리
└── README.md              # 실행법
```

### 5.2 스크립트 뼈대

```js
import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { stompFrame } from './lib/stomp.js';

const BASE_URL = __ENV.BASE_URL || 'https://ghworld.co';
const WS_URL = __ENV.WS_URL || 'wss://ghworld.co/ws/websocket';

// 토큰 풀: setup()에서 미리 발급해둔 것을 VU마다 분산
const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

export const options = {
  scenarios: {
    chat: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'ws_connecting': ['p(95)<500'],
  },
};

// setup() 은 테스트 시작 전 1회만 실행
export function setup() {
  // 토큰 풀 발급은 별도 Node 스크립트로 미리 돌리고 tokens.json 로 저장 추천
  // (여기에서 1000개 회원가입 API를 때리면 부하 테스트 시작 전에 DB 꼬임)
  return {};
}

export default function () {
  const token = tokens[__VU % tokens.length];
  const url = `${WS_URL}?access_token=${token}`;
  // SockJS 없이 raw WebSocket으로 직접 연결한다
  // (프로덕션 클라이언트는 SockJS를 쓰지만, 부하 테스트는 경량 raw WS가 현실적)

  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      socket.send(
        stompFrame('CONNECT', {
          'accept-version': '1.2',
          host: 'ghworld.co',
          Authorization: `Bearer ${token}`,
        }),
      );
    });

    socket.on('message', (raw) => {
      // CONNECTED 수신 → SUBSCRIBE → SEND 루프 시작
      if (raw.startsWith('CONNECTED')) {
        socket.send(
          stompFrame('SUBSCRIBE', {
            id: `sub-${__VU}`,
            destination: '/topic/chat/village',
          }),
        );

        // 메시지 전송 루프
        socket.setInterval(() => {
          socket.send(
            stompFrame(
              'SEND',
              {
                destination: '/app/chat/village',
                'content-type': 'application/json',
              },
              JSON.stringify({ body: `VU ${__VU} iter ${__ITER}` }),
            ),
          );
        }, 2000); // 2초마다 1메시지
      }
    });

    socket.setTimeout(() => socket.close(), 30000); // 30초 세션
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```

### 5.3 왜 `setup()`에서 토큰을 발급하지 않는가

**SharedArray + 사전 발급 파일**을 쓰는 이유:

- `setup()`은 1회만 돌지만 **여기서 1000개 HTTP 요청**을 쏘면 부하 테스트 시작 직전에 DB/Redis 상태가 꼬인다
- 별도 Node 스크립트(`loadtest/prepare-tokens.js`)로 **사전에 회원가입·로그인하여 JWT를 `tokens.json`에 저장**
- `SharedArray`는 VU들 간에 메모리를 공유 → 1000 VU가 1000개 토큰 파일을 중복 메모리 로드하지 않음

---

## 6. 결과 분석 포인트

### 6.1 k6 summary 리포트 읽는 법

테스트 종료 시 이런 블록이 뜬다:

```text
✓ status is 101

checks.........................: 100.00% ✓ 12000   ✗ 0
data_received..................: 45 MB   750 kB/s
data_sent......................: 12 MB   200 kB/s
http_req_duration..............: avg=120ms  min=45ms med=110ms max=890ms p(90)=180ms p(95)=240ms
http_req_failed................: 0.05%   ✓ 6       ✗ 11994
iterations.....................: 12000   200/s
vus............................: 1000    min=0   max=1000
ws_connecting..................: avg=320ms  min=180ms med=300ms max=1.2s  p(95)=420ms
ws_msgs_sent...................: 48000   800/s
ws_msgs_received...............: 46500   775/s
```

보는 순서:

1. **`checks`가 100%인가**: assertion 실패면 즉시 시나리오 문제
2. **`http_req_failed` / `ws_connecting` p(95)**: thresholds 미달 여부
3. **`ws_msgs_sent` vs `ws_msgs_received` 차이**: broadcast 누락 여부 (모든 구독자가 같은 메시지 받아야 하는데 차이가 크면 broker 문제)
4. **`iterations per second`**: VU 증가에 따라 선형으로 늘다가 어디서 평탄해지는지 → 그 지점이 병목

### 6.2 실패율·지연 해석

- **p(95) > 500ms** 가 지속되면 UX상 이미 느림. 유저가 "반응이 없다"고 느끼는 구간
- **에러율 1% 초과**: SLO 위반. 구체적으로 뭐가 실패했는지는 `--http-debug` 또는 로그
- **CPU 포화 전에 latency가 튀는 경우**: I/O 병목(DB, broker 큐) 의심
- **에러율이 계단식으로 상승**: 연결 풀 고갈, 토큰 만료, rate limit 등 구체적 원인이 있는 패턴

### 6.3 Grafana와 교차 검증

k6 summary는 **테스트 쪽 관점**이고, Prometheus+Grafana는 **서버 쪽 관점**이다. 두 타임라인을 맞춰 읽어야 원인을 짚는다.

| 질문 | k6가 말해주는 것 | Grafana가 말해주는 것 |
|------|-----------------|---------------------|
| "응답이 느려졌다" | p(95)가 400ms → 800ms로 튐 | 같은 시각에 JVM GC time 급증, Cassandra write latency 증가 |
| "에러가 났다" | `http_req_failed` 2% | 같은 시각 5xx 로그, thread pool saturation |
| "어디부터 꺾이나" | VU 700에서 iteration/s 평탄 | 같은 시각 DB connection pool wait time 증가 |

**시간축 정렬이 중요**. k6 실행 시작 시각을 기록해 두고 Grafana time range를 그 구간으로 맞춘다.

---

## 7. 자주 만날 함정 (실수 예방 체크리스트)

### 7.1 WebSocket 이벤트 루프와 iterations의 관계

`ws.connect` 안의 콜백들(`on('open')`, `on('message')`, `setInterval`)은 이벤트 루프에서 실행된다. **`ws.connect`가 반환될 때까지가 1 iteration**. 즉:

- `socket.setTimeout(() => socket.close(), 30000)` 로 세션을 닫아야 iteration이 끝남
- 그 안에서 메시지를 100번 보내든 1번 보내든 **iteration은 1로 센다**
- "초당 몇 메시지 보냈나"는 `ws_msgs_sent` 커스텀 metric 또는 counter로 따로 측정

일반 HTTP 시나리오의 "iteration = 요청 1개"와 헷갈리지 말 것.

### 7.2 JWT 토큰 풀이 VU 수만큼 필요하다

**게스트는 채팅 사용 불가** (`GuestChatNotAllowedException` — `ChatMessageHandler`에서 Principal 검사). 즉 부하 테스트에서 `/app/chat/village` SEND 를 실제로 쏘려면 **정회원 JWT**가 필요하다.

- 1 JWT를 1000 VU가 공유하면 DB 쪽 "같은 userId 멀티 세션"이 되고 부하 분포가 왜곡됨
- 토큰이 부족하면 CONNECT 실패 → 즉시 재시도 폭주 → 테스트가 인증 병목을 측정하게 됨
- **VU 최대치 ≤ 토큰 풀 크기**를 보장할 것. 1000 VU면 tokens.json에 1000개 JWT

**사전 발급 절차** (Step C 실행 전 1회):

1. 테스트용 계정 1000개 회원가입 (전용 이메일 패턴, 예: `loadtest-0001@test.local`)
2. 각 계정 로그인 → JWT 받기 → `tokens.json` 배열로 저장
3. 테스트 끝나면 배치 삭제 스크립트로 cleanup

### 7.3 Ramping 중 VU가 즉시 늘지 않는다

`stages: [{ duration: '3m', target: 500 }]`는 "3분에 걸쳐 500까지 올림"이다. `stage.target`에 도달하는 건 구간 끝. 측정 구간을 "VU=500 상태 5분"으로 잡고 싶으면 다음 stage를 `{ duration: '5m', target: 500 }` 로 추가해 유지 구간을 명시해야 한다.

### 7.4 결과 JSON이 기가바이트 단위로 커진다

`--out json=result.json`은 **모든 데이터 포인트**를 기록한다. 1000 VU × 10분 시나리오는 수 GB. 로컬 디스크가 꽉 찬다. 대안:

- `--summary-export=summary.json` 만으로 충분한 경우가 대부분 (CI 친화)
- 상세 시계열이 필요하면 `--out experimental-prometheus-rw`로 Prometheus에 직송 (TSDB가 압축·관리)
- 꼭 JSON이 필요하면 `--out json=result.json.gz` (gzip 자동 적용)

### 7.5 SockJS를 흉내내야 하나?

프로덕션 프론트는 SockJS(`withSockJS()`)를 쓴다. SockJS는 WebSocket 실패 시 HTTP streaming·long polling으로 fallback하고, URL에 session-id·server-id 세그먼트를 끼워넣는다(`/ws/abc/123/websocket`).

**부하 테스트는 SockJS를 흉내내지 말고 raw WebSocket으로 직접 연결**한다:

- k6 `ws.connect`는 raw WebSocket 전용 (SockJS 프로토콜 미지원)
- Spring WebSocket 서버는 **같은 endpoint에 raw WS 연결도 수락**한다 (`/ws/websocket` 경로로 접근)
- fallback transport까지 테스트하는 건 별도 목적이고, 1차 목표는 "정상 경로의 한계"이므로 raw로 충분

### 7.6 같은 VU가 같은 destination에 폭격하면 브로커가 유저 관점이 아닌 세션 관점으로 본다

실서비스는 "유저 A가 접속, B가 접속, ..." 식으로 **시간 분산**이 있다. 부하 테스트에서 모든 VU가 정확히 2초마다 동시에 메시지를 쏘면 **server-side 락 경합이 과대평가**될 수 있다. 필요하면 `sleep(Math.random() * 2)` 등으로 jitter를 준다.

---

## 8. 취업 서사 고리

### 8.1 NAVER Cloud / SOOP 계열

이쪽은 사내에 **nGrinder**가 있다. "왜 nGrinder 아니고 k6?"에 대한 답은 준비해 두자:

- 개인 프로젝트는 컨트롤러/에이전트 분리의 이득이 없다. 단일 EC2에 단일 바이너리가 충분
- CI(GitHub Actions)에서 스크립트 한 줄로 돌릴 수 있는 게 k6
- 팀 합류 시엔 nGrinder 학습에 열려 있음 — **"도구 선택은 환경 따라"**가 요점

### 8.2 마플 (Node.js 스택)

JS 기반 테스트 스크립트가 팀 언어 컨텍스트에 맞는다는 건 강한 셀링 포인트. **"백엔드 엔지니어가 팀의 공용어로 테스트 자산을 남길 수 있다"**는 서사.

### 8.3 공통 — 서사 한 줄 버전

"부하 테스트 도구를 고를 때 **측정 대상의 프로토콜**과 **팀의 반복 속도**를 먼저 본다. WebSocket/STOMP 같은 특수 프로토콜은 네이티브 지원과 프레임 수동 조립 비용을 비교해야 하고, 1회성 과제인지 주기적 회귀 테스트인지에 따라 컨트롤러 아키텍처의 득실이 달라진다."

---

## 9. 다음 단계 체크리스트 (Step C 진입 전)

- [ ] k6 로컬 설치 (`k6 version` 통과)
- [ ] 공식 예제(`k6 run --vus 1 --duration 10s https://test.k6.io`)로 손 익히기
- [ ] `loadtest/lib/stomp.js` 작성 — `stompFrame`, `parseStompFrame`
- [ ] 테스트 계정 사전 발급 스크립트 (`loadtest/prepare-tokens.js`) — 10개 먼저
- [ ] 스모크 테스트: VU 1, 30초, `tokens.json`에서 1개만 써서 SEND 성공 확인
- [ ] STOMP 프레임 로그로 CONNECTED / MESSAGE 수신 확인
- [ ] 정식 시나리오 실행: ramping-vus 5 → 1000
- [ ] Grafana 대시보드에서 CPU·메모리·GC·DB connection 동시 관찰
- [ ] Performance Report 작성 (p(95), 병목 좌표, 개선안)

---

## 10. 참고 자료

### 공식 문서

- [k6 Scenarios](https://k6.io/docs/using-k6/scenarios/) — executor 종류, 옵션 레퍼런스
- [k6 WebSocket API](https://k6.io/docs/using-k6/protocols/websockets/) — `ws.connect`, socket 이벤트
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/) — SLO 코드화
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/) — 내장·커스텀 metric
- [STOMP 1.2 스펙](https://stomp.github.io/stomp-specification-1.2.html) — 프레임 포맷 공식

### 한국 실무 사례

- [SK DevOcean — k6 도입기](https://devocean.sk.com/) (`k6` 검색)
- [우아한형제들 기술블로그 — 부하 테스트 도구 비교](https://techblog.woowahan.com/) (`부하 테스트` 검색)
- [NAVER D2 — nGrinder](https://naver.github.io/ngrinder/) — 비교 대상으로 훑어볼 것

### 이 프로젝트 문서

- [40. 관측성 스택 도입기](./40-observability-stack-decisions.md) — 도구 선택 결정의 자세한 비교
- [15. WebSocket + STOMP 동작 원리](./15-websocket-stomp-deep-dive.md) — 프로토콜 자체 복습
- [24. STOMP JWT 인증](./24-stomp-websocket-jwt-channel-interceptor.md) — CONNECT 프레임 인증 흐름
- [21. 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md) — 측정 대상의 전체 그림

---

## 11. 요약 — 한 줄

**"k6는 JS + raw WebSocket 위에 STOMP 프레임을 직접 조립해서 쓴다. 토큰 풀을 사전 준비하고, ramping-vus로 breaking point를 찾고, Grafana와 시간축을 맞춰 원인을 짚는다."**
