# Track: village-3d

> 작업 영역: Frontend (Three.js 3D 마을 + 도서관 + 본질 가치 4축) + 백엔드 (도서관 confessions·comments 도메인, Step 4 이후) + 자산 큐레이션
> 시작일: 2026-05-11
> Issue: #67
> 브랜치: `feat/village-3d` (통합) / `feat/village-3d-step1-three-poc` (Step 1)
> Spec: [docs/specs/features/village-3d.md](../specs/features/village-3d.md)

## 0. 한 줄 요약

옛 트랙 `village-design-mvp` 승계. Three.js 기반 3D 안식처 마을 + 도서관 (비동기 편지·고해 통합) + 본질 가치 D6 4축 (NPC 안부·편지·환경음·안식 의식) 첫 시안. 안식처 가드레일 6축 (D11) 으로 ZEP 메타버스 회귀 차단.

## 0.5 Acceptance Criteria (이게 통과하면 트랙 종료)

> spec §6 Verification 과 1:1 매핑. 트랙 종료 시 같이 체크.

- [ ] 사용자가 마을 입장 시 안식처 결 즉시 느낌 (Step 1) — warm 라이팅 + Fog + 정적 카메라
- [ ] 안식처 가드레일 6축 (D11) 위반 X (Step 1) — 카메라·라이팅·물리·카메라워크·음향·UI 모두 코드로 강제
- [ ] 환경음 1종 이상 통합 (Step 2)
- [ ] 도서관 진입 + 글 작성·조회 + 댓글 동작 (Step 4)
- [ ] 머무는 이유 D6 4축 중 1개 이상 첫 시안 동작 (Step 2 또는 5)
- [ ] 3D 자산 라이선스 명시 (commercial use 확인) — 트랙 종료 전
- [ ] 60fps 목표 (최소 FPS ≥ 30) — Step 1 PoC 시점 측정

## 1. 배경 / 왜

