# 60. STOMP 자동 reconnect — 두 레이어 reconnect 메커니즘의 독립성

> 작성 시점: 2026-04-28
> 트랙: 단일 핫픽스 (`fix/stomp-member-token-loop`)
> 맥락: 운영 환경 `ghworld.co` 에서 멤버 토큰 만료 후 위치/채팅/타이핑이 모두 정지. 콘솔에 같은 STOMP 인증 실패 로그가 5초마다 무한 반복. issue 등록 직후 핫픽스 진행.
> 관련 파일:
>
> - `frontend/src/lib/websocket/useStomp.ts:178-209`
> - `frontend/src/lib/websocket/stompClient.ts:9-22, 38-41`

---

## 0. 한 줄 요약

**`@stomp/stompjs` Client 의 `reconnectDelay` 자동 재연결과 앱 레이어의 `onError` 분기는 서로 독립적이다. onError 에서 `return` 만 하면 라이브러리는 "에러 났으니 5초 후 재시도" 로 이해해서 같은 만료 토큰으로 무한 루프에 빠진다. 의도가 "재연결 중단" 이라면 `Client.deactivate()` 를 명시적으로 호출해야만 멈춘다.**

운영 증상(멤버 토큰 만료 후 모든 실시간 기능 정지 + 5초 주기 콘솔 도배) 은 두 레이어 중 한쪽만 막고 다른 쪽은 안 막은 결과였다. 핫픽스는 onError 의 멤버 분기에 `disconnectStomp()` 한 줄 추가.

---

## 1. 운영 증상

```text
환경: ghworld.co
조건: 멤버로 로그인한 후 access token 이 만료될 때까지 탭을 열어둠
증상:
  - 캐릭터 위치 broadcast 정지 (다른 사람도 안 보임, 내 위치도 안 보냄)
  - 채팅 송수신 정지
  - 타이핑 인디케이터 정지
  - 콘솔에 5초마다 같은 로그 무한 반복:
      [STOMP] >>> CONNECT
      [STOMP] <<< ERROR  message:Invalid or expired token
      [useStomp] STOMP error: ...
```

증상 자체는 "토큰 만료" 라는 정상 시나리오에 대한 처리지만, 그 처리가 **5초 주기 무한 재시도** 로 변질되어 있다는 게 문제. 서버 부하는 작지만(같은 토큰으로 CONNECT 만 반복), UX·로깅·운영 노이즈 측면에서 출혈이 큼.

---

## 2. 원인 — 두 레이어 reconnect 메커니즘의 독립성

### 2.1 레이어 구조

```text
┌─────────────────────────────────────────────────────┐
│  L1: 앱 레이어 (useStomp.ts)                         │
│      onStompError 콜백 → role 분기 → setTimeout 재연결 │
│      ↑ "멤버면 setTimeout 안 걸고 return" 으로 차단 시도 │
└─────────────────────────────────────────────────────┘
                       ▲
                       │ 콜백 호출 (이벤트 알림만, 제어권은 라이브러리에)
                       │
┌─────────────────────────────────────────────────────┐
│  L2: 라이브러리 레이어 (@stomp/stompjs Client)         │
│      reconnectDelay: 5_000                          │
│      ↑ Client 내부 타이머. disconnect/error 시 자동 재연결 │
│      ↑ onStompError 콜백 호출과 별개로 동작              │
└─────────────────────────────────────────────────────┘
```

L1 의 `onStompError` 콜백은 "에러가 났음을 알린다" 만 하고, 재연결을 시작/중단할 권한은 없다. 재연결은 L2 의 Client 내부 타이머가 담당.

### 2.2 핫픽스 전 코드 (시나리오)

```ts
// useStomp.ts onError
const onError = (err: IFrame) => {
  if (role === 'MEMBER') {
    console.warn('재연결 중단, 재로그인 필요');
    return;  // ← L1 의 setTimeout 만 차단. L2 는 살아있음.
  }
  // 게스트 분기...
  setTimeout(() => connect(), 3000);
};
```

위 `return` 의 의도는 "더 이상 연결 시도하지 말라" 였지만, 실제로는 **L1 의 추가 setTimeout 만 안 걸린다.** L2 는 disconnect 가 발생한 직후 5초 타이머를 시작했고, 그 타이머는 `return` 과 무관하게 만료되어 같은 만료 토큰으로 다시 CONNECT.

### 2.3 라이브러리 동작 — 왜 그렇게 만들어져 있는가

`@stomp/stompjs` 의 `reconnectDelay > 0` 옵션은 "끊기면 자동으로 다시 붙여라" 를 약속한다. 라이브러리는 다음을 구분하지 않는다:

