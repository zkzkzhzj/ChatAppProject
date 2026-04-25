# Track: ui-mvp-feedback

> **작업 영역**: frontend (Next.js + Phaser) UI 개선
> **시작일**: 2026-04-26
> **워크트리**: `C:/Users/zkzkz/IdeaProjects/ChatAppProject-ui`
> **브랜치**: `feat/ui`

## 0. 한 줄 요약

2026-04-17 MVP 테스트에서 수집된 UI/UX 피드백 중 F-3 (맥북 IME) · F-2 (채팅 포커스 이탈) · F-1 (모바일 터치 이동) 세 건을 해소한다. F-5 (회원가입 고도화) 는 본 트랙 범위 밖.

## 1. 배경 / 왜

- MVP 테스트 피드백은 `docs/feedback/README.md` §유저 피드백 표 참조.
- F-3 / F-2 는 **버그**라서 우선순위 HIGH — 채팅 가용성에 직접 영향.
- F-1 은 모바일 유저 진입 자체를 막는 UX 결함 — 데스크탑 우선 정책이라도 모바일에서 "최소한 캐릭터는 움직인다" 수준은 필요.
- F-4 (음성 채팅) 는 Phase 로드맵상 별도 트랙 (WebRTC) 으로 빠짐.
- F-5 (회원가입 고도화 / 닉네임) 는 사용자 결정으로 본 트랙에서 제외.

## 2. 전체 로드맵

| Step | 작업 | 상태 |
|------|------|------|
| 1 | F-3 맥북 IME 반복 입력 수정 (`compositionstart` / `compositionend` 핸들링) | 대기 |
| 2 | F-2 채팅 입력 포커스 이탈 시 입력창 유지 (말풍선만 남는 현상 해소) | 대기 |
| 3 | F-1 모바일 터치 이동 지원 (방안 A: 터치 위치로 pathfinding / 방안 B: 가상 조이스틱 — Step 진입 시 결정) | 대기 |

> 각 Step 은 별도 PR 단위. 메모리 `feedback_branch_per_pr` 정책에 따라 Step 1 머지 후 다음 Step 은 새 브랜치로 분기한다. **본 `feat/ui` 브랜치는 Step 1 (F-3) 전용.**

## 3. 현재 단계 상세 — Step 1 (F-3 맥북 IME)

### 증상
macOS + 한글 IME 조합에서 채팅 입력 중 **마지막 글자 / 단어가 중복 입력되는 현상**.

### 원인 가설
- `onChange` 또는 `onKeyDown` 핸들러가 IME 조합 중간 상태(composing)에서 호출되어 조합 중인 음절이 확정 전후에 두 번 반영.
- `compositionstart` / `compositionend` 이벤트 미처리 가능성.

### 해야 할 일
- 채팅 입력 컴포넌트 위치 확인 (frontend 측)
- 재현 시나리오 작성 (가능하면 Playwright/유닛 테스트로 회귀 방지)
- IME 조합 상태 가드 적용 — 일반적인 패턴은 `isComposing` ref 로 `compositionstart` ~ `compositionend` 구간에서 입력 확정 로직 스킵
- 한글 외에도 일본어/중국어 IME 동작 영향 없는지 검토

### 막힌 지점
- (없음 — 착수 전)

## 4. 충돌 위험 파일

| 파일 | 분류 | 메모 |
|------|------|------|
| `frontend/package.json` | Tier 1 | 새 의존성(테스트 라이브러리 등) 추가 시 다른 트랙과 충돌 가능 — 추가 전 INDEX 확인 |
| `frontend/src/**` | 트랙 전용 | UI 트랙이 메인 작업 영역. 다른 트랙은 건드리지 않음 |
| 백엔드 코드 | **건드리지 않음** | 본 트랙은 frontend 전용. 백엔드 변경 발생하면 트랙 분리 검토 |

## 5. 다음 세션 착수 전 확인 사항

- 현재 cwd 가 `ChatAppProject-ui` 워크트리인지 확인
- 브랜치가 `feat/ui` 인지 확인 (Step 1 종료 후 다음 Step 은 새 브랜치)
- `ws-redis` 트랙이 `frontend/` 영역을 건드리는지 INDEX 확인 (현재로선 건드리지 않음)
- learning 노트 작성 시 RESERVED.md 의 본 트랙 예약 번호(49, 50) 사용
