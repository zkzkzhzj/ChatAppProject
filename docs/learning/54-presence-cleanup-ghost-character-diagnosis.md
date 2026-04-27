# 54. presence cleanup — "본인을 따라다니는 유령 캐릭터" 진단기

> 작성 시점: 2026-04-27
> 트랙: `ghost-session` (첫 노트, Step 1 산출물)
> 맥락: 운영 환경 `ghworld.co` 에서 보고된 issue #28 — "다른 클라이언트 화면에 본인을 따라다니는 손님 캐릭터가 잔존". Step 1 = 진단, Step 2 = 정책 합의 게이트의 인풋
> 관련 파일:
> - `frontend/src/lib/websocket/useStomp.ts:67-79, 133-144`
> - `frontend/src/game/scenes/VillageScene.ts:104-109, 449-466, 485-502, 543-555`
> - `backend/src/main/java/com/maeum/gohyang/global/security/AuthenticatedUser.java:41-46`
> - `backend/src/main/java/com/maeum/gohyang/village/adapter/in/websocket/PositionHandler.java`
> - `backend/src/main/java/com/maeum/gohyang/village/adapter/in/websocket/PositionDisconnectListener.java`

---

## 0. 한 줄 요약

**유령의 95% 는 백엔드 presence cleanup 의 문제가 아니다. 게스트 토큰이 onError 마다 재발급되면서 클라이언트의 "내가 누구냐(myDisplayId)" 가 stale 되고, 자기 자신을 다른 사람으로 오인해 자기 화면에 추가하는 프론트엔드 버그다.**

issue #28 본문은 백엔드 `PositionDisconnectListener` 의 disconnect 처리 누락·`sweepStalePlayers` 와 STOMP DISCONNECT 의 정책 미정의·동일 userId 다중 connection 정책 부재를 의심했다. 코드 워크스루 결과 진짜 원인은 다른 곳이었다 — 토큰 재발급 → `sessionId` 변경 → `displayId()` 변경 → 자기 무시 비교 실패. "본인을 따라다닌다" 는 표현은 이 메커니즘에서만 자연스럽게 설명된다.

이 노트는 진단의 최종 결과를 정리해서, Step 2 (정책 합의 게이트) 에서 "그래서 무엇을 고치자" 를 논의할 때 출발점이 되도록 만든 것이다. **fix 는 Step 2 승인 후 시작한다 — 본 노트는 진단 + 인풋용이지 실행 계획이 아니다.**

---

## 1. 증상 — issue #28 이 보고한 그림

```text
운영 환경 (ghworld.co), 다중 사용자 입장 직후

A 유저 화면:
  - 자기 캐릭터(움직임) + "손님 캐릭터" 1명이 본인을 그대로 따라다님
  - 자기가 동/서/남/북 어디로 가든 손님이 같은 속도로 따라옴

B 유저 화면 (동시 접속):
  - A 의 "이전" 캐릭터가 아무 데도 안 가고 정지 상태로 남아 있음
  - A 의 "현재" 캐릭터는 옆에서 정상 동작
  - 30초쯤 지나면 정지된 캐릭터가 사라짐
```

issue 본문이 강조한 부분: **"본인을 따라다니는"** 이라는 표현. 이게 핵심 단서다. 단순한 "끊긴 캐릭터가 안 사라지는" 문제라면 정지 상태로 남아 있어야 한다. 따라다닌다 = 누군가 좌표 broadcast 를 계속 보내고 있다는 뜻.

### 1.1 issue 본문이 의심한 원인

| # | 의심 지점 | 의심 근거 |
|---|---|---|
| 1 | `PositionDisconnectListener` 의 disconnect 처리 누락/지연 | LEAVE broadcast 가 안 가서 캐릭터가 안 사라진다는 가설 |
| 2 | `sweepStalePlayers` (30초 stale 청소) ↔ STOMP DISCONNECT 두 경로의 정책 미정의 | "둘 중 어느 쪽이 진실 소스인가" 가 불명확 |
| 3 | 동일 userId 다중 connection 정책 부재 | 같은 유저의 여러 세션이 별개 player 로 인식되는 시나리오 |

