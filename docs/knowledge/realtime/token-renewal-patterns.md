# 실시간 서비스의 토큰 갱신·게스트 세션 패턴 — 산업 사례 리서치

> 작성: 2026-04-27
> 작성 의도: 마음의 고향(`ghworld.co`) 의 다음 트랙 — 활성 사용자 JWT 자동 갱신 + 게스트 sessionId 처리 정책 — 결정 인풋
> 관련 진단: `docs/learning/54-presence-cleanup-ghost-character-diagnosis.md`
> 결론은 합의 게이트(트랙 진입 시점) 에서 정한다. 본 문서는 인풋이지 결정 자체가 아니다.

---

## 0. 한 줄 요약

**산업 표준은 명확하다 — 짧은 access token (15분) + 긴 refresh token (7~14일) + 회전(rotation) + 재사용 탐지(reuse detection). 게스트의 영속 식별자는 토큰과 분리해 별도 저장. WebSocket 토큰 만료는 "재연결 + 재인증" 이 가장 단순하고 보편적이며, "메시지 안 토큰 push" 로 in-band 갱신하는 변종도 존재한다. 마음의 고향의 현재 구조(access only · 1h · 게스트=토큰sessionId) 는 산업 평균보다 훨씬 단순한 모델이고, 본 트랙에서 한두 단계만 진화시키면 게스트 유령 버그를 구조적으로 막을 수 있다.**

ZEP 의 토큰 정책은 공개 자료가 거의 없어 직접 비교는 불가. 대신 Discord, Slack, Twitch, Auth0, OWASP 등 공식 문서의 일관된 패턴을 정리하고, 본 프로젝트 적용 권장 방향을 §7 에 명시한다.

---

## 1. ZEP (zep.us) 조사 결과

### 1.1 결론 — 토큰/세션의 기술적 구현은 공개 정보 거의 없음

ZEP 의 인증·세션 관리 기술 디테일은 공식 기술 블로그·발표 자료·GitHub 등에서 거의 노출되지 않는다. 사용자 가이드 수준의 정책 정보만 있다.

### 1.2 정책 수준에서 확인된 것

