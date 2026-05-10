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
| **1** | **Three.js PoC** — 마을 박스 레이아웃 + 캐릭터 이동 (걷기 + 점프) + 도서관 별도 Scene 전환 + warm 라이팅 + Fog. 자산 X 기본 geometry. **멀티유저 동기화 X** | — | 🔧 PR #68 (리뷰 대응 중) | #67 | #68 |
| **1.5** | 멀티유저 위치 동기화 마이그 — 옛 Phaser `sendPosition`/`onPositionUpdate`/`onTypingUpdate` 결 Three.js 통합. Codex P1 (PR #68) 회귀 방지 | step1 | 대기 | (별도) | — |
| 2 | 환경음 통합 ⭐ — Howler.js + freesound.org (빗소리·바람·새) + Three.js `PositionalAudio` (연못·캠프파이어 결) | step1 | 대기 | (별도) | — |
| 3 | 캐릭터 3D 모델 + 4방향 walk 애니메이션 (Quaternius Ultimate Modular Men) | step1 | 대기 | (별도) | — |
| 4 | 도서관 인테리어 + 글 작성·조회·댓글 첫 시안 + AI 추천 + 백엔드 도메인 (`confession`) | step1 + 백엔드 | 대기 | (별도) | — |
| 5 | NPC 매일 안부 카드 시스템 (D6 i) — 캠프파이어 NPC 자리 결 통합 | step3, 백엔드 | 대기 | (별도) | — |
| 6 | 비동기 편지 시스템 (D6 iii) — 도서관 결과 통합 또는 별도 결 | step4 | 대기 | (별도) | — |
| 7 | 집 꾸미기 인벤토리 + 슬롯 시스템 | step1, 백엔드 | 대기 | (별도) | — |

## 3. 현재 단계 상세

### Step 1 — Three.js PoC (다음 진행)

**무엇**:
- `three` 패키지 설치 (`frontend/package.json`)
- `frontend/src/three/VillageScene.ts` — 마을 박스 레이아웃 (`Box`·`Plane`·`Sphere`·`Cylinder`)
- 마을 레이아웃 — 입구 (남, 캐릭터 spawn) → 캠프파이어 (모임 광장) → 연못 (PlaneGeometry + 거품) → 도서관 (큰 박스, 진입 트리거 타일) → 숲 외곽 wall (CylinderGeometry collision)
- 캐릭터 이동 — 걷기 (WASD) + **점프** (Space, 가벼운 깡총 높이 ≤ 1 unit) + 뛰기·달리기 X
- 도서관 진입 — 별도 Scene 전환 (`VillageScene` ↔ `LibraryScene`, React state 결로 mount/unmount, URL 안 바뀜)
- 라이팅 — `AmbientLight` (warm tone hex `#fff5e0`) + `DirectionalLight` (`#ffd9a3`, soft shadow) + `Fog` (옅게)
- 카메라 — 정적 follow (lerp 0.05~0.10), orbit 자유 회전 X
- 옛 트랙 보존분 활용 — `WelcomeOverlay.tsx` (React 페이드인) · `LICENSE.md` (자산 라이선스 인프라)

**산출물**:
- `frontend/package.json` (three 추가)
- `frontend/src/three/VillageScene.ts` (신규)
- `frontend/src/three/LibraryScene.ts` (신규, 빈 박스만)
- `frontend/src/three/character/Character.ts` (신규, 박스 결로 placeholder)
- `frontend/src/three/lighting.ts` (신규, warm 라이팅 결)
- `frontend/src/app/GameLoader.tsx` (Phaser → Three.js 마이그)

**의도적 한계**:
- 캐릭터 = 박스 + 구 placeholder (Step 3 에서 Quaternius 모델 통합)
- 도서관 인테리어 = 빈 박스 (Step 4 에서 책장·책상)
- 자산 = 0 (기본 geometry 만, Step 2 이후 점진 통합)
- 환경음 = X (Step 2 에서 통합)
- **멀티유저 위치 동기화 X** — Codex P1 리뷰 (PR #68) 결로 명시. 옛 Phaser 의 `sendPosition`/`onPositionUpdate`/`onTypingUpdate` 통합은 **Step 1.5** 별도 step 결로 분리

**spec.decisions 동기화**: D-prev 정정 + D3' (3D 무드 톤) + D4' (자산) + D10 (Scene 전환) + D11 (가드레일 6축) 직접 적용

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