세 의심 모두 **백엔드 presence cleanup** 영역. 즉 보고자는 "서버가 누군가 떠난 걸 모르거나, 늦게 알거나, 같은 사람을 두 명으로 본다" 라고 추측했다.

### 1.2 결과 — 셋 다 진짜 원인이 아니다

코드 워크스루 결과 셋 다 보조 원인이거나 무관:

- 의심 1: `PositionDisconnectListener` 자체는 정상. 이벤트가 늦게 도착할 뿐.
- 의심 2: `sweepStalePlayers` 는 프론트엔드 방어선이고 30초 후 동작함 — 보고된 증상의 시간 척도(즉시·지속)와 안 맞음.
- 의심 3: 동일 userId 다중 connection 은 다른 트랙(`ws-redis`) 의 영역. 본 증상의 직접 원인은 아니며, **같은 유저가 다른 displayId 로 보이는 메커니즘이 따로 있다.**

진짜 원인은 다음 섹션.

---

## 2. 진짜 원인 — 프론트엔드 자기인식의 stale

### 2.1 한 줄

`VillageScene.myDisplayId` 가 씬 create 시점에 한 번만 결정되는데, 그 사이에 STOMP `onError` → 토큰 삭제 → 토큰 재발급이 일어나면 새 토큰의 `displayId` 와 어긋난다. 그 다음부터 자기 broadcast 를 자기가 받아도 자기 무시 비교가 실패해서 "다른 사람" 으로 처리된다.

### 2.2 코드로 추적

#### (1) `myDisplayId` 결정 — 1회만

`frontend/src/game/scenes/VillageScene.ts:449-466`

```ts
private resolveMyDisplayId(): string {
  // accessToken 의 payload 를 디코드해서 sub/sessionId 로 displayId 결정
  // 게스트면 "guest-AAA" 같은 sessionId 그대로
  // ...
}
```

이 함수가 호출되는 위치는 `create()` 안 한 곳뿐 (`VillageScene.ts:104-109` 근처). 즉 **씬이 생성된 시점의 토큰 기준으로 한 번만 myDisplayId 가 박힌다.** 토큰이 나중에 바뀌어도 이 값은 갱신되지 않는다.

#### (2) STOMP onError → 토큰 삭제

`frontend/src/lib/websocket/useStomp.ts:133-144`

```ts
onWebSocketError: (event) => {
  // ...
  localStorage.removeItem('accessToken');
  setTimeout(() => connect(), 3000);
},
```

콜드 스타트, 네트워크 흔들림, 백엔드 일시적 hiccup 어느 것이든 `onError` 가 트리거되면 토큰을 지운다. 의도는 "토큰이 만료됐을 수도 있으니 새로 받자" 였을 것으로 [추정]. 하지만 트리거 조건이 만료 외에도 너무 많다.

#### (3) 토큰 재발급 → 새 sessionId

`frontend/src/lib/websocket/useStomp.ts:67-79`

```ts
async function ensureAccessToken() {
  let token = localStorage.getItem('accessToken');
  if (!token) {
    const res = await fetch('/api/v1/auth/guest', { method: 'POST' });
    token = (await res.json()).accessToken;
    localStorage.setItem('accessToken', token);
  }
  return token;
}
```

토큰이 없으면 `/api/v1/auth/guest` 를 호출. 백엔드는 새 게스트를 발급하므로 **sessionId 가 다른 새 토큰**을 준다.

#### (4) 게스트 displayId = sessionId

`backend/src/main/java/com/maeum/gohyang/global/security/AuthenticatedUser.java:41-46`

```java
public String displayId() {
    if (userId != null) {
        return MEMBER_PREFIX + userId;            // MEMBER: user-{userId} (영속)
    }
    return sessionId != null ? sessionId : GUEST_FALLBACK;
    // GUEST: sessionId 그대로 (토큰마다 다름)
}
```

핵심 코드. **회원은 userId 가 영속 식별자라 토큰을 새로 받아도 displayId 가 같다. 게스트는 영속 식별자가 없어서 sessionId 가 displayId 가 되고, 토큰이 새로 발급되면 displayId 도 같이 바뀐다.**

#### (5) 자기 broadcast 가 자기에게 도달

