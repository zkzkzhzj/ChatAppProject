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
| 1 | F-3 맥북 IME 반복 입력 수정 (`isComposing` 가드) | ✅ 코드 완료 (실기 미검증) |
| 2 | F-2 떠난 유저의 typing 말풍선 고아 잔존 — `removeOtherPlayer` / `sweepStalePlayers` 의 bubble destroy 누락 보강 | ✅ 코드 완료 (수동 검증 대기) |
| 3 | F-1 모바일 터치 이동 지원 (방안 A: 터치 위치로 pathfinding / 방안 B: 가상 조이스틱 — Step 진입 시 결정) | 대기 |

> **본 `feat/ui` 브랜치는 F-3 + F-2 + F-1 을 묶은 단일 PR.** Step 은 작업 순서일 뿐, 머지 단위는 하나. 메모리 `feedback_branch_per_pr` 의 "PR 하나당 브랜치 하나" 규칙은 만족 (이 트랙 = 1 브랜치 = 1 PR).

## 3. 단계별 상세

### Step 1 (F-3 맥북 IME) ✅ 코드 완료, 실기 검증 미완

### 증상
macOS + 한글 IME 조합에서 채팅 입력 중 **마지막 글자 / 단어가 중복 입력되는 현상**.

### 적용한 수정 (커밋 `f8248b2`)
- `ChatInput.tsx` `handleKeyDown` 시작에 `e.nativeEvent.isComposing` 가드 — 조합 중 키 입력 모두 스킵
- `handleChange` 에 같은 가드 — 조합 중에는 setDraft 만 하고 멘션 매칭 스킵
- 회귀 테스트 3 시나리오 (`ChatInput.test.tsx`, 커밋 `2ad3376`) red → green 확인

### 검증 한계 (PR 본문에도 반영 필요)
- **macOS 실기기 부재** — 개발자가 macOS 미보유. 원 피드백 제공자(MVP 테스터)가 보고한 환경에서 직접 재현/수정 검증 불가
- **Windows 한글 IME 환경도 실측 미완** — 테스터 환경 미확보 (지금 시점)
- **신뢰 근거**: 유닛 테스트 + `KeyboardEvent.isComposing` W3C 표준 + 주요 React UI 라이브러리 동일 패턴 + early-return 만 추가한 보수적 수정
- **후속 액션**: 머지 후 원 피드백 제공자에게 macOS 환경 재검증 요청 (배포 도메인 `https://ghworld.co`)
- 자세한 분석은 `docs/learning/49-react-input-ime-handling.md` §1.3 / §6 참조

### Step 2 (F-2 떠난 유저 typing 말풍선 고아) ✅ 코드 완료, 수동 검증 대기

### 증상 (정정)
원래 피드백 표는 "포커스 이탈 시 입력창이 사라짐" 으로 적혀 있었으나, 사용자 재확인 결과 실제 현상은:
**다른 유저 A 가 채팅 입력 중 (캐릭터 위 typing dots 표시) 인 상태에서 브라우저를 그냥 닫는 등 비정상 종료할 때, 다른 클라이언트에서 A 의 캐릭터는 사라지지만 typing 말풍선은 마지막 위치에 그대로 남는 현상.**

### 원인
- `VillageScene.removeOtherPlayer` (LEAVE 이벤트 처리) 와 `sweepStalePlayers` (30초 stale 청소) 가 `entry.container.destroy()` 만 하고 `entry.bubble?.destroy()` 누락
- `bubble` 은 Phaser scene 에 별도 등록된 객체. entry Map 만 삭제해도 scene 의 bubble 객체는 살아있어 마지막 위치에 그대로 잔존

### 적용한 수정
- `VillageScene.removeOtherPlayer`: `entry.bubble?.destroy()` 추가
- `VillageScene.sweepStalePlayers`: 같은 정리 추가
- `docs/feedback/README.md` F-2 설명 정정

### 검증 한계
- Phaser scene 단위 테스트는 jsdom + Canvas/WebGL mocking 부담으로 본 트랙에서 미작성
- **수동 검증**: 두 브라우저(또는 일반 + 시크릿)로 동시 접속 → 한쪽에서 채팅 입력 중인 상태로 그냥 종료 → 다른 쪽에서 캐릭터·말풍선 모두 사라지는지 확인. macOS 불필요, Windows 만으로 가능
- 수정이 cleanup 누락 한 줄 추가만이라 회귀 위험 거의 없음

## 4. 충돌 위험 파일

| 파일 | 분류 | 메모 |
|------|------|------|
| `frontend/package.json` | Tier 1 | **ws-redis Step 6 (STOMP 제거) 가 dependencies 블록을 건드림.** 본 트랙은 devDependencies 추가(vitest 등)라 블록이 달라 git 3-way 머지가 자동 해결할 가능성 높음 |
| `frontend/package-lock.json` | Tier 1 | ws-redis 와 거의 확실히 텍스트 충돌 발생. 후순위 PR 이 main pull → `npm install` 재실행으로 lock 재생성하면 mechanical 해결 (5분 작업) |
| `frontend/src/lib/websocket/**` | 트랙 잠재 충돌 | ws-redis Step 6 가 STOMP 클라이언트 제거 시 이 영역을 건드림. 본 트랙은 가급적 이 폴더 수정 회피 (F-1·F-2·F-3 모두 chat 컴포넌트/Phaser 입력만 만지면 됨) |
| `frontend/src/components/**` | 트랙 전용 | UI 트랙이 메인 작업 영역. ws-redis 는 컴포넌트 파일은 건드리지 않을 예정 |
| 백엔드 코드 | **건드리지 않음** | 본 트랙은 frontend 전용. 백엔드 변경 발생하면 트랙 분리 검토 |

> **머지 순서 시나리오**: 본 트랙 PR 이 ws-redis Step 6 보다 먼저 머지되면 충돌 없음. ws-redis 가 먼저 머지되면 본 트랙이 main pull → `npm install` → 필요 시 코드 rebase. 양쪽 다 작업량 작음.

## 5. 다음 세션 착수 전 확인 사항

- 현재 cwd 가 `ChatAppProject-ui` 워크트리인지 확인
- 브랜치가 `feat/ui` 인지 확인 (F-3 → F-2 → F-1 모두 같은 브랜치)
- `ws-redis` 트랙 진행 상황 INDEX 확인 — Step 6 머지가 임박하면 본 트랙 진행 중에도 main pull 받아 rebase 미리 해두면 마지막 머지가 편함
- learning 노트 작성 시 RESERVED.md 의 본 트랙 예약 번호(49, 50) 사용