| 항목 | 내용 | 출처 |
|---|---|---|
| 비로그인 게스트 정책 | 호스트가 "비로그인 사용자 입장 차단" 설정 가능. 2026년 시점에 일부 스페이스가 비로그인 입장을 막아둔 상태 | [나무위키 ZEP](https://namu.wiki/w/ZEP), [ZEP 호스트 가이드](https://blog.zep.us/user-guide-ko/%ED%98%B8%EC%8A%A4%ED%8A%B8-%EA%B0%80%EC%9D%B4%EB%93%9C/) |
| 비로그인 닉네임 입장 | 가능. 닉네임 입력 후 캐릭터 생성하여 입장 | [ZEP 공식](https://zep.us/en) |
| ZEP Script 의 player 식별자 | 스크립트 API 가 player 객체를 통해 식별자에 접근. 내부 구현은 비공개 | [ZEP Script API](https://docs-kr.zep.us/zep-script-api/zepscriptapi/scriptapp/methods) |

### 1.3 추정 (확실한 출처 없음 — 본 문서에서 의사결정 근거로 쓰지 말 것)

- ZEP 은 Naver Z + 슈퍼캣 조인트 벤처. Naver 인증 인프라(JWT 기반) 를 재사용했을 가능성이 높음. 단, 공개 출처 없음.
- 비로그인 게스트는 짧은 임시 세션(쿠키 또는 임시 JWT) 으로 처리하고 캐릭터는 영속화 안 됨이 자연스러운 구현이지만, 출처는 없음.

### 1.4 의의

**ZEP 을 직접 벤치마킹할 수 있는 1차 자료가 없다.** 따라서 본 리서치는 ZEP 모방이 아니라, 공개된 산업 표준 + 유사 서비스 패턴을 통합해 "마음의 고향에 맞는 답" 을 구성하는 방식으로 진행한다.

---

## 2. 유사 서비스 비교 — 토큰·세션 정책

WebSocket·실시간 채팅을 운영하는 주요 서비스의 공개된 정보만 정리.

| 서비스 | 인증 방식 | Access token TTL | Refresh 메커니즘 | 게스트 처리 | 출처 |
|---|---|---|---|---|---|
| **Discord (Bot/User)** | OAuth2 Bearer + Gateway IDENTIFY (opcode 2) | 명시 안 됨 (장기) | OAuth refresh token. WebSocket 끊기면 `resume_gateway_url + session_id` 로 RESUME(opcode 6) 시도 | 게스트 미지원 (계정 필수) | [Discord Gateway docs](https://docs.discord.com/developers/events/gateway), [Userdoccers Lifecycle](https://deepwiki.com/discord-userdoccers/discord-userdoccers/8.1-gateway-connection-lifecycle) |
| **Slack (OAuth)** | OAuth2 Bearer + 세션쿠키(d) | 12시간 (rotation 활성 시) | refresh token 으로 access token 교환, refresh token 도 회전 | 게스트는 워크스페이스 게스트 계정(이메일 필수) — "익명 게스트" 개념 없음 | [Slack token rotation](https://api.slack.com/authentication/rotation), [Slack changelog 2018-08](https://api.slack.com/changelog/2018-08-workspace-token-rotation) |
| **Twitch IRC/EventSub** | OAuth Bearer | 약 4h (변동) | refresh_token 으로 재발급. WebSocket 만료 시 끊고 재연결 | 비로그인 시청은 가능하나 chat 송신은 계정 필수 | [Twitch authentication](https://dev.twitch.tv/docs/authentication/), [IRC authenticate](https://dev.twitch.tv/docs/irc/authenticate-bot/) |
| **SOOP (구 AfreecaTV)** | code 발급 → token 발급(refresh_token 포함) | 명시 안 됨 | refresh_token 으로 재발급. code 1회용 | 비회원 채팅 가능 여부 미확인 | [SOOP Open API](https://openapi.afreecatv.com/apidoc), [SOOP 개발자](https://developers.afreecatv.com/) |
| **Channel.io (채널톡)** | App Secret → JWT (`x-access-token`) | 짧음 (rate limit 10/30min) | issueToken / refreshToken API. 토큰 회전 | end-user 측은 별도 SDK 가 처리 (디테일 비공개) | [채널톡 인증 및 권한](https://developers.channel.io/ko/articles/%EC%9D%B8%EC%A6%9D-%EB%B0%8F-%EA%B6%8C%ED%95%9C-e7c2fb6f) |
| **Gather.town** | 계정 + 게스트 access. 게스트 24h | 비공개 | 비공개 | 게스트 모드 지원. 단 "아바타가 다음 입장 시 저장 안 됨" 명시 — 영속 식별자 없음 | [Gather support](https://support.gather.town/hc/en-us/articles/15910371306388-Invite-and-Manage-Guests-in-Your-Office), [Gather access guide](https://www.practicingthesocial.uoguelph.ca/gather-town-access/) |
| **Figma (Multiplayer)** | OAuth2 + WebSocket session token | 비공개 | 비공개 (자세한 인증 토큰 정책 미공개) | 비공개 readonly 링크. 익명 시청만, 편집은 계정 필수 | [Figma Multiplayer blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/), [Figma Auth](https://developers.figma.com/docs/rest-api/authentication/) |
| **ZEP** | (비공개) | 비공개 | 비공개 | 호스트가 비로그인 게스트 입장 허용 여부를 설정 | [ZEP](https://zep.us/en) |

### 2.1 비교에서 보이는 패턴

1. **Access token 은 거의 항상 짧다.** Slack 12h, Twitch 4h, Auth0 권장 15~30분. **마음의 고향 현재 1h 는 짧은 편 — 정책으로는 합리적.** 단, refresh 메커니즘이 없어 1h 가 그대로 "사용자가 재로그인 압박을 받는 주기" 가 되어 있음.
2. **Refresh token + rotation 이 사실상 표준.** Slack 도 2018년 token rotation 도입, Auth0/Okta/SuperTokens 권장. 마음의 고향만 access only 라 산업 평균 한참 아래.
3. **WebSocket 만료 처리는 "재연결 + 재인증"** 이 보편. Discord 의 RESUME 처럼 in-band 재인증은 고급 기능. 마음의 고향이 RESUME 수준까지 갈 필요는 없고, "재연결 시 새 토큰 보내기" 로 충분.
4. **게스트 = 영속 ID 없음 모델이 일반적.** Gather, Twitch 시청자, Slack 의 게스트(이메일) 가 전부 비슷. **데이터를 영속화해야 하는 서비스(우리처럼 공간 꾸미기) 는 게스트 user 레코드를 별도로 두어야 함.**

---

## 3. WebSocket + JWT 토큰 만료 처리 패턴

### 3.1 세 가지 패턴 분류

| 패턴 | 설명 | 구현 복잡도 | 메시지 손실 위험 |
|---|---|---|---|
| **(a) 만료 시 끊고 재연결** | 토큰 만료를 서버가 감지하면 WebSocket close. 클라이언트는 새 토큰 받아 재연결 | 낮음 | 재연결 사이 미수신 메시지 손실 가능 (서버측 outbox 없으면) |
| **(b) In-band 토큰 갱신 (메시지로 push)** | 만료 임박 시 클라이언트가 새 토큰을 SEND/CONNECT 헤더로 보내 갱신. 연결 유지 | 중간~높음 | 거의 없음 |
| **(c) Sliding (매 메시지·heartbeat 시 갱신)** | 메시지·heartbeat 마다 서버가 토큰 만료를 갱신. 활동하면 영원히 유지 | 중간 | 없음 |

### 3.2 트레이드오프 표

| 기준 | (a) 끊고 재연결 | (b) In-band 갱신 | (c) Sliding |
|---|---|---|---|
| 구현 복잡도 | ★ (가장 단순) | ★★★ | ★★ |
| 메시지 손실 위험 | 있음 (재연결 gap) | 거의 없음 | 없음 |
| 보안 (탈취 시 노출 시간) | 짧음 (만료가 짧으면) | 짧음 | 길어질 수 있음 (계속 연장) |
| 절대 만료 정책 강제 | 자연스러움 | 별도 절대 timeout 필요 | 별도 절대 timeout 필요 |
| 모바일/약 네트워크 적합성 | 재연결 비용 발생 | 좋음 | 좋음 |
| 표준 라이브러리 지원 | 모든 라이브러리 | STOMP 1.3 AUTHENTICATE 프레임 제안 단계 | 비표준 (서버 구현 필요) |
| 실제 사용 사례 | Twitch IRC, 다수 SaaS | Discord RESUME (변종), STOMP 1.3 spec 제안 | 일부 게임 서버 (비표준) |

### 3.3 실무에서 가장 흔한 선택

[StompJS FAQ](https://stomp-js.github.io/faqs/faqs.html) 가 권장하는 패턴 — `beforeConnect` 콜백에서 매 연결 직전 fresh token 을 fetch 후 connectHeaders 갱신. 즉:

```text
1. 토큰 만료 임박 또는 만료 → 클라이언트가 silent refresh (HTTP /auth/refresh)
2. 새 access token 으로 STOMP CONNECT 헤더 갱신
3. 기존 WebSocket 은 자연 close 또는 명시 close 후 재연결
```

이게 대부분의 production STOMP 서비스의 정답이다. **(a) 패턴 + 클라이언트 측 silent refresh** 의 조합.

### 3.4 Discord 의 RESUME — 참고만, 도입은 과함

Discord 는 [resume_gateway_url + session_id 캐시 + Resume(opcode 6)](https://docs.discord.com/developers/events/gateway) 로 짧은 disconnect 후 미수신 이벤트를 replay 받는 시스템을 갖추고 있다. 마음의 고향 규모에서는 과하다 — **재연결 시 missed message replay 보다, 위치 정보 같은 ephemeral 데이터는 그냥 다시 broadcast 받으면 충분**.

### 3.5 Spring STOMP + 우리 환경 특이사항

[Spring Token Authentication](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html) 은 "ChannelInterceptor 가 CONNECT 메시지에서만 user 인증" 을 권장. 이후 메시지에서 토큰 검사를 다시 하지 않는 게 기본 동작. 즉 **Spring STOMP 는 (a) 패턴이 자연스럽고, (b)·(c) 는 별도 인터셉터 구현 필요**.

본 프로젝트가 ws-redis 트랙에서 raw WebSocket + Redis Pub/Sub 로 가면 Spring STOMP 의 제약이 풀리고 (b)·(c) 도입이 쉬워지지만, 그 트랙 안에서 별도 결정할 사안.

---

## 4. 게스트 sessionId 와 토큰 분리 패턴

### 4.1 본 프로젝트의 핵심 문제

진단 노트(`learning/54`) 에서 정리된 바: **게스트의 displayId 가 토큰 sessionId 와 동일** → 토큰이 새로 발급되면 displayId 도 바뀜 → 자기 무시 비교 깨짐 → 유령 캐릭터.

해결 방향은 "**식별자 분리** — 토큰 라이프사이클과 게스트 영속 라이프사이클을 다른 곳에 둔다."

### 4.2 분리 패턴 비교

| 패턴 | 영속 ID 저장 위치 | 회원 전환 시 데이터 이관 | 보안 신뢰도 | 도입 비용 |
|---|---|---|---|---|
| **A. LocalStorage `guestId`** | 클라이언트 LocalStorage. JWT 의 `gid` claim 으로 검증 | 가입 폼에 `guestId` 동봉 → 서버에서 매핑 | 낮음 (클라이언트가 위조 가능. JWT 가 서명으로 보강) | 낮음 |
| **B. 서버측 게스트 user 레코드** | DB 의 `guest_users` 테이블. JWT `sub` 에 영속 guest userId | 자동. 회원 전환 시 row 의 type 만 바뀜 | 높음 | 중간 (스키마 + 휴면 정리 정책) |
| **C. HttpOnly 쿠키 + 서버 세션** | 쿠키 (`guest_session_id`). 서버 Redis 세션 | 서버에서 세션 → 회원 매핑 | 높음 | 중간 |
| **D. Browser fingerprinting** | 클라이언트 fingerprint (canvas, fonts 등) | 휘발성 — 디바이스 변경 시 깨짐 | 중간 | 외부 서비스(Fingerprint.com 등) 의존 |

### 4.3 산업 사례

| 서비스 | 익명 → 가입 데이터 이관 패턴 |
|---|---|
| **Mixpanel / Segment** | `$device_id` (anonymous) + `$user_id` (authenticated) 를 동시에 이벤트에 포함. 첫 매핑 시 identity merge | [Mixpanel ID Merge](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users-original) |
| **commercetools** | 익명 세션에 cart 할당. 가입 시 cart 가 자동으로 customer 로 이전 | [commercetools guest checkout](https://docs.commercetools.com/tutorials/anonymous-session) |
| **SuperTokens** | 익명 세션은 DB 에 저장 안 함. 로그인 시 anonymous session payload 를 logged-in session 으로 transfer | [SuperTokens anonymous](https://supertokens.com/docs/post-authentication/session-management/advanced-workflows/anonymous-session) |
| **Convex** | 익명 → 인증 전환을 명시적 API 로 노출. 기존 데이터의 owner 를 갈아끼움 | [Convex anonymous via sessions](https://stack.convex.dev/anonymous-users-via-sessions) |

### 4.4 OAuth/OIDC 표준의 게스트 처리

[OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) 의 `sub` claim 은 **"안정적인(stable) 식별자"** 로 정의됨. 즉 spec 적으로 토큰을 새로 받아도 sub 는 같은 사용자에 대해 같아야 한다. **현재 마음의 고향의 게스트 토큰은 이 spec 을 어기고 있다** — 같은 디바이스에서 토큰을 새로 받으면 sub(=sessionId) 가 바뀜.

OAuth/OIDC 스펙 자체에는 "익명 사용자" 라는 명시 개념이 없다. 익명 처리는 모두 **앱 레이어의 관습**이다.

### 4.5 멀티 디바이스 시나리오

게스트 영속 ID 의 멀티 디바이스 처리는 어렵다:

- 패턴 A (LocalStorage): 디바이스마다 다른 guestId. 자연스러움.
- 패턴 B (서버 user 레코드): 디바이스 = 다른 게스트. 추가 인증 없이는 합칠 수 없음.
- 추가 인증 (이메일 OTP 등) 을 도입하면 그 순간 "회원" 의 정의가 흐려짐.

**룰**: 게스트의 디바이스 간 영속성은 포기하는 게 보통. 디바이스 = 새 게스트로 처리.

---

## 5. Refresh Token 보안 패턴

### 5.1 Refresh Token Rotation

[Auth0 Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation) 의 표준 동작:

```text
1. Access token 만료 → /auth/refresh 호출 with old refresh token
2. 서버: old refresh token 즉시 폐기 (DB 에서 invalidated 마킹)
3. 서버: 새 access token + 새 refresh token 발급
4. 클라이언트: 새 두 token 저장
```

### 5.2 Reuse Detection (재사용 탐지)

[Auth0 Refresh Token Security](https://auth0.com/blog/refresh-token-security-detecting-hijacking-and-misuse-with-auth0/) 의 동작:

```text
- 폐기된 refresh token 이 다시 사용되면 = 도난 신호
- 즉시 그 token family 전체를 invalidate
- 사용자는 재로그인 강제됨
- 도둑이 먼저 썼든 합법 사용자가 먼저 썼든 둘 다 잘림 (안전 측 fail)
```

### 5.3 저장 위치 권장 (2025 기준)

[Session Security 2025](https://www.techosquare.com/blog/session-security-in-2025-what-works-for-cookies-tokens-and-rotation), [OWASP Session Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html):

| 토큰 | 저장 위치 | 이유 |
|---|---|---|
| Access token | **메모리 (React state)** | XSS 노출 최소화. 페이지 새로고침 시 silent refresh 로 복원 |
| Refresh token | **HttpOnly + Secure + SameSite 쿠키** | XSS 로 훔칠 수 없음. CSRF 는 SameSite 와 CSRF 토큰으로 방어 |

LocalStorage 저장은 XSS 시 즉시 토큰 탈취 → 권장 안 됨. 단 **현재 마음의 고향이 LocalStorage 를 쓰고 있음 — 이 자체가 별도 위험.**

### 5.4 TTL 권장

| 토큰 | 권장 TTL | 마음의 고향 현재 |
|---|---|---|
| Access token | 15~30분 | 1h (조금 김. 짧혀도 무방) |
| Refresh token | 7~14일 | 없음 |
| Idle session (활동 없음 → 만료) | 15~30분 | 없음 |
| Absolute session (활동 무관 강제 만료) | 8h~7일 | 없음 |

### 5.5 게스트도 refresh token 줘야 하는가?

**상황에 따라 다르고, 본 프로젝트 권장은 §7 에서 다룸.**

- 줘야 한다는 입장: 게스트도 사용자 경험상 "1h 마다 다시 닉네임 입력하면 짜증" — refresh 가 있어야 자연스러움
- 안 줘도 된다는 입장: 게스트는 임시 신분이라 만료되어도 새 게스트로 생성하면 됨. 단 sessionId 가 바뀌므로 본 프로젝트의 핵심 버그가 재현됨.

해법: refresh 를 주든 안 주든, **게스트의 영속 식별자를 토큰과 분리** 하면 양쪽 다 가능.

---

## 6. 자기 무시(self-echo suppression) 의 안전망 패턴

본 프로젝트에서 진단된 핵심 메커니즘 — `myDisplayId` stale 문제.

### 6.1 일반 패턴

[Figma Multiplayer 글](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) 은 self-echo 문제를 직접 다루지는 않지만, **"클라이언트가 보낸 변경이 서버에서 broadcast 되어 자기에게 돌아올 때 ID 비교 필수"** 가 모든 multiplayer 시스템의 기본 가정으로 깔린다.

### 6.2 안전망 3종

| 안전망 | 설명 | 구현 비용 |
|---|---|---|
| **A. ID 검증 디버그 로그** | 자기 식별자가 broadcast 의 sender ID 와 매번 일치하는지 검증. 어긋나면 즉시 console.warn | 매우 낮음 |
| **B. 토큰 변경 이벤트 → myDisplayId 재계산** | useStomp 가 토큰 변경 시 이벤트 발사 → VillageScene 이 myDisplayId 갱신 | 낮음 |
| **C. 서버측 alias 매핑** | 서버가 "같은 디바이스의 이전 sessionId" 를 추적해 새 sessionId 로 broadcast 시 LEAVE(old) + ENTER(new) 도 동시 발행 | 중간~높음 |

마음의 고향 권장 — **A + B 조합**. C 는 ws-redis 트랙의 SessionRegistry 영역과 통합 검토.

---

## 7. 마음의 고향 권장 방향

> 본 §7 가 다음 트랙 의제의 출발점. 결정은 합의 게이트에서 정함. 본 절은 합리적 출발 옵션 제시.

### 7.1 결정 영역과 권장

| # | 영역 | 권장 | 근거 |
|---|---|---|---|
| **1** | **회원 토큰 갱신 메커니즘** | **(a) 패턴 — 끊고 재연결 + 클라이언트 silent refresh** | Spring STOMP 자연 동작. 라이브러리 지원 풍부. (b)·(c) 는 ROI 낮음 |
| **2** | **Refresh token 도입 여부** | **회원에 한해 도입 (rotation + reuse detection + HttpOnly 쿠키)** | 산업 표준. access 1h 만으로는 UX 떨어짐. 게스트는 후술 |
| **3** | **게스트 영속 식별자** | **패턴 A (LocalStorage `guestId`) + JWT `gid` claim 으로 서명 검증** | 도입 비용 최소. 회원 전환 시 가입 폼에 동봉. DB 변경 불필요. 단점(디바이스 간 영속성 없음) 은 게스트 본질상 수용 가능 |
| **4** | **게스트의 토큰 갱신** | **refresh token 발급. 단 1주~14일 짧게.** | guestId 가 LocalStorage 에 영속이라 토큰만 회전하면 displayId 안정. 만료 시 새 게스트로 fall-through |
| **5** | **자기인식 stale 안전망** | **§6 의 A + B 동시 도입. C 는 ws-redis 통합 검토** | 본 트랙 핵심 fix. learning/54 의 Step 2 인풋과 직결 |

### 7.2 왜 이 조합인가

1. **A 패턴(끊고 재연결)** 은 현재 코드 수정량이 가장 적음. (b)/(c) 는 Spring STOMP 의 인터셉터를 깊게 건드려야 하고, 어차피 ws-redis 트랙에서 수술실 들어가므로 본 트랙은 보존적 선택이 합리적.
2. **회원 refresh token** 은 산업 표준 갭이 가장 큰 영역. 도입 안 하면 1h 마다 재로그인 압박이 운영 환경에서 누적 불만이 됨.
3. **게스트 LocalStorage guestId** 가 가장 작은 변경으로 진단 §6 의 displayId stale 을 구조적으로 막음. JWT `gid` claim 으로 서명 검증해 위조 방어. DB 스키마 변경 안 해도 되어 백엔드 작업이 분리 가능.
4. **게스트 refresh token** 은 짧은 TTL(7일) 로 두되, 만료 시 새 guestId 발급도 허용 — 다만 그 순간이라도 토큰의 `gid` claim 은 LocalStorage 의 guestId 에 묶임을 보장해 displayId 안정성 유지.
5. **§6 A+B (ID 검증 로그 + 토큰 변경 이벤트)** 는 "디펜스 인 뎁스" — 향후 다른 경로로 stale 이 들어와도 즉시 잡힘.

### 7.3 수용한 트레이드오프

- 게스트의 디바이스 간 영속성 포기: 다른 디바이스 = 새 게스트.
- (b)/(c) in-band 갱신 포기: 재연결 gap 동안 위치 broadcast 1~2개 손실 가능. 위치 정보는 ephemeral 이라 다음 broadcast 로 복구되므로 무시 가능.
- LocalStorage `guestId` 위조 가능성: JWT `gid` claim 으로 서명 검증해 위조된 ID 로는 토큰을 못 받음. 단 LocalStorage 가 비어있으면 새 guestId 발급되어 "리셋 후 새 게스트" 가능. 이는 의도된 동작.

### 7.4 ws-redis 트랙으로 넘길 것

- **동일 user 의 다중 세션 정책 (대체/거부/병행)** — SessionRegistry 영역
- **§6 C (서버 alias 매핑)** — Redis 가 들어와야 자연스러움
- **In-band 토큰 갱신 (b/c)** — raw WebSocket 으로 가면 자유도가 늘어남

---

## 8. 미해결 / 더 조사할 가치

| 항목 | 왜 중요 | 다음 액션 |
|---|---|---|
| ZEP 의 실제 토큰 정책 | 같은 한국 메타버스 시장 직접 참조 | Naver Z 채용 공고·콘퍼런스 발표 모니터링 |
| 모바일 백그라운드 전환 시 onError 빈도 | 모바일 비중 증가 시 본 이슈 빈도 폭증 가능 | 운영 메트릭에 onError 빈도·게스트 토큰 재발급률 알림 추가 |
| Refresh token rotation 의 race condition | 한 디바이스 여러 탭에서 동시 refresh 시 한쪽이 family invalidate 당함 | grace period 또는 single-flight 패턴 검토 ([Better-Auth Issue #8512](https://github.com/better-auth/better-auth/issues/8512)) |
| 게스트의 회원 전환 데이터 이관 시나리오 | 공간 꾸미기·점수 등 게스트 데이터 영속화 시점에 강제됨 | Step 2 결정 후, 별도 트랙으로 분리 |

---

## 부록 A. 출처 모음

### 산업 표준·공식 문서
- [Auth0 — Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [Auth0 — Refresh Token Security: Detecting Hijacking](https://auth0.com/blog/refresh-token-security-detecting-hijacking-and-misuse-with-auth0/)
- [OWASP — Session Management Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) — `sub` claim 의 영속성 정의
- [OAuth 2.0 — Refresh Tokens](https://www.rfc-editor.org/rfc/rfc7519) — JWT spec
- [Session Security 2025 — Techosquare](https://www.techosquare.com/blog/session-security-in-2025-what-works-for-cookies-tokens-and-rotation)
- [OneUptime — Token Rotation Strategies 2026](https://oneuptime.com/blog/post/2026-01-30-token-rotation-strategies/view)

### 서비스 공식 문서
- [Discord Gateway documentation](https://docs.discord.com/developers/events/gateway)
- [Discord Userdoccers — Gateway Connection Lifecycle](https://deepwiki.com/discord-userdoccers/discord-userdoccers/8.1-gateway-connection-lifecycle)
- [Slack — Token Rotation](https://api.slack.com/authentication/rotation)
- [Slack changelog 2018-08 — workspace token rotation](https://api.slack.com/changelog/2018-08-workspace-token-rotation)
- [Twitch — Authentication](https://dev.twitch.tv/docs/authentication/)
- [Twitch IRC — authenticate-bot](https://dev.twitch.tv/docs/irc/authenticate-bot/)
- [Figma — How multiplayer works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Figma — Authentication](https://developers.figma.com/docs/rest-api/authentication/)
- [Gather.town — Invite and Manage Guests](https://support.gather.town/hc/en-us/articles/15910371306388-Invite-and-Manage-Guests-in-Your-Office)
- [Channel.io — 인증 및 권한](https://developers.channel.io/ko/articles/%EC%9D%B8%EC%A6%9D-%EB%B0%8F-%EA%B6%8C%ED%95%9C-e7c2fb6f)
- [SOOP/AfreecaTV — Open API](https://openapi.afreecatv.com/apidoc)
- [ZEP](https://zep.us/en) / [ZEP Script API](https://docs-kr.zep.us/zep-script-api/zepscriptapi/scriptapp/methods)

### Spring·STOMP·SockJS
- [Spring — Token Authentication for STOMP](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html)
- [Spring — STOMP Interception](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/interceptors.html)
- [StompJS Family — FAQs](https://stomp-js.github.io/faqs/faqs.html)
- [Softbinator — WebSocket auth issues with STOMP](https://blog.softbinator.com/overcome-websocket-authentication-issues-stomp/)

### 익명 세션·식별자 통합
- [Mixpanel — Identifying Users](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users-original)
- [SuperTokens — Anonymous sessions](https://supertokens.com/docs/post-authentication/session-management/advanced-workflows/anonymous-session)
- [commercetools — Guest checkout](https://docs.commercetools.com/tutorials/anonymous-session)
- [Convex — Anonymous users via sessions](https://stack.convex.dev/anonymous-users-via-sessions)

### 토큰 저장 위치 / XSS
- [LocalStorage vs HttpOnly Cookies — Wisp CMS](https://www.wisp.blog/blog/understanding-token-storage-local-storage-vs-httponly-cookies)
- [JWT Storage Security Battle — CyberSierra](https://cybersierra.co/blog/react-jwt-storage-guide/)

### 본 프로젝트 내부 참조
- `docs/learning/54-presence-cleanup-ghost-character-diagnosis.md` — 진단의 출발점
- `docs/learning/45-websocket-redis-pubsub-redesign.md` — ws-redis 트랙의 SessionRegistry 영역
- `docs/learning/24-stomp-websocket-jwt-channel-interceptor.md` — 현재 STOMP 인증 구현
- `docs/knowledge/realtime/chat.md` — 채팅 패턴 일반론