새 토큰으로 재연결 후 `sendPosition(x, y)` 가 호출되면 서버는 새 토큰의 `displayId() = guest-BBB` 로 broadcast. 자기 자신도 이 broadcast 를 받는다.

#### (6) 자기 무시 비교 실패

`frontend/src/game/scenes/VillageScene.ts:485-502`

```ts
private handleRemotePosition(pos: { id: string; x: number; y: number }) {
  if (pos.id === this.myDisplayId) return;   // ← 자기 무시
  // 그 외엔 addOtherPlayer / updateOtherPlayer
}
```

비교 결과: `'guest-BBB' === 'guest-AAA'` → false → 자기 무시 실패 → `addOtherPlayer()` 가 호출되고, 자기 좌표가 새 캐릭터로 추가된다.

#### (7) 매 프레임 자기 좌표가 broadcast 되므로 따라다님

플레이어가 움직이면 `sendPosition` 이 매 프레임(또는 throttle 간격) 호출. 모든 broadcast 가 `guest-BBB` 로 들어오고, 자기 무시는 계속 실패. 결과적으로 그 "손님" 캐릭터의 `targetX/targetY` 가 본인 좌표로 매번 갱신 → **본인을 그대로 따라다니는 유령 완성**.

### 2.3 다른 클라이언트 화면에서는?

같은 메커니즘의 다른 측면이 보인다:

- 이전 세션의 `guest-AAA` 캐릭터가 잠깐 남아 있다가 30초 후 `sweepStalePlayers` 로 사라짐 (정지 상태)
- 새 세션의 `guest-BBB` 캐릭터가 정상 동작

즉 **본인 화면에서는 "따라다니는 유령"** 으로, **다른 사람 화면에서는 "정지된 잔존 캐릭터"** 로 같은 사건이 두 가지 모습으로 보인다. issue 보고자가 "본인을 따라다닌다" 를 강조한 이유 = 본인 시점의 증상이 가장 직관적이라서.

---

## 3. issue 본문 의심 vs 진짜 원인 — 왜 다른가

| | issue 본문 의심 | 코드 워크스루 결과 |
|--|---|---|
| 영역 | 백엔드 presence cleanup | 프론트엔드 자기인식 (myDisplayId stale) |
| 동작 가설 | "서버가 LEAVE 를 못/늦게 보낸다" | "클라이언트가 자기 자신을 다른 사람으로 본다" |
| 트리거 | 사용자가 떠남 (close/disconnect) | 사용자가 입장한 직후 STOMP onError → 토큰 재발급 |
| 잔존 시간 | 영구 (서버가 모르므로) | 본인 화면: 영구 / 다른 화면: 30초 |
| 누구한테 보이는가 | 떠난 사람 외 모두 | 본인+다른 사람 모두에게 보이지만 모습이 다름 |
| 핵심 식별 단서 | (없음) | "본인을 따라다닌다" — 좌표 broadcast 가 계속 들어옴 |

### 3.1 왜 의심이 빗나갔는가

issue 보고자가 백엔드를 의심한 건 자연스럽다. "캐릭터가 안 사라진다" 는 표면적으로 cleanup 문제처럼 보이고, presence 시스템에서 잔존(ghost) 은 거의 항상 cleanup 누락이다. 그런데 **본 케이스의 본질은 cleanup 이 아니라 "한 사람이 다른 사람으로 인식됨"** 이다. 식별자가 어긋나는 순간 cleanup 은 정상 동작해도 잔존이 발생할 수 있다 — 사라지긴 하지만 30초가 걸리고, 그 사이에 새 식별자로 또 추가된다.

### 3.2 콜드 스타트에서 가장 잘 터지는 이유

콜드 스타트 = 페이지 첫 진입. 백엔드도 idle 상태일 수 있고, SockJS handshake 가 timeout 되거나 처음 한 번은 실패하기 쉬움. 그러면 onError → 토큰 삭제 → 재연결 → 새 sessionId 시퀀스가 즉시 발생. **첫 입장에서 가장 흔한 경로** 가 곧 유령 발생 경로다.

### 3.3 회원 사용자에겐 안 터지는 이유

