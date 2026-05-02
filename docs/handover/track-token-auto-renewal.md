# Track: token-auto-renewal

> 작업 영역: Backend (Identity/Security) + Frontend (auth/websocket)
> 시작일: 2026-04-30
> 상태: ⏸️ 보류 (UI 디자인 트랙 후순위로 일시 보류, 2026-05-02)
> 이슈: #38
>
> **재개 방법**: handover/INDEX.md 의 보류 표에서 활성으로 옮긴 뒤, 본 파일 §2.6 의 결정 6·7 컨펌부터 진행.
> 결정 1~5 + Redis 모델 토론 + Stay signed in 토글 토론 모두 §2 에 보존.

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

> 사용자 결정 게이트 (§2.6) 통과 후 채움. 단계 분할 vs 통합 결정에 따라 Step 수 변동.

| Step | 내용 | 상태 |
|------|------|------|
| - | 수행계획서 사용자 승인 | ⏸️ 대기 |
| - | 결정 게이트 (도메인 구조 / 분할 vs 통합) | ⏸️ 대기 |
| - | 구현계획서 작성 + 사용자 승인 | ⏸️ 대기 |
| - | 단계별 구현 | ⏸️ 대기 |

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

- 본 파일 §2.6 의 두 결정 게이트가 해소됐는지 (도메인 구조 + 분할 vs 통합)
- §3 전체 로드맵이 채워졌는지 (구현계획서 단계 분할)
- 학습노트 #55, #61~#64 (RESERVED 예약됨) 가 Step 별로 어디 들어갈지 매핑
- `infra-tls-hardening` 결과 (Cloudflare SSL, HSTS) 가 ghworld.co 에 정상 적용 중인지 확인:
  ```
  curl -I https://ghworld.co | grep -i "strict-transport"
  ```
- 다른 워크트리 `feat/ws-redis-step3` 과 `useStomp.ts`·`stompClient.ts` 충돌 여부 점검
