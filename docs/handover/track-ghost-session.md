# Track: ghost-session — ✅ 종료 (2026-04-27)

> **Issue**: [#28](https://github.com/zkzkzhzj/ChatAppProject/issues/28) (Closed via PR [#36](https://github.com/zkzkzhzj/ChatAppProject/pull/36))
> **작업 영역**: WebSocket presence (frontend `useStomp.ts`, `VillageScene.ts`, 백엔드 게스트 토큰 만료 분리)
> **시작일**: 2026-04-26 / **종료일**: 2026-04-27
> **결정 이력**: [learning/54](../learning/54-presence-cleanup-ghost-character-diagnosis.md)

## 0. 한 줄 요약

세션 종료/지연 연결 시 동일 `userId` 가 별개 player 로 broker 에 인식되어, 본인을 따라다니는 유령 캐릭터가 다른 클라이언트 화면에 남는 현상을 잡는다.

## 1. 배경 / 왜

- 이슈 #28 (운영 환경 `ghworld.co`) — 사용자 직접 보고
- 현재 presence cleanup 은 `sweepStalePlayers` 의 30초 stale 청소 + STOMP DISCONNECT 처리에 의존. **두 경로 모두 "동일 `userId` 다중 세션" 정책이 명시되어 있지 않다.**
- `ui-mvp-feedback` 트랙(F-2) 에서 typing bubble cleanup 누락분을 보강하며 유사 영역을 봤지만, **캐릭터 자체의 유령화**는 그때 범위 밖이었음
- `ws-redis` 트랙(B안 재설계, 진행 중) 이 SessionRegistry 를 신설하면서 동시 세션 정책을 이관받을 자연스러운 위치 → **두 트랙의 결정 정합성** 필요

## 2. 전체 로드맵 (모두 완료)

| Step | 작업 | 상태 |
|------|------|------|
| 1 | 재현 시나리오 정리 + 기존 disconnect/cleanup 경로 코드 워크스루 ([learning/54](../learning/54-presence-cleanup-ghost-character-diagnosis.md)) | ✅ |
| 2 | fix 방향 합의 (토큰 사전 만료 체크·onError role 검사·tokenBridge·beforeunload·게스트 만료시간 분리) | ✅ |
| 3 | 프론트 + 백엔드 fix 구현 — PR [#36](https://github.com/zkzkzhzj/ChatAppProject/pull/36) | ✅ |
| 4 | Codex P1 리뷰 대응 — 멤버 토큰 게스트 자동 다운그레이드 차단 | ✅ |
| 5 | 머지 + 운영 배포 | ✅ (PR #36 머지 `f74cbd2`) |

> **범위 외 (별도 의제)**:
> - **다중 세션 정책** (대체/거부/병행) — #28 진단 결과 직접 원인이 아님이 확정. 멀티 디바이스/멀티 탭 시나리오가 실제 문제로 보고되면 그때 트랙 시작.
> - **멤버 토큰 자동 갱신** (refresh token / sliding session) — 본 트랙은 멤버 만료 시 "재로그인 필요" 로 fallback. 자동 갱신 시스템은 별도 트랙.

## 3. 종료 시점 결과

- **PR**: [#36 머지 완료](https://github.com/zkzkzhzj/ChatAppProject/pull/36) (squash, `f74cbd2`)
- **변경 파일 (운영 영향)**:
  - `frontend/src/lib/auth.ts` — `isTokenExpired`, `getDisplayIdFromToken` 유틸
  - `frontend/src/lib/websocket/tokenBridge.ts` (신규) — displayId 동기화 채널
  - `frontend/src/lib/websocket/useStomp.ts` — 사전 만료 체크 + onError role 분기 + beforeunload
  - `frontend/src/game/scenes/VillageScene.ts` — tokenBridge 구독, `resolveMyDisplayId` 제거
  - `backend/.../JwtProvider.java`, `application.yml`, `application-test.yml` — 게스트 토큰 24h 분리
- **테스트**: 단위 테스트 16건 추가 (auth 12, tokenBridge 3, +회귀 보정 1) — 4 파일 21 tests passed
- **운영 검증**: 배포 후 `Invalid or expired token` 발생 빈도, 시나리오 (가)/(나) 재현 여부 모니터링 → 추후 별도 노트

## 4. 충돌 위험 파일 (종료 시점 기록)

> 종료 트랙이라 활성 트랙 협의 대상은 아님. `ws-redis` 트랙 등 후속 작업이 같은 영역을 만질 때 참고용.

| 파일 | 본 트랙이 만진 부분 |
|------|-------------------|
| `frontend/src/lib/websocket/useStomp.ts` | 사전 만료 체크 + onError role 분기 + tokenBridge emit + beforeunload. `ws-redis` Step 6 가 STOMP 클라이언트 제거 시 위 로직을 새 클라이언트에 이식 필요 |
| `frontend/src/lib/websocket/tokenBridge.ts` (신규) | `positionBridge` 패턴. 토큰 갱신 시 displayId 동기화. `ws-redis` 새 클라이언트도 동일 채널 사용 가능 |
| `frontend/src/lib/auth.ts` | `isTokenExpired`, `getDisplayIdFromToken` 추가 |
| `frontend/src/game/scenes/VillageScene.ts` | tokenBridge 구독, `resolveMyDisplayId` 제거 |
| `backend/.../JwtProvider.java`, `application.yml` | 게스트 토큰 만료시간 24h 로 분리 (`jwt.guest-token-expiry-ms`) |

## 5. 종료 후 별도 의제 (후속 트랙 후보)

- **멤버 토큰 자동 갱신** — refresh token / sliding session / WS push 갱신 패턴 비교 + 게스트 sessionId 분리 (sub 와 분리해 토큰 갱신해도 sessionId 유지). 멤버 만료 시 재로그인 UX 도 같이.
- **다중 세션 정책** — 동일 `userId` 의 멀티 디바이스/멀티 탭 동시 접속 정책 (대체/거부/병행). `ws-redis` 트랙의 SessionRegistry 와 자연스럽게 연결될 수 있음.

위 두 의제는 본 트랙 종료와 무관하게 별도 이슈로 분리 추적.