`displayId() = MEMBER_PREFIX + userId` 라서 토큰을 100번 새로 받아도 `displayId` 는 `user-42` 그대로. 자기 무시 비교가 안 깨진다. **이 이슈는 게스트 한정 버그**. 운영 환경에 게스트 진입이 많을수록 빈도 증가.

---

## 4. 보조 원인 — 무관하진 않지만 본 이슈의 메인은 아닌 것들

### 4.1 탭 강제 종료 시 STOMP DISCONNECT 지연

브라우저 탭을 X 로 닫으면 SockJS heartbeat timeout 까지 (보통 25~60초) `SessionDisconnectEvent` 가 백엔드에 도달하지 않는다. 그 사이 LEAVE broadcast 가 안 나가고, 다른 클라이언트는 떠난 사람을 30초까지 본다.

이건 별도 보조 원인이고, **`PositionDisconnectListener` 자체는 정상 동작 — 이벤트가 늦게 올 뿐**이다. 진짜 fix 는 클라이언트 측에서 `beforeunload` 로 graceful disconnect 시도하는 쪽에 있음.

### 4.2 백엔드 위치 데이터 비영속

`PositionHandler` 가 단순 broadcast 만 한다. 서버측 SessionRegistry 나 플레이어 위치 캐시 없음. 이로 인해:

- 새 클라이언트가 입장해도 다른 사람이 좌표 broadcast 를 보낼 때까지 누가 어디 있는지 알 수 없음
- 떠난 사람의 마지막 좌표를 서버가 모르므로 LEAVE 시 좌표 정보 없이 id 만 broadcast

이건 **본 트랙(ghost-session) 범위 밖**이고 `ws-redis` 트랙의 SessionRegistry 영역이다. 본 노트에선 인지만 하고 fix 대상에 넣지 않는다.

---

## 5. 비슷한 패턴 — 시야 확장

### 5.1 JWT sub claim 으로 식별하는 시스템에서 토큰 갱신 시 식별자가 바뀌는 함정

본 이슈의 일반화: **"세션·토큰 ID 를 비즈니스 식별자로 쓰면 토큰 라이프사이클이 비즈니스 식별자 라이프사이클을 흔든다."**

같은 함정의 다른 사례:

- OAuth refresh 후 sub claim 이 바뀌는 IdP (드물지만 일부 IdP 가 그렇게 동작)
- 익명 사용자 추적용 분석 ID 를 쿠키 만료 때마다 새로 발급 — 같은 사람이 매번 새 사용자로 카운트
- 결제 세션 ID 를 결제 단계마다 갱신했더니 멱등키가 깨짐
- WebSocket 연결마다 connectionId 를 비즈니스 ID 로 쓰면, reconnect 마다 "다른 사람" 이 됨

**룰**: 토큰/세션 ID 는 인증·인증 라이프사이클에만 쓰고, 비즈니스 영속 식별자는 따로 둔다. 익명 사용자도 LocalStorage / 쿠키 / 백엔드 익명 user 레코드 등으로 영속 ID 를 부여해야 한다.

### 5.2 WebSocket "자기 무시" 로직이 stale 상태에서 깨지는 패턴

거의 모든 실시간 시스템에 자기 무시(self-echo suppression) 로직이 있다 — Slack, Discord, Figma, Excalidraw 등. 자기가 보낸 게 자기에게 돌아오는 걸 차단하기 위함.

이 로직은 두 가지 가정에 의존한다:

1. "내가 누구인지" 가 클라이언트 측에서 정확히 알려져 있다
2. 그 식별자가 서버가 broadcast 에 박는 식별자와 동일하다

둘 중 하나만 깨져도 자기 무시 실패. 본 이슈는 1번 가정이 깨진 케이스.

같은 패턴의 다른 사례:

- Figma 가 multiplayer 커서에서 자기 커서를 또 그리는 회귀 — 클라이언트가 자기 userId 캐시를 늦게 동기화한 버그였음 [추정, 정확한 PR 추적 어려움]
- Slack 메시지가 자기에게 두 번 보이는 회귀 — local optimistic 메시지 + echo 메시지의 ID 매칭 실패

**룰**: 자기 무시 로직 옆에는 **"내 식별자가 서버 broadcast 와 동일한지 검증하는 디버그 로그"** 를 항상 둔다. 식별자가 어긋나면 즉시 경고 띄울 수 있도록.