- 네트워크가 잠깐 끊어진 것
- 서버가 일시 응답을 못 주는 것
- 인증이 거부된 것
- 사용자가 의도적으로 끊은 것

**구분은 앱이 한다.** 그리고 "재연결 중단" 의 의사 표현은 콜백에서 `return` 하는 게 아니라 **`Client.deactivate()` 를 명시적으로 호출하는 것** 뿐.

---

## 3. 트레이드오프 1 — 패치 분리 vs 통합

핫픽스 시점에 활성 트랙으로 ws-redis Step 3 (raw WebSocket + Redis Pub/Sub 으로 STOMP 자체 교체) 가 대기 중이었고, 후속 의제로 멤버 토큰 자동 갱신(`member-token-renewal`) 도 제안된 상태였다. 어디에 fix 를 넣을지 옵션이 셋이었음.

| | A. 별도 핫픽스 PR (채택) | B. ws-redis Step 3 통합 | C. member-token-renewal 트랙 우선 |
|--|---|---|---|
| 운영 출혈 정지 시점 | 즉시 | Step 3 완성까지 (수일 ~ 1주+) | 트랙 완성까지 (1주+) |
| 변경 규모 | 1줄 (`disconnectStomp()`) | Step 3 의 raw WS 교체에 흡수 | refresh/sliding/WS push 비교 + 백엔드 변경 큼 |
| 폐기 코드 | 1줄 (Step 3 머지 시 useStomp.ts 자체 사장) | 0 | 0 |
| 기존 트랙 영향 | 없음 (독립 브랜치) | Step 3 일정에 토큰 fix 가 끼어들어옴 | Step 3 일정 밀림 |
| 근본 해결 여부 | 증상만 차단 (재로그인은 여전히 사람이 해야 함) | 증상 차단 + 새 구조 위에서 재설계 | 근본 해결 (자동 갱신) |

채택: **A**. 운영 5초/회 무한 reconnect 출혈(콘솔 도배 + 백엔드 인증 인터셉터 부하 + UX 정지) 이 Step 3 까지 기다릴 비용보다 큼. 폐기될 코드 1줄은 허용 범위.

C 는 별도 트랙으로 진행 가능하지만 본 핫픽스의 대안은 아니다 — C 가 끝나도 "토큰 갱신 자체가 실패하는 시나리오" 의 재연결 정책은 여전히 필요.

### 3.1 채택의 부수 결정

- 핫픽스 PR 안에 학습노트(이 문서) 같이 넣음 — Critical Rule #7
- 핫픽스 적용 후 issue 본문에 "근본 해결은 토큰 자동 갱신, 별도 트랙(#38)" 로 후속 링크
- ws-redis Step 3 PR 의 "polluted files" 목록에 `useStomp.ts` 추가 (충돌 방지용 메모)

---

## 4. 트레이드오프 2 — 한 줄 추가 vs 핸들러 추출 리팩토링

핫픽스 코드 자체에 두 옵션이 있었음.

| | (a) `disconnectStomp()` 한 줄 추가 (채택) | (b) `handleStompError` 순수 함수 추출 + 단위 테스트 |
|--|---|---|
| 변경 라인 수 | 1줄 | ~50 (함수 추출 + 테스트 파일 + import 정리) |
| 리뷰 부담 | 거의 없음 | 함수 시그니처·테스트 케이스 합의 필요 |
| 테스트 작성 가능성 | 어려움 (hook + STOMP Client 모킹 필요) | 쉬움 (순수 함수 단위 테스트) |
| ws-redis Step 3 와 충돌 | useStomp 줄 1개만 변경 → 충돌 적음 | useStomp 구조 자체를 바꿈 → Step 3 머지 시 큰 충돌 |
| Step 3 머지 후 운명 | 같이 사라짐 (1줄 폐기) | 같이 사라짐 (50줄 + 테스트 폐기) |
| CLAUDE.md 룰 위반 여부 | 없음 | "리팩토링과 기능 구현 동시 X" 룰 위반 가능 |

채택: **(a)**. 두 가지 이유.

1. **리팩토링 + 기능 변경 동시 금지** (CLAUDE.md §1, §5.3). 핫픽스 = 기능 변경(버그 수정). 같은 PR 에 추출 리팩토링을 끼우면 "핫픽스가 안전한가" 와 "리팩토링이 등가인가" 두 검증을 동시에 해야 함.
2. **사장될 코드에 추가 작업 비효율**. ws-redis Step 3 가 useStomp 자체를 raw WS 핸들러로 교체할 예정. 추출 함수의 수명이 너무 짧음.

