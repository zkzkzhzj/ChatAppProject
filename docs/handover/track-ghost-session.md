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
| 1 | 재현 시나리오 정리 + 기존 disconnect/cleanup 경로 코드 워크스루 (`learning/54` — presence cleanup 진단) | 대기 |
| 2 | 동시 세션 정책 결정 (대체 / 거부 / 병행) — 🔒 사용자 승인 게이트 (`learning/55` — 정책 트레이드오프) | 대기 |
| 3 | 백엔드 수정 — disconnect 처리 강화 + 결정된 다중 세션 정책 적용 | 대기 |
| 4 | 프론트엔드 정리 — 유령 잔존 시점에 클라이언트 측 stale 식별 가능한지 검증 | 대기 |
| 5 | 통합 검증 (멀티 클라이언트 시나리오) + 운영 배포 | 대기 |

## 3. 현재 단계 상세

Step 1 시작 전. 본 트랙을 이어받을 다음 세션 절차:

1. 워크트리 cwd 확인 (`C:/Users/zkzkz/IdeaProjects/ChatAppProject-ui`)
2. 브랜치 `fix/ghost-session` 인지 확인
3. 사용자가 main 정합성 docs PR 머지 완료한 상태에서 시작 → main pull → rebase
4. `ws-redis` 트랙 진행 상황 INDEX 확인 — Step 2 백엔드 SessionRegistry 영역과 본 트랙 정책 결정이 겹친다. **두 트랙 간 정책 합의 먼저.**
5. `learning/54` 작성 (presence cleanup 경로 진단)

## 4. 충돌 위험 파일

| 파일 | 분류 | 메모 |
|------|------|------|
| `village/adapter/in/websocket/PositionDisconnectListener.java` | 트랙 잠재 | `ws-redis` Step 2/3 도 이 영역을 건드릴 가능성. 다중 세션 정책이 어느 트랙에서 들어갈지 사전 합의 필요 |
| `communication/adapter/in/websocket/**` | 트랙 잠재 | `ws-redis` Step 2~6 가 STOMP → raw WS + Redis Pub/Sub 교체 중. 본 트랙은 가급적 `village` 영역만 만지고 `communication` 은 회피 |
| `frontend/src/components/village/**` | 트랙 전용 | UI 트랙이 이전에도 만진 영역. 다른 트랙 동시 수정 가능성 낮음 |
| `frontend/src/lib/websocket/**` | 트랙 잠재 | `ws-redis` Step 6 (STOMP 클라이언트 제거) 와 동시 수정 시 충돌. 본 트랙은 client 코드 수정 회피 권장 |

## 5. 다음 세션 착수 전 확인 사항

- 워크트리 cwd 가 `ChatAppProject-ui` 인지 확인
- 브랜치 `fix/ghost-session` 인지 확인
- 사용자 docs 정합성 머지 완료 여부 (확인 후 main pull → rebase)
- `ws-redis` Step 2 worktree 가 `PositionDisconnectListener` / SessionRegistry 영역을 동시 수정 중인지 확인 → 동시 수정이면 정책 결정 합의 먼저
- 학습 노트 번호: `RESERVED.md` 의 `ghost-session` 예약 (54~58) 사용

## 6. 보류 메모

- `ws-redis` Step 5 운영 배포가 본 트랙 수정과 동시 배포될 경우 영향 범위 협의 필요
- F-5 (회원가입 고도화) 와 분리된 별 트랙