### 5.3 onError 의 트리거 조건이 너무 넓은 패턴

`onError` 라는 콜백 이름은 "심각한 에러" 같지만, STOMP/SockJS 에서는 다음을 모두 포함:

- 일시적 네트워크 끊김
- 서버 일시적 응답 지연 (handshake timeout)
- 페이지 visibility 변경으로 인한 hiccup
- 토큰 만료
- 인증 실패

이 중 "토큰 만료" 만 토큰 재발급의 정당한 사유다. 나머지는 단순 재연결로 충분. **에러 종류 구분 없이 토큰을 지우는 건 정상 토큰을 매번 폐기하는 결과**가 된다.

같은 패턴의 다른 사례:

- HTTP 401 만 토큰 갱신해야 하는데 5xx 도 갱신하는 인터셉터
- gRPC UNAUTHENTICATED 만 갱신해야 하는데 UNAVAILABLE 도 갱신
- DB connection pool 의 retry 가 모든 SQLException 을 재시도로 처리

**룰**: 자동 복구 로직은 **에러 종류를 분류**하고, 종류별로 다른 처리를 한다. "에러면 다 같은 처리" 는 거의 항상 버그.

---

## 6. 트레이드오프 비교 — 게스트 식별자 정책

본 이슈의 근본은 "게스트의 영속 식별자가 없다" 다. 정책 옵션을 비교해 둔다.

### 6.1 옵션

| | A. 현재 (sessionId = displayId) | B. 게스트도 영속 ID 부여 (서버측 익명 user 레코드) | C. 클라이언트 LocalStorage 에 게스트 ID 캐싱 |
|--|---|---|---|
| 식별자 라이프사이클 | 토큰마다 변함 | 게스트 user 레코드 생성 시 1회 발급, 영속 | 브라우저 LocalStorage 가 살아있는 동안 영속 |
| 토큰 재발급 영향 | displayId 바뀜 (현재 버그의 원인) | displayId 안 바뀜 | displayId 안 바뀜 (LocalStorage 가 살아있다면) |
| DB 부담 | 0 (게스트 레코드 없음) | 게스트당 1 row + 정리 정책 필요 (휴면 계정 cleanup) | 0 (서버측 없음) |
| 보안 | sessionId 위조 어려움 (JWT 서명) | userId 위조 어려움 (JWT 서명) | LocalStorage 는 클라이언트가 마음대로 바꿈 → 인증 토큰과 연결 필요 |
| 멀티 디바이스 | 디바이스별 다른 sessionId → 다른 사람 | 게스트 user 가 디바이스 간 공유되려면 추가 인증 필요 | LocalStorage 는 디바이스별이라 자연스럽게 디바이스 = 정체성 |
| 데이터 마이그레이션 | 회원 가입 시 게스트 데이터 → 회원 데이터 매핑이 어려움 (게스트 ID 가 매번 달라서) | 게스트 user → 회원 user 변환이 깔끔 | 게스트 ID 를 가입 폼에 붙여 보내면 매핑 가능 |
| 적합한 상황 | 게스트가 "임시 1회용" 인 서비스 | 게스트도 공간 꾸미기 등 영속 데이터를 가져야 하는 서비스 (우리 케이스) | 식별자 영속성만 필요하고 보안은 다른 토큰이 책임지는 경우 |
| 실제 사용 사례 | 단순 채팅 룸·게스트 댓글 | Notion·Figma 의 익명 사용자 (Notion 의 익명 readonly 등) | Google Analytics 의 client ID, 광고 식별자 |

### 6.2 본 트랙(ghost-session) 의 단기 처방

위 비교는 장기 결정이고, 본 트랙이 노릴 수 있는 단기 처방은 **A 안 유지 + onError 시 토큰 보존** 이다. 즉 displayId 를 바꾸지 않는 가장 작은 변경. 장기적으로 B 안(게스트 user 레코드) 으로 가는 게 맞지만 그건 별도 도메인 결정이고 본 이슈의 즉시 fix 는 아니다.

### 6.3 무엇을 잃는가

A 안 유지 시 잃는 것:
- 게스트의 데이터 영속성. 새 디바이스/브라우저 = 새 사람.
- 회원 가입 시 게스트 시절 데이터 이관 안 됨.