- 옛 트랙 `village-design-mvp` (PR #57·#64 Step 1 만 머지, 2026-05-10 종료) 승계
- 종료 사유: 옛 spec D3 재검토 트리거 ("큐레이션 자산만으로 디자인 영혼 표현 한계") 도달 + 사용자 명시 결 (시안 1·2·3 거부 누적 → 3D 시각 욕심 결로 정정, 도피 X 분기)
- 본질 가치 D6 4축은 시각 차원 독립 (learning 72 §4) → 시각 차원 (3D) 전환과 동시에 본질 가치 1개 이상 첫 시안 박는 결
- 사용자 본인이 안식처 가드레일 6축 (D11) 동의 + 마을 레이아웃 결 박음 (입구·캠프파이어·연못·도서관 세로 구도) → 본질 결 (도피 결 X)
- 마플 커피챗 결 정합 — 트레이드오프 토론 + 시스템적 빈틈 방어 + 헥사고날·자산 모델 절대화 X (옛 D3 거부 → 6일 후 정정)

관련 문서:
- learning [72](../learning/72-phaser-to-threejs-pivot-decision.md) — 본 트랙 정정 사유
- learning [71](../learning/71-design-tone-from-self-interview.md) — 본심 워크샵 (도피 패턴 §2)
- 옛 spec [village-design-mvp.md](../specs/features/village-design-mvp.md) (closed-superseded)
- 옛 track [track-village-design-mvp.md](./track-village-design-mvp.md) (✅ 종료)

## 2. 전체 로드맵 (1 step = 1 PR — git.md §4)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| **1** | Three.js PoC — 마을 박스 레이아웃 + 캐릭터 이동 (걷기 + 점프) + 도서관 별도 Scene 전환 + warm 라이팅 + Fog. 자산 X 기본 geometry. 멀티유저 동기화 X | — | ✅ 머지 | #67 | #68 |
| **1.5** | 멀티유저 위치 동기화 마이그 — 옛 Phaser `sendPosition`/`onPositionUpdate` 결 Three.js 통합. Codex P1 (PR #68) 회귀 방지 | step1 | 🟢 작업 완료·검증 중 | #67 | (작업 중) |
| **2** | **환경음 통합** ⭐ — Howler.js + 환경음 자산 4종 (gentle-wind·crackling-fire·pond-water·forest-birds) + 위치 기반 음량 (global·point·forest-edge) + smoothing + Scene 전환 음량 fade. D6(v) 본질 가치 첫 시안. 부수 fix — dev 환경 메모리 폭주 진단 (.next 캐시 손상·Turbopack workspace root·Howler html5 pool·Three.js dispose 누락·React Strict Mode 영향) | step1 | ✅ 머지 | #67 | #69 + #78 (보강) |
| 2.5 | PositionalAudio 결 — 연못·캠프파이어 결 가까이 갈수록 음량 ↑. Three.js `PositionalAudio` + AudioListener | step2 | 대기 | (별도) | — |
| 3 | 캐릭터 3D 모델 + 4방향 walk 애니메이션 (Quaternius Ultimate Modular Men) | step1 | 대기 | (별도) | — |
| 4 | 도서관 인테리어 + 글 작성·조회·댓글 첫 시안 + AI 추천 + 백엔드 도메인 (`confession`) | step1 + 백엔드 | 대기 | (별도) | — |
| 5 | NPC 매일 안부 카드 시스템 (D6 i) — 캠프파이어 NPC 자리 결 통합 | step3, 백엔드 | 대기 | (별도) | — |
| 6 | 비동기 편지 시스템 (D6 iii) — 도서관 결과 통합 또는 별도 결 | step4 | 대기 | (별도) | — |
| 7 | 집 꾸미기 인벤토리 + 슬롯 시스템 | step1, 백엔드 | 대기 | (별도) | — |

## 3. 현재 단계 상세

### Step 1 — Three.js PoC (✅ 머지됨, PR #68)

Three.js + 마을 박스 레이아웃 (입구·캠프파이어·연못·도서관·숲 wall) + 캐릭터 (걷기·점프) + Scene 전환 + warm 라이팅 + Fog. 자산 X 기본 geometry. 멀티유저 X (Step 1.5 분리). D-prev·D3'·D4'·D10·D11 직접 적용.

### Step 2 — 환경음 통합 ⭐ (🟢 작업 완료, PR 박는 중)

**무엇** (구현됨):
- Howler.js + @types/howler 추가 (`frontend/package.json`)
- `frontend/src/three/audio/AmbientSoundManager.ts` — 4 사운드 preload + unlock + 매 프레임 위치 기반 음량 + smoothing (lerp 0.05) + Scene 전환 결 zone 변경 (`enterVillage` / `enterLibrary`)
- `frontend/src/three/audio/sound-config.ts` — 3 위치 모델 (`global` · `point` · `forest-edge`) + 마을 4 사운드 + 도서관 1 사운드 + MASTER_VOLUME
- mp3 자산 4종 — `frontend/public/assets/audio/ambient/*.mp3` (사용자 다운로드, `.gitignore` 결 D4' 정정 — binary 외부 인프라)

**부수 fix — dev 환경 메모리 폭주 진단 결**:

> 사용자 컴퓨터 2회 강종 + Node heap 폭식 신호. 시점 단서 ("Step 2 환경음 추가 후"): root cause 4축.

| 원인 | 위치 | fix |
|---|---|---|
| **.next 캐시 손상** | 디스크 254MB 캐시 | 수동 삭제 (`rd /s /q frontend\.next`) — 진짜 root cause |
| **Turbopack workspace root 오인식** | 루트 + frontend 두 lockfile | `frontend/next.config.ts` 에 `turbopack.root` 명시 |
| **Howler html5 audio pool exhausted** | React Strict Mode + dev HMR → Howl 4×2 = 풀(10) 거의 고갈 | `Howler.html5PoolSize = 30` |
| **Three.js Geometry/Material dispose 누락** | `renderer.dispose()` 만으로는 mesh 리소스 leak | `disposeScene()` 헬퍼 + `destroy()` 결 호출 |
| Howler unlock 리스너 cleanup 누락 | unmount 시 window 리스너 leak | `detachUnlockListeners()` 결 `destroy()` 통합 |
| Turbopack + howler 호환 | UMD + dynamic feature detection | `transpilePackages: ['howler']` (보험) |

**음량 디자인 (사용자 검증 통과)**:
- MASTER_VOLUME 0.5 → 1.0 (단일 곱 모델)
- gentle-wind 0.1 → 0.25 · forest-birds 0.18 → 0.25 (D11 한도 ≤ 0.3 결)
- crackling-fire 0.22 · pond-water 0.20 유지
- spec D11 §음향 음량 기준 명시 (maxVolume 기준 — Step 2 변경 이력)

**부수 deprecation 정리**:
- `THREE.PCFSoftShadowMap` → `THREE.PCFShadowMap` (three r184)
- `pendingTarget` 타입 `Active` → `'village' | 'library'` (Step 1 부터 박혀있던 type error)

**의도적 한계** (Step 1 결과 동일):
- 멀티유저 위치 동기화 X (Step 1.5)
- Three.js `PositionalAudio` 결 (Step 2.5)
- 캐릭터 3D 모델 X (Step 3)
- 도서관 인테리어 X (Step 4)

**spec.decisions 동기화**: D6(v) 본질 가치 첫 시안 실현 + D11 §음향 음량 기준 명시 (변경 이력 박힘)

### 부수 PR — 키 stuck 버그픽스 (PR #79, OPEN)

Step 2 보강 후 사용자 채팅 검증 단계에서 발견. spec: `docs/specs/features/movement-key-stuck-on-blur.md`.

WASD 누른 채 바탕화면 클릭·우클릭 메뉴·탭 전환 시 keyup 누락 → 캐릭터 계속 이동.

수정 — `frontend/src/three/input.ts`:
- `release()` 헬퍼 메서드
- `window blur` + `document visibilitychange` + `window contextmenu` 세 이벤트 → `release()`
- `e.target` 타입 가드 (`instanceof HTMLInputElement | HTMLTextAreaElement`)

단위 테스트 11/11 통과. 사용자 dev 검증 통과.

### Step 1.5 — 멀티유저 위치 동기화 (🟢 작업 완료, 검증 중)

브랜치: `feat/village-3d-step1.5-multiuser-sync` (base=`feat/village-3d`).

**무엇 (구현됨)**:
- `frontend/src/three/network/PositionSync.ts` — throttle 100ms + 위치 변화 임계값(0.01) + self filter + sender DI. `lastSentAt=NEGATIVE_INFINITY` 결로 첫 호출(now=0) throttle 차단 결 해소
- `frontend/src/three/character/RemotePlayer.ts` — 청회색 박스 placeholder + lerp 0.15 + 명시적 dispose (Step 3에서 캐릭터 모델로 교체 예정)
- `VillageScene.applyRemotePosition` / `updateRemotePlayers` / `clearRemotePlayers` — `Map<displayId, RemotePlayer>` 결로 spawn·LEAVE·purge. 백엔드 contract y → Three.js z 매핑 한 곳 (`applyRemotePosition`)
- `SceneManager` — tick에서 `sendIfChanged(p.x, p.z)` + `updateRemotePlayers()`. 도서관 진입 시 `clearRemotePlayers()` + `positionSync.reset()` (spec §2.2 Out 정합)
- `ThreeGame` — `onPositionUpdate` / `onDisplayIdChange` 구독. unmount 시 unsubscribe
- `GameLoader` — `useStomp()` 끌어올림. `ChatOverlay` 안 호출 제거 (단일 진입점)
- `tokenBridge` — `currentDisplayId` 상태 보존 + subscribe 시 현재 값 즉시 1회 호출. dynamic import 된 `ThreeGame` mount 늦은 결로 emit 놓치는 #28 회귀 (self filter 죽음 → 자기 분신 렌더) 차단

**부수 fix — 백엔드 좌표 clamp 제거 (본 워크트리에 통합)**:
- 본 트랙 브랜치 `feat/village-3d-step1.5-multiuser-sync` 안에 backend 변경 같이 묶음. 처음 ChatAppProject 워크트리 결 별도 브랜치 분기 시도 결 사용자 결 정정 — 본 워크트리 외 다른 worktree 점유 X (memory infra_worktree_state.md §main 점유 정합)
- `backend/.../PositionHandler.java` — 옛 Phaser 2D top-left origin (0,0)~(2400,1600) 결 `Math.max(0, Math.min(..., maxX))` clamp 제거. `Double.isFinite` 검증만 유지
- 트리거: dev 검증 시 "왼쪽 영역(x 음수)으로 다른 유저 placeholder 안 따라옴" — STOMP frame 본문 확인 결 SEND `{x:-6.8,...}` → MESSAGE `{x:0.0,...}` 결로 clamp 확정
- V2 (`ChatWebSocketHandler`) + `application.yml` `village.map.*` 결 = Step 6 cutover 결 결로 그대로 둠 (V1만 surgical fix, Critical Rule #10)
- backend `compileJava` 통과. 사용자 docker compose 결 backend 재빌드 필요 (`ChatAppProject-ui/deploy` 결로)

**테스트**:
- frontend 단위 테스트 64/64 (신규 PositionSync 13 + RemotePlayer 5 + tokenBridge 4 갱신 + 기존 42)
- `npm run build` 통과, lint·typecheck 통과
- 사용자 dev 검증 통과: self filter ✅, 왼쪽 영역 이동 ✅, idle visibility ✅, 도서관 진입 시 placeholder 제거 ✅, 마을 복귀 시 재동기화 ✅

**리뷰 대응 (Codex P1/P2 + CodeRabbit minor)**:
- P1 — 도서관 진입 시 다른 클라이언트에 ghost 결로 남는 회귀: backend `PositionHandler.handleLeave` 신규 endpoint(`/app/village/leave`) + frontend `sendLeaveVillage()` 결로 `SceneManager.startTransition('library')` 시 호출
- P2 — `applyRemotePosition` 가드 `active === 'library'` → `active !== 'village'`. transition 중 들어오는 broadcast 결로 offscreen 마을에 stale placeholder 박히는 회귀 차단

**의도적 한계 (Step 1.5 scope out)**:
- 점프 동기화 X — `sendPosition(x, z)` 결로 (x, ground-z) 만. Three.js y(점프 높이) broadcast X. 다음 step에서 캐릭터 모델 결과 같이
- LibraryScene 안 다른 유저 표시 X (spec §2.2 Out)

### 다음 진행 — Step "채팅 UI 재설계"

사용자 결정 (2026-05-12):
- 좌측하단 ChatOverlay UI 폐기
- 머리 위 말풍선 (3D Sprite 또는 HTML overlay)
- 채팅 내역 별도 버튼 결 패널 토글

## 4. 충돌 위험 파일

> `docs/conventions/parallel-work.md` §3 Tier 분류 참조.

- `frontend/src/styles/tokens.ts` — Tier 1 (다른 트랙 token 갱신 가능). 본 트랙 D8 As You Go 결로 추출
- `frontend/src/components/ui/` — Tier 1 (옛 트랙 `WelcomeOverlay` 결 보존, 새 컴포넌트 결 박음)
- `frontend/src/three/` — 신규 디렉토리, 본 트랙 전용
- `frontend/public/assets/village-3d/` — Tier 2 (자산 누적)
- `frontend/src/app/GameLoader.tsx` — Tier 1 (Phaser → Three.js 마이그, 다른 트랙 영향 X 한 결로 결 박음)
- `frontend/package.json` — Tier 1 (three 추가, 다른 트랙 의존성 결과 충돌 가능)

> 다른 활성 트랙 없음 (2026-05-11 기준). ws-redis Step 3 착수 시 본 트랙과 머지 순서 협의.

## 5. 다음 세션 착수 전 확인 사항

- `docs/handover/INDEX.md` 활성 트랙 확인
- 본 트랙 spec 정독 ([docs/specs/features/village-3d.md](../specs/features/village-3d.md))
- learning 72 정독 (정정 사유 + 트레이드오프 + 가드레일 6축)
- main 동기화 — 본 워크트리는 ChatAppProject-ui, main 은 별도 워크트리(ChatAppProject) 점유. `git fetch origin` + 새 브랜치 분기 시 `origin/main` 기반
- Step 1 plan 사용자 승인 → Three.js PoC 작성

## 6. 보류 메모

- AI 3D 자산 생성 (Meshy.ai · Scenario.gg) — D7 재검토 트리거 도달 시 별도 트랙
- VR / AR — 영구 보류 (데스크탑 우선)
- 모바일 최적화 — 후속 트랙 (3D 성능 결, 데스크탑 PoC 후 검토)
- Stardew 농사·호감도·결혼 메커니즘 (D5 분리) — 사용자 "심심하다" 신호 시 안식 결 유지하는 가벼운 활동 추가 검토
- 자유 카메라 회전 (orbit controls) — D11 가드레일 위반 결, 영구 보류
- Phaser 2D 코드 보존분 — `WelcomeOverlay` (React, 보존) + `LICENSE.md` (보존) + `globals.css` 17색 디자인 토큰 (보존). 그 외 `VillageScene.ts` (Phaser) · `config.ts` 는 옛 트랙 종료 PR 결로 폐기됨, Step 1 에서 Three.js 결로 신규 작성