### 4.1 (b) 의 가치는 어디에 있는가

(b) 가 의미 있는 시점은 **"useStomp 가 장기 유지되는 코드" 일 때**. 본 프로젝트는 그 반대 (Step 3 에서 사라짐) 라서 가치가 매칭 안 됨. 다른 프로젝트에서 STOMP 를 계속 쓴다면 (b) 가 정답.

---

## 5. 일반 원칙 — 라이브러리 자동 reconnect 사용 시

본 사건의 일반화:

**"라이브러리 자동 reconnect 를 켰다면, '의도된 종료' 와 '에러' 를 코드에서 명시적으로 분리하고, '의도된 종료' 는 항상 라이브러리 API(deactivate/close/stop) 로 표현하라."**

### 5.1 다른 라이브러리도 같은 패턴

| 라이브러리 | 자동 reconnect 옵션 | "재연결 그만" 표현 |
|---|---|---|
| `@stomp/stompjs` | `reconnectDelay: ms` (>0 이면 활성) | `client.deactivate()` |
| `socket.io-client` | `reconnection: true` (기본값) | `socket.disconnect()` |
| `@microsoft/signalr` | `withAutomaticReconnect()` | `connection.stop()` |
| `reconnecting-websocket` | 기본 활성 | `socket.close()` (의도된 close 는 reconnect 안 함) |
| `@grpc/grpc-js` (스트림) | 기본 활성 | `call.cancel()` |

공통 룰:

- 콜백(`onError`, `onDisconnect`, `onClose`) 안에서 단순 `return` 은 **재연결을 막지 못한다**.
- "재연결 그만" 의도는 라이브러리가 제공하는 명시적 종료 API 로만 전달.

### 5.2 안티패턴 — 본 사건의 형태

```ts
// 자주 나오는 안티패턴
client.onError = (err) => {
  if (someCondition) {
    return;  // ← 이 return 은 라이브러리에 아무 의미 없음
  }
  scheduleReconnect();
};
```

이 코드는 "재연결 중단을 표현했다" 는 자기암시일 뿐이다. 라이브러리 입장에서 onError 콜백은 그냥 알림이고, 재연결 결정은 자기 옵션(`reconnectDelay` 등) 에 의해 자동.

### 5.3 안전한 패턴

```ts
// 1. 재연결 중단을 명확히 표현
client.onError = (err) => {
  if (shouldStop) {
    client.deactivate();  // ← 라이브러리가 이해하는 언어로
    return;
  }
  // 라이브러리에게 재연결 맡김 (reconnectDelay 자동 동작)
};

// 2. 또는 자동 reconnect 자체를 끄고 앱이 모든 결정 가짐
const client = new Client({ reconnectDelay: 0 });
client.onError = (err) => {
  if (shouldRetry) scheduleReconnect();
};
```

본 프로젝트는 1번 패턴 채택 (`reconnectDelay: 5_000` 유지 + 멤버 분기에서 `deactivate`).

### 5.4 디버그 룰

자동 reconnect 옵션을 쓰는 코드에는 **"재연결이 트리거되는 모든 경로에 로그를 남기는 디버그 모드"** 를 둔다. `@stomp/stompjs` 의 경우 `debug: msg => console.log('[STOMP]', msg)` 옵션으로 라이브러리 내부 로그가 보인다 — 본 사건도 이 로그(`>>> CONNECT` 가 5초마다 반복) 가 핵심 단서였다.

---

## 6. 같은 패턴의 다른 회귀 사례

### 6.1 `socket.io-client` 의 무한 재연결

socket.io-client 의 `reconnection: true` (기본값) 는 서버가 명시적으로 disconnect reason 을 `io server disconnect` 로 보낸 경우에만 자동 재연결을 멈춘다. 그 외엔 (`transport close`, `ping timeout` 등) 무한 재시도.

같은 함정: 인증 만료 시 서버가 `io server disconnect` 가 아니라 단순 close 로 응답하면, 클라이언트가 무한 재시도. fix 는 서버가 disconnect reason 을 명시하거나, 클라이언트가 `reconnection_failed` 이벤트에서 `socket.disconnect()` 호출.

### 6.2 HTTP 인터셉터의 401 자동 갱신 무한 루프

axios/fetch 인터셉터에서 401 응답 시 토큰 갱신 후 재시도 — 갱신된 토큰도 401 이면 무한 루프. 거의 모든 프로덕션에서 한 번씩 만나는 패턴. fix 는 "재시도 횟수 카운터" 또는 "갱신 후 다시 401 이면 로그아웃 처리".