B 안 도입 시 잃는 것:
- 게스트 user 레코드 정리 정책 (휴면 cleanup, 봇 abuse 방지) 비용
- DB 스키마 변경 + 마이그레이션
- 익명성 약화 (서버에 더 많은 흔적)

본 트랙은 이 결정을 강제하지 않고 인풋만 제공한다. **"게스트 정체성을 어디에 둘 것인가" 는 별도 도메인 회의의 의제**.

---

## 7. Step 2 정책 결정 인풋 — 무엇을 논의해야 하는가

본 트랙의 Step 2 = 정책 합의 게이트. 다음 항목을 의제로 올린다. **결론은 Step 2 에서 사용자와 합의 후 정한다 — 본 노트에서 미리 결정하지 않는다.**

### 7.1 본 트랙(ghost-session) 의 진짜 fix 후보

1. **게스트 토큰을 onError 마다 삭제하지 않는다**
   - 토큰 만료(401) 때만 재발급, 그 외엔 단순 재연결
   - 토큰 만료 판정을 어떻게 할 것인가가 부수 의제 (서버에서 401 응답을 보고 결정 vs 클라이언트에서 exp claim 을 보고 결정)

2. **토큰이 어쩔 수 없이 갱신되면 myDisplayId 도 즉시 갱신**
   - VillageScene 이 토큰 변경을 감지하고 myDisplayId 를 다시 결정
   - 이벤트 기반 (useStomp 가 토큰 변경 이벤트 발사) vs polling 기반
   - 이미 화면에 자기 자신이 "손님" 으로 추가된 상태라면 그 손님을 정리하는 로직도 필요 (corner case)

3. **STOMP DISCONNECT 보강 — beforeunload 로 graceful disconnect**
   - 탭 종료 시 LEAVE 가 빠르게 나가도록
   - 보조 fix. 1·2 가 본 이슈의 메인.

4. **백엔드 방어선 (선택사항)**
   - 같은 sessionId 의 위치 broadcast 가 짧은 간격으로 두 번 들어오면 LEAVE 후 ENTER 로 처리하는 옵션
   - 의미: 클라이언트가 myDisplayId 갱신을 빠뜨려도 서버가 이전 정체성을 정리해주는 안전망
   - 트레이드오프: 정상 동작에 false positive 가 끼면 정상 사용자를 잠깐 끊어버릴 수 있음

### 7.2 ws-redis 트랙으로 넘길 부분

- **동일 userId 다중 세션 정책 (대체 / 거부 / 병행)**
  - 사용자가 동시에 여러 디바이스/탭에서 접속할 때
  - SessionRegistry 영역. ws-redis Step 2/3 의 의제

**중요**: 본 이슈의 진짜 유령은 다중 세션 정책 부재 때문이 아니라 **게스트 토큰이 sessionId 별로 displayId 를 바꾸기 때문**이다. 표면적으로 비슷해 보이지만 다른 문제. 두 트랙의 작업이 동시에 진행되어도 충돌하지 않도록 영역 구분을 명확히 한다.

---

## 8. 진단 과정에서 배운 것

### 8.1 "보고자 의심 → 코드 워크스루 → 진짜 원인" 의 격차

issue 본문이 의심한 영역과 실제 원인 영역이 완전히 다르면, **표면 증상 → 의심 → 가설 검증** 사이클의 의심 단계에서 한 번 더 의심해야 한다는 신호다.

본 케이스는 "캐릭터가 안 사라진다" → "cleanup 문제" 라는 자연스러운 추론이 함정이었다. 진짜 단서는 "**본인을 따라다닌다**" 라는 표현이었고, 이게 좌표 broadcast 가 계속 들어오는 시나리오를 암시했다.

**룰**: 보고된 증상 중 "이상하게 구체적인 표현" 을 그냥 넘기지 않는다. 그 안에 진짜 단서가 있다.

### 8.2 식별자가 라이프사이클을 가로지르는지 점검

새 식별자 도입 시:

- 어떤 라이프사이클(요청·세션·토큰·사용자 영속) 에 속하는가
- 그 식별자가 다른 라이프사이클의 코드에서 캐시되는가
- 캐시된 시점과 캐시된 식별자의 라이프사이클이 어긋나면 무엇이 깨지는가

