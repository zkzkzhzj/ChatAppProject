# ADR-002: GUEST 인증 패턴 선택

> 작성일: 2026-04-07
> 상태: 확정 (MVP 범위)

---

## 결정

**Pattern A — 명시적 Guest 토큰 발급** 방식을 채택한다.
클라이언트가 `/api/v1/auth/guest`를 호출하여 JWT(`role=GUEST`)를 발급받고, 이 토큰으로 모든 요청을 인증한다. GUEST는 DB 레코드를 갖지 않는다.

---

## 배경

마을 진입 → 회원가입 → NPC 채팅으로 이어지는 Happy Path에서, 비회원도 마을에 "입장"하는 경험이 필요하다. 이때 GUEST를 어떻게 처리할 것인가를 결정해야 했다.

---

## 검토한 선택지

### Pattern A — 명시적 Guest 토큰 (채택)

클라이언트가 앱 진입 시 `/guest`를 명시적으로 호출하여 토큰을 발급받는다.

```text
앱 진입 → POST /auth/guest → JWT(role=GUEST)
채팅 시도 → 서버가 role 확인 → 403 + 가입 안내
회원가입 → JWT(role=MEMBER)로 교체
로그아웃 → 토큰 삭제 → 인터셉터가 자동으로 /guest 재호출
```

**대표 사례: Firebase Anonymous Authentication**

공식 API로 존재하는 패턴이다. 익명 유저에게 UID를 발급하여 실계정과 동일한 방식으로 처리하고, 나중에 `linkWithCredential()`로 실계정과 연결(데이터 이전)할 수 있다.

장점:

- WebSocket(STOMP) 연결 시 인증 정보가 항상 존재한다. 서버가 "누가 마을에 있는지" 식별할 수 있다.
- 모든 요청 경로가 토큰 기반으로 통일된다. 인증 처리 분기가 없다.
- GUEST 행동을 추적하고 분석할 수 있다 (전환율 측정 등).
- 악성 요청에 토큰 기반 rate limiting을 적용할 수 있다.

단점:

- 클라이언트가 "토큰이 없으면 /guest를 호출한다"는 규칙을 알아야 한다.
- 로그아웃 후 재발급 흐름이 생긴다.

**클라이언트 단점 해소 방법:** 프론트엔드 HTTP 인터셉터에서 토큰 부재 시 자동으로 `/guest`를 호출하도록 구현한다. 나머지 클라이언트 코드는 이 복잡성을 알 필요가 없다.

```javascript
// 요청 인터셉터 — 클라이언트 비즈니스 로직은 이 흐름을 모른다
interceptors.request.use(async (config) => {
  const token = tokenStore.get();
  if (!token) {
    const { accessToken } = await authApi.issueGuestToken();
    tokenStore.set(accessToken);
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

---

### Pattern B — 무토큰 허용 (미채택)

Authorization 헤더 없이 요청을 보내면 서버가 자동으로 GUEST로 처리한다.

**대표 사례:** Twitter(X), YouTube, Airbnb. 로그인 없이도 공개 콘텐츠(타임라인, 영상, 숙소 목록)를 볼 수 있다. 액션(트윗, 댓글, 예약)에서만 인증을 요구한다.

미채택 이유:

- **WebSocket(STOMP) 핸드셰이크에서 인증 정보가 없으면 "누가 마을에 있는지" 서버가 알 수 없다.** 캐릭터가 마을을 돌아다니려면 서버가 그 연결의 주체를 식별해야 한다. HTTP REST와 달리 WebSocket은 stateful 연결이다.
- GUEST를 서버에서 식별하지 않으면 NPC가 반응할 상대를 특정할 수 없다.
- 이 서비스는 GUEST도 마을 공간에서 "존재감"을 가져야 하므로, 완전한 익명 처리는 맞지 않는다.

이 패턴이 적합한 서비스: 비로그인 사용자가 단순히 공개 콘텐츠를 소비하는 경우. 이 서비스처럼 공간 안에서 상호작용하는 구조가 아닐 때.

---

### Pattern C — 서버 자동 토큰 발급 (미채택)

클라이언트가 Authorization 없이 요청하면, 서버가 401과 함께 자동으로 guest 토큰을 발급한다. 클라이언트는 토큰을 저장하고 재요청한다.

미채택 이유:

- 표준이 아닌 응답 흐름이다. 클라이언트가 "401인데 토큰이 함께 온다"는 커스텀 규약을 따로 학습해야 한다.
- Pattern A + 클라이언트 인터셉터로 동일한 UX를 달성할 수 있다. 복잡성만 서버로 이전한 것이다.

---

## Firebase Anonymous Auth와의 차이

Firebase 방식과 현재 설계의 결정적 차이:

| 항목 | Firebase Anonymous Auth | 현재 설계 |
|------|------------------------|-----------|
| GUEST DB 레코드 | 있음 (UID 발급) | 없음 (JWT claim만) |
| 계정 연결(upgrade) | 지원 — 익명 데이터가 실계정으로 이전됨 | 미지원 |
| 익명 시절 대화 이력 이전 | 가능 | 불가 |

MVP 범위에서 "GUEST 세션과의 연속성은 고려하지 않는다"고 결정했다. 이유: GUEST가 했던 행동(마을 구경, 채팅 시도)을 회원가입 후 이전할 수 있는 연속성 기능은 구현 복잡도 대비 MVP 가치가 낮다. 회원가입 후 새 세션으로 시작해도 서비스 핵심 경험(마을 입장 → NPC 대화)이 손상되지 않는다.

이 결정을 번복해야 하는 시점: 유저 인터뷰 또는 데이터에서 "회원가입 전 대화를 이어서 보고 싶다"는 수요가 확인될 때. 그 시점에 GUEST에게 임시 DB row를 만들고 계정 연결 흐름을 추가한다.

---

## 결과

- 백엔드: `/api/v1/auth/guest` — JWT(`role=GUEST`) 발급. DB 접근 없음.
- 프론트엔드: HTTP 인터셉터에서 토큰 부재 시 자동 발급. 나머지 코드는 GUEST/MEMBER 구분 없이 토큰만 사용.
- WebSocket: STOMP 연결 시 Authorization 헤더 필수. GUEST 토큰도 동일하게 사용.
- 보안: `role=GUEST` 확인이 필요한 엔드포인트에서 서버가 403 + 가입 안내 반환.
