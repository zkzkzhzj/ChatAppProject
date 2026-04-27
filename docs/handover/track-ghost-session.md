# Track: ghost-session

> **Issue**: [#28](https://github.com/zkzkzhzj/ChatAppProject/issues/28)
> **작업 영역**: WebSocket presence (backend `village/adapter/in/websocket/`, frontend Phaser other-player 처리)
> **시작일**: 2026-04-26
> **워크트리**: `<repo-root>/ChatAppProject-ui`
> **브랜치**: `fix/ghost-session`

## 0. 한 줄 요약

세션 종료/지연 연결 시 동일 `userId` 가 별개 player 로 broker 에 인식되어, 본인을 따라다니는 유령 캐릭터가 다른 클라이언트 화면에 남는 현상을 잡는다.

## 1. 배경 / 왜

- 이슈 #28 (운영 환경 `ghworld.co`) — 사용자 직접 보고
- 현재 presence cleanup 은 `sweepStalePlayers` 의 30초 stale 청소 + STOMP DISCONNECT 처리에 의존. **두 경로 모두 "동일 `userId` 다중 세션" 정책이 명시되어 있지 않다.**
- `ui-mvp-feedback` 트랙(F-2) 에서 typing bubble cleanup 누락분을 보강하며 유사 영역을 봤지만, **캐릭터 자체의 유령화**는 그때 범위 밖이었음
- `ws-redis` 트랙(B안 재설계, 진행 중) 이 SessionRegistry 를 신설하면서 동시 세션 정책을 이관받을 자연스러운 위치 → **두 트랙의 결정 정합성** 필요

## 2. 전체 로드맵

| Step | 작업 | 상태 |
|------|------|------|
| 1 | 재현 시나리오 정리 + 기존 disconnect/cleanup 경로 코드 워크스루 (`learning/54` — presence cleanup 진단) | ✅ 완료 |
| 2 | fix 방향 합의 (토큰 재사용·myDisplayId 갱신·beforeunload graceful disconnect) — 🔒 사용자 승인 게이트 | 진행 중 |
| 3 | 프론트엔드 fix 구현 — `useStomp.onError` 토큰 재사용 + `VillageScene.myDisplayId` 갱신 | 대기 |
| 4 | 보조 — `beforeunload` graceful disconnect 추가 (탭 종료 시 LEAVE 빠르게) | 대기 |
| 5 | 통합 검증 (멀티 탭 시나리오 + 콜드 스타트 시뮬레이션) + 운영 배포 | 대기 |

> **범위 외**: 동일 `userId` 다중 세션 정책 (대체/거부/병행) — #28 진단 결과 본 트랙의 직접 원인이 아님이 확정 (`learning/54` 참조). 별도 이슈로 분리, 향후 멀티 디바이스/멀티 탭 시나리오가 실제 문제로 보고되면 그때 트랙 시작.

## 3. 현재 단계 상세

Step 1 완료. Step 2 (fix 방향 합의 게이트) 진행 중. 본 트랙을 이어받을 다음 세션 절차:

1. 워크트리 cwd 확인 (`<repo-root>/ChatAppProject-ui` — `git worktree list` 로 실제 경로 검증)
2. 브랜치 `fix/ghost-session` 인지 확인
3. main 정합성 docs PR 머지 완료 — main pull 완료 (2026-04-27)
4. `learning/54` 진단 결과 확인 — 진짜 원인은 게스트 토큰 재발급 + `myDisplayId` stale (백엔드 cleanup 경로 정상)
5. Step 2 fix 1·2·3 합의 후 Step 3 구현 계획서 → 구현

## 4. 충돌 위험 파일

> **경로 표기 컨벤션**: 백엔드는 `backend/src/main/java/com/maeum/gohyang/` 기준 도메인 상대 경로 (축약). 프론트엔드는 repo 루트 기준 (`frontend/src/...`) 풀 경로. 풀 경로가 필요하면 백엔드 prefix 를 앞에 붙여 검색하면 된다.

| 파일 (축약/풀) | 분류 | 메모 |
|---------------|------|------|
| `frontend/src/lib/websocket/useStomp.ts` | 트랙 잠재 | **본 트랙 핵심 수정 영역** (Step 3). `ws-redis` Step 6 (STOMP 클라이언트 제거) 와 동시 수정 시 충돌 — 본 트랙이 먼저 머지되거나 ws-redis 가 STOMP 제거 시 본 fix 가 자연스레 사라지도록 협의. |
| `frontend/src/game/scenes/VillageScene.ts` | 트랙 전용 | **본 트랙 핵심 수정 영역** (Step 3). `myDisplayId` 갱신 로직 추가. UI 트랙 종료됨 — 충돌 가능성 낮음. |
| `frontend/src/lib/websocket/stompClient.ts` | 트랙 잠재 | Step 4 graceful disconnect 추가 시 만질 가능성. `ws-redis` Step 6 와 동일 협의 영역. |
| `village/adapter/in/websocket/PositionDisconnectListener.java`<br/>(`backend/src/main/java/com/maeum/gohyang/village/adapter/in/websocket/PositionDisconnectListener.java`) | 트랙 잠재 | 본 트랙은 백엔드 수정 안 함 (진단 결과 정상 동작). 참고용. |
| `communication/adapter/in/websocket/**` | 회피 | `ws-redis` Step 2~6 가 교체 중. 본 트랙 건드리지 않음. |

## 5. 다음 세션 착수 전 확인 사항

> 워크트리/브랜치/main 정합성/`ws-redis` 트랙 정책 합의 등 절차 항목은 §3 의 1~4 와 동일 — 본 트랙의 단일 진실원은 §3. 갱신은 §3 한 곳만 수정한다.

- 본 트랙 진입 전 절차: §3 의 1~5 항목 그대로 수행
- 학습 노트 번호: `RESERVED.md` 의 `ghost-session` 예약 (54 사용 완료, 56 회고용 예비). 55·57·58 은 반환됨 — 다중 세션 정책 별도 이슈에서 재예약 가능.

## 6. 보류 메모

- `ws-redis` Step 5 운영 배포가 본 트랙 수정과 동시 배포될 경우 영향 범위 협의 필요
- F-5 (회원가입 고도화) 와 분리된 별 트랙