본 이슈는 **세션 라이프사이클의 식별자(sessionId) 가 비즈니스 라이프사이클의 캐시(myDisplayId) 에 박힌** 케이스. 이런 결합은 진단이 어렵다 — 코드 한 곳만 봐서는 안 보이고, 라이프사이클 관계를 추적해야 보인다.

### 8.3 콜드 스타트에서만 보이는 버그의 무서움

콜드 스타트 = 첫 진입. 신규 사용자가 가장 먼저 만나는 경로. 여기서 발생하는 버그는:

- 사용자가 "이 서비스 안 되는구나" 결론을 내고 떠남
- 재현 비율이 100% 가 아니라 50% 정도면 "운 나쁘면 깨지는 서비스" 인상
- 운영자가 자기 기계로 테스트하면 (이미 토큰이 cached 라서) 절대 안 보임

**룰**: 신규 사용자 시뮬레이션을 정기적으로 한다 — 모든 토큰·캐시·세션 데이터를 지운 후 첫 진입을 해본다.

---

## 9. 나중에 돌아보면

### 9.1 이 진단이 틀렸다고 느낄 시점

- Step 2 의 fix 후 같은 증상이 다시 보고되면 — 진단의 95% 가설이 빗나갔다는 신호. 4.1 (탭 종료 STOMP 지연) 이나 4.2 (백엔드 비영속) 이 메인이었을 가능성 재검토.
- 회원 사용자에게도 같은 증상이 보고되면 — 본 진단(게스트 한정) 자체가 틀렸다는 신호. JWT refresh 동작·동시 접속 등 다른 메커니즘 조사.
- "본인을 따라다닌다" 가 아니라 "정지 상태로 계속 남아있다" 가 메인 증상이 되면 — 본 진단의 메커니즘과 다른 시나리오. 진짜 cleanup 문제일 수 있음.

### 9.2 Step 2 의 fix 가 끝난 후 이 노트가 할 일

- 후속 노트(56·57 예약) 가 생기면 본 노트에서 "그 후 이렇게 해결됨" 으로 링크
- 같은 패턴(라이프사이클 가로지르는 식별자) 회귀 방지 체크리스트가 만들어지면 본 노트 §8.2 룰을 컨벤션 문서로 승격 검토

### 9.3 스케일이 바뀌면

| 스케일 | 본 진단의 유효성 |
|---|---|
| 게스트 비중 낮음 + 회원 위주 | 본 이슈의 빈도가 자연스럽게 줄어듦. 단, 회원의 토큰 refresh 시나리오에서 비슷한 메커니즘 가능성은 별도 조사 필요. |
| 게스트 비중 높음 + 동시 접속 많음 | 빈도 폭증. fix 우선순위 최상위. |
| 다중 디바이스 시나리오 등장 | ws-redis 트랙의 SessionRegistry 영역과 본 트랙이 만난다. 두 트랙의 정책 통합 필요. |
| 모바일 비중 증가 | 모바일은 백그라운드 전환·네트워크 변경이 잦아 onError 발생 빈도가 높음 → 본 이슈 빈도 증가. |

---

## 10. 더 공부할 거리

### 10.1 직접 관련 (이 프로젝트)

- [learning/15 — WebSocket + STOMP 동작 원리](./15-websocket-stomp-deep-dive.md) — STOMP 라이프사이클·DISCONNECT 이벤트의 정확한 발사 시점
- [learning/24 — STOMP JWT 인증](./24-stomp-websocket-jwt-channel-interceptor.md) — `AuthenticatedUser` 가 어떻게 만들어지는가, displayId 의 origin
- [learning/45 — Raw WebSocket + Redis Pub/Sub 재설계 설계서](./45-websocket-redis-pubsub-redesign.md) — SessionRegistry 영역의 정책 결정. ws-redis 트랙의 후속 의제와 만나는 지점
- [learning/25 — 배치 브로드캐스트 + 멀티유저 메시지 귀속](./25-batch-broadcast-multiuser-message-attribution.md) — "내 메시지" 판별의 일반론. 자기 무시 로직의 다른 사례

### 10.2 표준·공식 문서