본 사건의 STOMP 버전이 정확히 이 패턴이다. 차이는 axios 의 retry 가 명시적인 반면, STOMP 의 reconnectDelay 는 암묵적이라 발견이 늦다는 것.

### 6.3 DB connection pool 의 retry storm

DB connection 이 timeout 으로 끊겨서 pool 이 재연결 시도 → DB 가 부하로 응답 못 함 → 재연결 실패 → 더 많은 재연결 시도 → DB 사망. 이른바 retry storm.

같은 일반 원칙: **"실패 원인이 해소되지 않은 상태에서 같은 동작을 반복하면 시스템 리소스만 소모한다."** 본 사건의 5초 주기 무한 CONNECT 도 작은 규모의 retry storm.

### 6.4 일반 원칙 강화

위 사례들의 공통점은 셋:

1. **자동 복구 메커니즘이 실패 원인을 분류하지 못한다** — "다 같은 에러" 로 처리.
2. **호출자가 "그만" 의 의사를 표현할 명확한 API 를 안 쓴다** — return / 단순 throw 로 끝.
3. **백오프(exponential backoff)·서킷 브레이커 같은 retry 제어가 빠져있다.**

본 핫픽스는 1번(역할별 분기) + 2번(`deactivate` 명시) 만 잡았고, 3번은 라이브러리 기본 5초 고정에 의존. ws-redis Step 3 에서 raw WS 로 가면 backoff·circuit breaker 도 직접 설계 가능.

---

## 7. 후속 의제 — 근본 해결로 가는 길

### 7.1 단기 (본 핫픽스 외 추가 작업 없음)

- 핫픽스: 멤버 분기 `disconnectStomp()` (적용 완료, 본 PR)
- 사용자 액션: 토큰 만료 시 페이지 새로고침 + 재로그인

### 7.2 중기 — 멤버 토큰 자동 갱신 (`member-token-renewal` 트랙)

학습노트 55번 (예약됨, 트랙 착수 시 작성) 에서 다룰 비교:

- **Sliding session**: 매 요청마다 토큰 만료 시각 연장. 백엔드가 토큰 재발급 응답.
- **Refresh token**: access + refresh 분리. access 만료 시 refresh 로 갱신. 표준 패턴.
- **WebSocket 채널을 통한 토큰 push**: 만료 직전 서버가 새 토큰을 WS 로 push. 끊김 없이 갱신.
- **무인증 자동 게스트 다운그레이드**: 멤버 토큰 만료 시 게스트로 자동 전환. 본 프로젝트는 명시적으로 **금지** (Codex P1 리뷰, #36) — 멤버 신원 상실로 이어짐.

### 7.3 장기 — ws-redis Step 3 이후

raw WebSocket + Redis Pub/Sub 구조에선 STOMP Client 자체가 사라지므로 본 핫픽스의 코드도 같이 사라진다. 새 구조에서 reconnect 정책을 처음부터 직접 설계 — 자동 reconnect 자체를 안 켜고 앱이 모든 결정을 갖는 5.3 의 2번 패턴이 자연스러움.

---

## 8. 나중에 돌아보면

### 8.1 이 핫픽스가 부족했다고 느낄 시점

- 사용자 컴플레인이 "재로그인이 너무 잦다" 로 바뀌면 → 토큰 자동 갱신(7.2) 시급.
- 멤버 토큰 만료 외에 다른 시나리오에서 같은 무한 reconnect 가 보고되면 → onError 분기의 다른 분기에도 같은 함정. 모든 분기 점검.
- 게스트 분기에서도 "토큰 발급은 됐는데 서버가 계속 거부" 같은 상황이 생기면 → 게스트 분기에도 횟수 제한·circuit breaker 필요.

### 8.2 이 노트의 수명

ws-redis Step 3 머지 시점에 본 노트의 코드 예시는 모두 stale. 단, **§5 의 일반 원칙 (라이브러리 자동 reconnect vs 앱 onError 분리)** 는 raw WS·socket.io·signalR 등 어떤 라이브러리로 가도 유효. 노트 자체는 보존하되 §0~§4 에 "STOMP 시대의 사건" 표시 추가 검토.

### 8.3 회귀 방지

ws-redis Step 3 의 raw WS 핸들러를 작성할 때 본 노트의 §5 안티패턴이 다시 나오는지 점검. "에러 콜백에서 return 만 하고 있는가" 가 회귀 시그널.

---

## 9. 더 공부할 거리

### 9.1 직접 관련 (이 프로젝트)

- [learning/15 — WebSocket + STOMP 동작 원리](./15-websocket-stomp-deep-dive.md) — STOMP 라이프사이클·DISCONNECT 표준
- [learning/24 — STOMP JWT 인증](./24-stomp-websocket-jwt-channel-interceptor.md) — `Invalid or expired token` 메시지가 어디서 발사되는가
- [learning/44 — Spring STOMP 외부 Broker 선택](./44-spring-stomp-external-broker-choice.md) — STOMP 시대의 끝맺음 결정
- [learning/45 — Raw WebSocket + Redis Pub/Sub 재설계 설계서](./45-websocket-redis-pubsub-redesign.md) — Step 3 후속 구조. 본 핫픽스 코드의 교체 대상
- [learning/54 — 유령 캐릭터 진단기](./54-presence-cleanup-ghost-character-diagnosis.md) — 같은 useStomp.ts 의 다른 함정. onError 트리거 조건이 너무 넓다는 §5.3 룰이 본 노트와 직접 연결

### 9.2 라이브러리 공식 문서

- [@stomp/stompjs — Client API](https://stomp-js.github.io/api-docs/latest/classes/Client.html) — `reconnectDelay`·`activate`·`deactivate` 정의
- [@stomp/stompjs — Auto Reconnect 가이드](https://stomp-js.github.io/guide/stompjs/using-stompjs-v5.html#auto-reconnect) — 자동 재연결의 정확한 동작
- [STOMP 1.2 — ERROR frame](https://stomp.github.io/stomp-specification-1.2.html#ERROR) — 서버가 ERROR 보낸 후 동작 표준 (= 연결 종료)

### 9.3 비슷한 패턴의 다른 라이브러리

- [socket.io-client — Reconnection 문서](https://socket.io/docs/v4/client-options/#reconnection)
- [@microsoft/signalr — Automatic Reconnection](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-8.0#reconnect-clients)
- [reconnecting-websocket README](https://github.com/joewalnes/reconnecting-websocket) — close 와 자동 reconnect 의 명시적 분리

### 9.4 retry·circuit breaker 일반론

- [Martin Fowler — CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html) — retry storm 방지의 표준 패턴
- [AWS Architecture — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — 5초 고정 retry 의 위험과 대안
- [Resilience4j 문서](https://resilience4j.readme.io/docs/circuitbreaker) — JVM 진영의 표준 라이브러리. 본 프로젝트의 백엔드에도 도입 검토 가치

---

## 부록 A. 핫픽스 diff 한눈에

```ts
// frontend/src/lib/websocket/useStomp.ts:191-199
if (role === 'MEMBER') {
  console.warn('[useStomp] 멤버 인증 실패 — 재연결 중단, 재로그인 필요');
  disconnectStomp();   // ← 추가. Client.deactivate() 호출로 L2 자동 reconnect 차단
  return;
}
```

`disconnectStomp()` 의 구현은 `stompClient.ts:38-41`:

```ts
export function disconnectStomp(): void {
  void stompClient?.deactivate();   // ← 라이브러리에 "재연결 그만" 명시
  stompClient = null;                // 다음 connect() 호출 시 새 인스턴스
}
```

`deactivate()` 는 Client state 를 INACTIVE 로 전환 + 내부 reconnect 타이머 취소. 이후 `activate()` 가 다시 호출되기 전까지 어떤 재연결도 시도하지 않음.

## 부록 B. 진단 신뢰도

본 진단은 **코드 워크스루 + 라이브러리 동작 추론** 으로 도출됐다. 검증되지 않은 부분:

- 운영 환경에서 STOMP debug 로그를 켜서 5초 주기 CONNECT 가 라이브러리 내부 타이머에서 발생함을 직접 확인 — 콘솔 로그 패턴은 그렇게 보이지만 정확한 timer source 는 추정.
- `@stomp/stompjs` 내부 소스를 직접 읽어 `onStompError` 콜백 호출과 reconnect 타이머 시작의 순서 검증.

[추정] 부분: 본 핫픽스로 운영 증상이 100% 해결됨은 PR 머지 후 ghworld.co 에서 확인 필요. 재현 방법: 멤버 로그인 후 토큰 만료까지 대기 (또는 만료된 토큰을 localStorage 에 강제 주입 후 새로고침).

---

> 이 노트는 STOMP 시대의 마지막 핫픽스 중 하나의 기록이다. ws-redis Step 3 머지 후 본 코드는 사라지지만, **§5 의 일반 원칙 (자동 reconnect 라이브러리의 두 레이어 분리)** 는 어떤 실시간 라이브러리로 가도 유효하므로 회귀 방지 체크리스트로 활용한다.
