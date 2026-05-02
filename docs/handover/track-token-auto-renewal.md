# Track: token-auto-renewal

> 작업 영역: Backend (Identity/Security) + Frontend (auth/websocket) + Infra (도메인)
> 시작일: 2026-04-30
> 재개일: 2026-05-02 (재차 보류, 같은 날)
> 상태: ⏸️ **재차 보류 (2026-05-02)** — Phase A 결정 게이트 통과, 구현계획서까지 작성 완료. UI 디자인 트랙 우선
> 이슈: #38
>
> **재개 시점 결정 보존 (2026-05-02)**:
> - 결정 게이트 1 (도메인 구조) → **(A) same-site** 채택 — `app.ghworld.co` ↔ `api.ghworld.co`
> - 결정 게이트 2 (PR 분할 vs 통합) → **단계 분할 (3 PR)** 채택 — Step 1 백엔드 / Step 2 프론트 / Step 3 게스트
>
> **재차 보류 사유 (2026-05-02)**:
> - 사용자 의도: Redis 저장소 선택의 **다중 패턴 비교 + 블로그 포스팅**까지 깊이 있게 가져가고 싶음
> - 현재 시점: UI 디자인 트랙이 더 급함 → 토큰 트랙을 시간에 쪼개 진행하면 깊이 희생
> - 구현계획서 본문은 §6 (신규 섹션) 에 보존 — 재개 시 출발점
>
> **재개 방법**: handover/INDEX.md 의 보류 표에서 활성으로 옮긴 뒤, 본 파일 §6 (구현계획서 보존본) 부터 검토. Redis 5패턴 비교 학습노트(예: #55 종합 노트) 가 선행 작업으로 들어갈 수 있음.

---

## 0. 한 줄 요약

활성 사용자의 JWT 를 자동 갱신하고 게스트 영속 식별자(`guestId`)를 토큰과 분리해 "접속 중이면 갱신, 끊어지면 만료" 의 sliding session 패턴을 도입한다. 멤버 1h 만료 시 강제 재로그인 없이 무중단 유지, 게스트는 24h 만료에도 캐릭터(displayId) 안정 보장.

## 1. 배경 / 왜

- `ghost-session` 트랙 (PR #36) 에서 게스트 토큰 만료 → 새 sessionId → 자기인식 stale 의 본질적 한계 확인 ([learning/54](../learning/54-presence-cleanup-ghost-character-diagnosis.md))
- `STOMP reconnect 핫픽스` (PR #41) + `#42 응급 UX 복구` (PR #44) 로 멤버 토큰 만료의 운영 사고는 막았으나, **1h 마다 재로그인 압박은 그대로**
- 산업 표준은 명확함 ([knowledge/realtime/token-renewal-patterns.md](../knowledge/realtime/token-renewal-patterns.md)) — access(1h) + refresh(7d, rotation) + 게스트 영속 식별자 분리
- 전제 인프라 (`infra-tls-hardening`, PR #43) 완료 — Cloudflare Full(strict), HSTS, Origin CA 다 정리됨. **Secure cookie 발급해도 평문 노출 위험 0**
- 학습노트 [65 (Cookie 깊은 다이브)](../learning/65-cookie-security-attributes-deep-dive.md) 의 옵션 A(same-site) vs B(cross-site) 결정이 본 트랙 cookie 설정에 직접 영향

---

## 2. 수행계획서 (Phase A) — 🔒 사용자 승인 대기

### 2.1 목표

| 항목 | 변경 후 |
|------|---------|
| Access token | 1h (현행 유지) — 메모리 보관 |
| Refresh token | **7d 절대 + Idle 30분** (옵션 C, idle 정의는 (나) WS 끊김 기반) — HttpOnly Secure SameSite cookie |
| 게스트 식별자 | LocalStorage `guestId` UUID + JWT `gid` claim 서명 검증 |
| WS 토큰 갱신 | 끊고 재연결 + silent refresh (Spring STOMP 자연 동작) |

### 2.2 In Scope

| 영역 | 작업 |
|------|------|
| Backend | `JwtProvider` access/refresh 분리 발급, `POST /api/v1/auth/refresh` endpoint, JWT `gid` claim 추가 + 검증, `StompAuthChannelInterceptor` `gid` 인지, refresh token 저장소(Redis), HttpOnly Secure SameSite cookie 설정, `forward-headers-strategy=framework` 검증 |
| Frontend | axios 401 interceptor → silent refresh, `useStomp` 401 → 재연결, `auth.ts` `guestId` LocalStorage 영속, `tokenBridge` 와 연계, useChatStore 의 `loginRequired` 자동 해소 |
| 운영 | Idle session 만료 트리거 (WS 끊긴 후 30분) — Redis TTL 기반 |

### 2.3 Out of Scope

- 다중 세션 정책 (대체/거부/병행) — `multi-session-policy` 후속 트랙
- 회원 OAuth (Google/카카오) — 별도 트랙
- 모바일 앱 — 프로젝트 정책상

### 2.4 ERD 영향

**없음.** Refresh token 은 Redis 에 저장:
- 키: `refresh:{tokenId}` (UUID)
- 값: `userId`, `family`, `createdAt`, `prevTokenId` (rotation 추적)
- TTL: 7d (절대 만료) — Idle 30분은 별도 sliding TTL 갱신
- 이유: stateless JWT 보다 **reuse detection** 가능 (Auth0 표준), JPA Entity 추가 부담 없음, TTL 자동 정리, 멀티 인스턴스 공유

### 2.5 핵심 트레이드오프

| 결정 | 선택 | 대안 | 이유 |
|------|------|------|------|
| Refresh token 보관 | HttpOnly Secure SameSite cookie | LocalStorage | XSS 방어. CSRF 는 SameSite + Authorization 헤더로 |
| Refresh 저장 | Redis (server-side) | Stateless JWT | reuse detection 가능 (Auth0 표준) |
| WS 토큰 갱신 | 끊고 재연결 + silent refresh | in-band STOMP push | Spring STOMP 자연 동작, 라이브러리 지원 풍부 |
| 게스트 refresh | 부여 (7d) | 미부여 | 미부여 시 24h 마다 캐릭터 변경 (ghost-session 회귀) |
| 게스트 식별 | LocalStorage `guestId` + JWT `gid` 서명 검증 | 서버 DB 게스트 테이블 | 서버 상태 없이 익명 식별, 토큰 회전과 직교 |
| Idle 정의 | (나) **WS 끊김 후 30분** | (가) 마지막 HTTP 요청 / (다) 마우스/키보드 액션 | "마을에 머물면 무중단, 떠나면 빠르게 정리" — 서비스 메시지와 일치 |
| Idle TTL 길이 | 30분 (회원·게스트 동일) | 길게 (8h) / 회원·게스트 차등 | OWASP 권장. 게스트는 LocalStorage `guestId` 로 캐릭터 영속이라 짧아도 무방 |

### 2.6 결정 게이트 (사용자 결정 필요)

#### 결정 게이트 1 — 도메인 구조

학습노트 [65 §4.7](../learning/65-cookie-security-attributes-deep-dive.md) 에서 미결:

| 옵션 | 구조 | cookie 설정 | 보안 |
|------|------|-------------|------|
| **(A)** same-site | `app.ghworld.co` ↔ `api.ghworld.co` (서브도메인 분리) | SameSite=Lax + Domain=`.ghworld.co` | 더 강함, 미래 호환성 ↑ (third-party cookie phase-out 무관) |
| **(B)** cross-site | Vercel `*.vercel.app` ↔ `api.ghworld.co` | SameSite=None + Secure 강제 + CORS credentials | 미래 위험 ↑, 다만 현재 구조 유지 가능 |

**(A) 가려면**: Vercel custom domain 설정에 `app.ghworld.co` 추가 + Cloudflare DNS 에 CNAME 등록. 추가 작업 1회성.

→ **사용자 결정 필요**

#### 결정 게이트 2 — 분할 vs 통합

| 옵션 | PR 구조 | 장점 |
|------|---------|------|
| **단계 분할** (권장) | Step 1 백엔드(refresh endpoint + cookie 발급) → Step 2 프론트(interceptor + WS 재연결) → Step 3 게스트(`gid` claim + LocalStorage `guestId`) | PR 단위 작아 리뷰·롤백 쉬움. 백엔드부터 먼저 검증 가능 |
| 풀스택 통합 | 1 PR | 한 번에 끝. 다만 PR 비대 |

→ **사용자 결정 필요**

### 2.7 리스크

- **Refresh race condition** : 멀티 탭에서 동시 refresh 요청 → 한쪽 토큰 무효화. Redis SETNX 또는 토큰 패밀리 grace period 로 처리
- **WS 재연결 시 메시지 유실** : 짧은 disconnect 동안 broadcast 누락 가능 — Phase 1 범위 한정, catch-up 은 후속 트랙
- **Idle 30분 측정의 모호함** : "WS 끊김 후 30분" 의 정확한 트리거 — 서버 측 disconnect listener 시점 + Redis TTL 갱신 정책 필요
- **CORS credentials** (옵션 B 시): 프론트 `credentials: 'include'` + 백엔드 `Access-Control-Allow-Credentials: true` + Origin 명시 (와일드카드 X)
- **자기인식 stale 회귀** : 토큰 회전 시 displayId 동기화 — `tokenBridge` (PR #36) 와 새 cookie 발급 흐름 통합 검증 필요

### 2.8 산업 사례 매핑

[knowledge/realtime/token-renewal-patterns.md](../knowledge/realtime/token-renewal-patterns.md) 참조:
- Discord/Slack/Twitch/Auth0/Channel.io 모두 access(짧음) + refresh(7~14d) + rotation
- WS 토큰 갱신은 "끊고 재연결" 이 산업 표준 (Spring STOMP 자연 동작과 일치)
- 게스트 영속 식별자 분리는 Gather/ZEP 패턴 — LocalStorage 키와 토큰 분리

---

## 3. 전체 로드맵

| Step | 내용 | 산출물 | 학습노트 | 상태 |
|------|------|--------|----------|------|
| Phase A | 수행계획서 + 결정 게이트 | 본 문서 §2 | — | ✅ 완료 (2026-05-02) |
| Phase A' | 구현계획서 + 사용자 승인 | 본 문서 §6 (예정) | — | 🔄 진행 중 |
| **Step 1** | **백엔드 — refresh endpoint + cookie 발급 + Redis 저장소 + rotation** | `JwtProvider`, `RefreshTokenStore` (Redis), `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, cookie 발급, 통합 테스트 | #62 (rotation + reuse detection) | 대기 |
| **Step 2** | **프론트 — silent refresh interceptor + WS 재연결 + 도메인 전환** | `axios` 401 interceptor, `useStomp` 401 핸들링, `withCredentials`, Vercel custom domain (`app.ghworld.co`) + Cloudflare DNS, CORS 설정 | #61 (idle 정의) · #64 (WS 토큰 갱신 패턴) | 대기 |
| **Step 3** | **게스트 — `guestId` LocalStorage 영속 + JWT `gid` claim 서명 검증** | `auth.ts` guestId 영속, `JwtProvider` `gid` claim, `StompAuthChannelInterceptor` `gid` 인지, displayId 추출 로직 정정 | #63 (게스트 영속 식별자) | 대기 |
| **Step 4** | **종합 + 트랙 종료** | 학습노트 #55 종합, 메인 handover.md / INDEX / RESERVED 정리, 메모리 갱신 | #55 (sliding session vs refresh vs WS push 종합) | 대기 |

---

## 4. 충돌 위험 파일 (Tier 1 — 다른 트랙과 공유)

`docs/conventions/parallel-work.md` §3 참조. 본 트랙이 건드릴 공유 파일:

- `backend/src/main/resources/application.yml` — `jwt.refresh-token-expiry-ms`, `idle-timeout-ms`, cookie 도메인/path/secure/sameSite
- `backend/src/main/java/com/maeum/gohyang/identity/adapter/in/security/SecurityConfig.java` — cookie 발급, CORS credentials
- `backend/src/main/java/com/maeum/gohyang/identity/adapter/in/security/JwtProvider.java` — refresh token 발급/검증, `gid` claim
- `frontend/src/lib/api/client.ts` — axios interceptor (401 silent refresh), `withCredentials`
- `frontend/src/lib/auth.ts` — guestId LocalStorage 관리, displayId 추출 로직 (`gid` claim 반영)
- `frontend/src/lib/websocket/useStomp.ts` — 401 시 재연결 (PR #44 의 `setLoginRequired` 와 통합)

> 다른 활성 트랙(`ws-redis` Step 3) 과 `useStomp.ts`·`stompClient.ts` 가 겹칠 수 있음. 동시 작업 시 머지 순서·rebase 협의 필요.

---

## 5. 다음 세션 착수 전 확인 사항

- 본 파일 §2.6 의 두 결정 게이트는 해소됨 (✅ A·단계 분할). 헤더 "재개 시점 결정 보존" 참조
- §3 전체 로드맵 채워짐 (4 Step). 헤더 "재차 보류 사유" 의 선행 작업(Redis 5패턴 비교 학습노트) 반영 후 §6 구현계획서 검토
- 학습노트 #55 종합, #61~#64 세부 — RESERVED 그대로 예약 유지 (트랙 재개 전 사용 금지)
- `infra-tls-hardening` 결과 (Cloudflare SSL, HSTS) 가 ghworld.co 에 정상 적용 중인지 확인:
  ```
  curl -I https://ghworld.co | grep -i "strict-transport"
  ```
- 다른 워크트리 `feat/ws-redis-step3` 과 `useStomp.ts`·`stompClient.ts` 충돌 여부 점검

---

## 6. 구현계획서 보존본 (2026-05-02 작성, 보류 직전)

> 사용자 승인 직전에 보류된 구현계획서. 재개 시 §2.6 결정 + 본 §6 검토 → 사용자 재승인 → Step 1 착수.

### Step 1 — 백엔드 (refresh endpoint + Redis 저장소 + rotation)

**핵심**: access(1h, 메모리) + refresh(7d 절대 + 30분 idle, Redis) 분리. rotation + reuse detection.

**신규/수정 파일**
- `backend/.../identity/domain/RefreshToken.java` (Domain VO — tokenId, family, prevTokenId, expiresAt)
- `backend/.../identity/application/port/out/RefreshTokenStorePort.java`
- `backend/.../identity/adapter/out/persistence/RedisRefreshTokenStore.java`
- `backend/.../identity/adapter/in/web/AuthController.java` — `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` 추가
- `backend/.../identity/adapter/in/web/dto/` — RefreshResponse, LogoutResponse
- `backend/.../identity/application/service/AuthService.java` — issueTokenPair, refreshTokenPair, revokeFamily
- `backend/.../identity/adapter/in/security/JwtProvider.java` — access/refresh 분리 발급, type claim
- `backend/.../identity/adapter/in/security/CookieFactory.java` — HttpOnly Secure SameSite=Lax Domain=.ghworld.co
- `backend/src/main/resources/application.yml` — `jwt.refresh.absolute-ttl=7d`, `jwt.refresh.idle-ttl=30m`, cookie 도메인/path
- 통합 테스트: `RefreshFlowIntegrationTest` (Testcontainers Redis)

**Redis 데이터 모델**
```
KEY: refresh:{tokenId}        (Hash)
  userId: {uuid}
  family: {familyId}
  prevTokenId: {tokenId|null}
  createdAt: {epoch}
TTL: idle-ttl (30분, refresh 시 갱신) — 절대만료는 family 단위로 별도 SET refresh:family:{familyId}:expiresAt 7d
```

**동시성 전략**
- **Refresh race condition** (멀티 탭 동시 401): `SET refresh:lock:{family} NX EX 5` 분산 락. 락 못 잡으면 200ms 대기 후 새 access token 재조회
- **Reuse detection**: `prevTokenId` 가 이미 사용된 토큰이면 `family` 전체 invalidate (Auth0 표준) → 강제 재로그인
- **Cookie + Redis atomic 보장 안 됨** → Redis 저장 성공 후 cookie 헤더 set 순서 고수. 실패 시 cookie 미설정 + 401 반환

**보안**
- refresh cookie: `HttpOnly; Secure; SameSite=Lax; Domain=.ghworld.co; Path=/api/v1/auth`
- Path를 `/api/v1/auth` 로 좁혀 다른 API 호출에 cookie 전송 차단

**검증 종료 조건**
- Postman 으로 login → refresh → logout 흐름 통과
- 통합 테스트: rotation 정상 / 재사용 탐지 / idle TTL 갱신 / 절대 만료 / 동시 refresh 1개만 성공

### Step 2 — 프론트 (silent refresh + WS 재연결 + 도메인 전환)

**핵심**: 401 → 자동으로 refresh → 재시도. 도메인을 `app.ghworld.co` 로 전환해 SameSite=Lax cookie 작동시킴.

**신규/수정 파일**
- `frontend/src/lib/api/client.ts` — axios response interceptor (401 → refresh → 재시도), `withCredentials: true`
- `frontend/src/lib/api/refreshLock.ts` — 동시 refresh 호출 1개로 직렬화 (Promise singleton)
- `frontend/src/lib/auth.ts` — refresh 호출 함수, access token 메모리 저장
- `frontend/src/lib/websocket/useStomp.ts` — STOMP onError 401 시 refresh → 재연결 (PR #44 `setLoginRequired` 트리거 조건 정정)
- `frontend/src/lib/stores/useChatStore.ts` — `loginRequired` 자동 해소 흐름

**인프라 (1회성)**
- Vercel: custom domain `app.ghworld.co` 추가
- Cloudflare DNS: `app.ghworld.co` CNAME → Vercel
- 백엔드 CORS: `Access-Control-Allow-Origin: https://app.ghworld.co`, `Access-Control-Allow-Credentials: true`

**동시성 전략**
- **멀티 탭 refresh polish**: 프론트 단에서 Promise singleton 으로 한 탭 내 동시 401 들이 refresh 1번만 호출. 백엔드 분산 락이 멀티 탭 보장
- **WS 재연결 폭풍**: STOMP 자동 reconnect + 401 재연결이 겹치지 않게 PR #41/#44 가드와 통합 — `disconnectStomp()` 후 명시적 connect

**검증 종료 조건**
- 채팅 중 1h 경과 → 끊김 없이 silent refresh 성공
- 멀티 탭에서 동시 401 → refresh 1번만 발화
- `app.ghworld.co` 에서 cookie 정상 발급/전송 확인

### Step 3 — 게스트 (`guestId` LocalStorage + JWT `gid` claim)

**핵심**: 캐릭터 식별을 토큰과 분리. 토큰 회전해도 displayId 안정.

**신규/수정 파일**
- `frontend/src/lib/auth.ts` — `getOrCreateGuestId()` (LocalStorage UUID), 게스트 로그인 요청 시 body 에 포함
- `backend/.../identity/adapter/in/web/AuthController.java` — `POST /api/v1/auth/guest` 가 `guestId` 받아 검증/저장
- `backend/.../identity/adapter/in/security/JwtProvider.java` — `gid` claim 추가, 게스트 토큰 검증 시 `gid` 서명 검증
- `backend/.../websocket/StompAuthChannelInterceptor.java` — `gid` claim 추출해 Principal 에 반영
- `frontend/src/lib/displayId.ts` — displayId 추출 로직: `gid` claim 우선 (멤버는 `sub`)
- 통합 테스트: 게스트 토큰 회전 시 displayId 불변 검증

**보안 — `guestId` 위조 방지**
- LocalStorage `guestId` 는 클라이언트가 임의로 만들 수 있음 → 첫 발급 시 서버가 받아서 그대로 JWT 에 박지만, JWT 서명으로 무결성 보장
- 동일 `guestId` 로 여러 디바이스 접속 → 동일 캐릭터 (게스트는 멀티세션 충돌 신경 X, ws-redis Step 5 에서 별도 정책)

**검증 종료 조건**
- 게스트 로그인 → 24h 후 토큰 만료 → refresh → displayId 동일
- LocalStorage 비우면 새 캐릭터 (의도된 동작)

### Step 4 — 종합 + 트랙 종료

- 학습노트 #55 작성 (sliding session vs refresh vs WS push 종합 비교)
- `docs/handover.md` 메인 §2/§4 에 트랙 완료 요약
- `docs/handover/INDEX.md` 활성→완료 이동
- `docs/learning/RESERVED.md` 55·61~64 사용 완료 표시
- 메모리 갱신 (`project_status`, `project_next_session`, `reference_aws_deployment` SSL 항목 갱신)

### 의존 관계

```
Step 1 (백엔드)  ─┐
                 ├─→ Step 2 (프론트 + 도메인)  ─┐
                 ┘                              ├─→ Step 4 (종합)
                  Step 3 (게스트, Step 1 endpoint 의존)  ─┘
```

### 트랙 전체 동시성/성능 핵심 정리

| 시나리오 | 전략 |
|---------|------|
| 멀티 탭 동시 refresh | 백엔드 Redis 분산 락 (`SETNX refresh:lock:{family}`) + 프론트 Promise singleton |
| Token reuse 공격 | `prevTokenId` 추적 → 재사용 탐지 시 family invalidate |
| WS keepalive ↔ idle TTL | WS 연결 시 5분마다 refresh (silent) 호출로 idle TTL 갱신 |
| Cookie + Redis atomic 불가 | Redis 선저장 → 성공 시만 cookie set, 실패 시 401 |
| 절대 만료 7d vs idle 30분 | family 단위 절대 만료 별도 키 + 매 refresh 시 둘 다 체크 |

### 재개 시 검토할 선행 작업 (보류 사유 반영)

- **Redis 저장소 5패턴 비교 학습노트** (블로그 포스팅 가능 깊이) — Redis vs PG vs JWT stateless vs in-memory vs Hazelcast/Ignite 등. 본 트랙 Step 0 으로 신설 후 본격 구현
- 학습노트 #55 (sliding session vs refresh vs WS push) 와 분리할지 통합할지 재개 시 결정