- [STOMP 1.2 Specification — DISCONNECT frame](https://stomp.github.io/stomp-specification-1.2.html#DISCONNECT) — graceful disconnect 의 표준 동작
- [SockJS protocol — heartbeat](https://github.com/sockjs/sockjs-protocol) — heartbeat timeout 이 disconnect 감지에 미치는 영향
- [Spring Messaging — SessionDisconnectEvent](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/application-context-events.html) — Spring 의 disconnect 이벤트 발사 조건
- [MDN — beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) — 탭 종료 시 graceful disconnect 의 hook

### 10.3 비슷한 패턴의 실제 회귀 사례

- [Figma multiplayer engineering blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) — multiplayer 식별자 동기화의 일반론
- [Slack engineering — local message echo handling](https://slack.engineering/) — optimistic 메시지 + echo 메시지 매칭의 일반 패턴
- [Discord engineering — voice/presence cleanup](https://discord.com/blog/engineering) — presence cleanup 의 실전 디테일

### 10.4 식별자·라이프사이클 일반론

- ["Identity and authority in distributed systems"](https://martinfowler.com/articles/) — Fowler 류의 Identity 패턴 정리
- [OAuth 2.0 — sub claim 의 영속성 보장](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2) — JWT sub claim 의 정의와 보장 범위
- [User identification in web analytics](https://support.google.com/analytics/answer/) — GA 의 client ID 영속성 처리 (LocalStorage 사례)

### 10.5 추가로 파볼 가치

- 이 프로젝트의 게스트 가입 → 회원 전환 시 데이터 이관 시나리오. 현재는 데이터가 거의 없어서 문제 안 되지만, 공간 꾸미기 등 게스트 데이터가 늘어나면 §6 의 B 안 결정이 강제됨.
- WebSocket reconnect 시 클라이언트 측에서 자체 식별자(deviceId 같은) 를 부여하고 서버로 전달하는 패턴. 본 이슈를 디바이스 측 영속성으로 푸는 또 다른 방향.

---

## 부록 A. 진단의 핵심 코드 위치 모음

```text
[프론트엔드]
frontend/src/lib/websocket/useStomp.ts:67-79       토큰 ensure (없으면 게스트 발급)
frontend/src/lib/websocket/useStomp.ts:133-144     onError → 토큰 삭제 + 재연결
frontend/src/game/scenes/VillageScene.ts:104-109   create() — myDisplayId 결정 호출
frontend/src/game/scenes/VillageScene.ts:449-466   resolveMyDisplayId() — 1회만 호출되는 자기 식별
frontend/src/game/scenes/VillageScene.ts:485-502   handleRemotePosition + 자기 무시 비교
frontend/src/game/scenes/VillageScene.ts:543-555   sweepStalePlayers (방어선, 30초)

[백엔드]
backend/.../AuthenticatedUser.java:41-46           displayId() — 게스트 sessionId 의존
backend/.../PositionHandler.java                   비영속 broadcast 핸들러
backend/.../PositionDisconnectListener.java        STOMP DISCONNECT → LEAVE broadcast
```

## 부록 B. 진단 검증 한계

본 진단은 **코드 워크스루 + 시나리오 추론** 으로 도출됐다. 다음은 직접 재현으로 검증하지 않았다:

- 운영 환경 `ghworld.co` 에서 토큰 로깅을 켜고 실제 onError 시퀀스를 캡처
- 다중 클라이언트 동시 접속 환경에서 "본인을 따라다니는" 증상 직접 관찰
- `myDisplayId` 와 broadcast 의 `pos.id` 값을 콘솔 로그로 비교

**Step 2 진입 전 권장**: 운영 환경에서 디버그 로그를 임시로 켜서 위 3개를 실측하면 진단 신뢰도가 95% → 99% 로 올라간다. 단, 운영 환경 로그를 켜는 것 자체의 영향(개인정보·성능)을 감안.

---

> 이 노트는 ghost-session 트랙의 첫 학습 기록이다. Step 2 (정책 합의 게이트) 의 출발점이 되며, 본 노트의 §7 인풋이 합의되면 fix 가 시작된다. **본 노트는 진단 + 인풋이고, fix 는 별도 작업이다.**
