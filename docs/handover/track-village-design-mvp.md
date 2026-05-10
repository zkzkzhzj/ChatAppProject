# Track: village-design-mvp

> ✅ **종료 (2026-05-10)** — Phaser 2D 큐레이션 자산 한계 인정. **새 트랙 [`village-3d`](./track-village-3d.md) 로 본질 가치 (D1 안식처 · D2 Alone Together · D6 4축) 승계.** Step 1 (PR #57·#64) 만 머지, Step 2~9 미수행 (트랙 결정 변경 결로 미충족 종료). 정정 사유: [learning 72](../learning/72-phaser-to-threejs-pivot-decision.md).
>
> 작업 영역: Frontend (UI/UX, Phaser 마을, 디자인 시스템) + 자산 큐레이션 + Claude UI 코드
> 시작일: 2026-05-04 / 종료일: 2026-05-10
> Issue: #56
> 브랜치: `feat/village-design-mvp-step1-village-entry` (Step 1, 머지) · `feat/village-design-mvp-step2-tilemap` (Step 2, 미커밋 폐기)
> Spec: [docs/specs/features/village-design-mvp.md](../specs/features/village-design-mvp.md) (status: closed-superseded)

## 0. 한 줄 요약

마음의 고향 마을 디자인 MVP — Stardew Valley 결 따뜻한 픽셀 톤 + "Alone Together — 같이 있되 말 안 해도 되는 마을" 차별점 + 머무는 이유 4축 첫 시안.

## 0.5 Acceptance Criteria (트랙 결정 변경 결로 미충족 종료)

> spec §6 Verification 과 1:1 매핑. **6개 모두 미통과** — 트랙 결정 변경 결로 종료. 미충족 항목 결 (i)·(ii)·(iv)·(v) 는 새 트랙 [`village-3d`](./track-village-3d.md) 로 승계, (iii) UI 컴포넌트 키트는 사용처 등장 시 점진 박음 결, (vi) 자산 라이선스 결은 Step 1 (`LICENSE.md`) 만 보존.

- [ ] 사용자가 마을 입장 시 Stardew 결 따뜻한 톤 즉시 느낌 (Step 1) — ❌ Welcome 모션 박음 but 마을 톤 시안 1·2·3 모두 거부 → village-3d 결로 시각 차원 전환 승계
- [ ] 디자인 시스템 토큰화 완료 (컬러·타이포·스페이싱) (Step 1) — △ 기존 globals.css 17색 점검만, 신규 추출 X
- [ ] UI 컴포넌트 키트 5종 이상 (Button / Card / Modal / Toast / Input) — ❌ 미수행 (D8 As You Go 결로 사용처 등장 시 결, village-3d 트랙으로 결 이전)
- [ ] 환경음 1종 이상 통합 (Step 9) — ❌ 미수행, village-3d 결로 승계 (D6 4축 본질 가치)
- [ ] 머무는 이유 4축 중 1개 이상 첫 시안 동작 (Step 4 또는 5) — ❌ 미수행, village-3d 결로 승계
- [x] 자산 라이선스 명시 (commercial use 확인) — Step 1 PR #57·#64 결로 `LICENSE.md` 박음 ✅ (Kenney CC0 + LimeZu CC BY 4.0)

## 1. 배경 / 왜

- 디자인 막막함 + 컨셉 흔들림을 본심 워크샵 (자기 인터뷰 4단계) 으로 정직하게 해소 ([learning 71](../learning/71-design-tone-from-self-interview.md))
- 활동 방 컨셉 피벗 시도 → 사용자 본인이 "도피" 인정 → 영구 보류
- 마음의 고향 §2 안식처 컨셉 확정 + Alone Together 학술 개념으로 차별점 명료화
- token-auto-renewal 트랙 (#38, closed) 보류 후 본 트랙 우선

## 2. 전체 로드맵 (1 step = 1 PR)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| **1** | **자산 토대 + Welcome 모션 + 디자인 시스템 점검** — `.gitignore` 정정, LICENSE.md, WelcomeOverlay (페이드인), GameLoader 갱신, 기존 토큰 점검 | — | 🔧 진행 중 | #56 | (작업 시) |
| **2** | **VillageScene Tilemap 토대** — 기존 `drawGround` 폐기 + Kenney Tiny Town tilemap 통합 | step1 | 대기 | (별도) | — |
| **3** | **LimeZu Serene Village 마을 본격 풍경** — 24종 집 + 자연 모티브 | step2, LimeZu 자산 | 대기 | (별도) | — |
| **4** | **캐릭터 스프라이트 (Kenney RPG Urban Pack)** — 원형 placeholder 교체 + 4방향 walk | step2 | 대기 | (별도) | — |
| 5 | 채팅 UI 리디자인 + 디자인 토큰 확장 | step1 | 대기 | (별도) | — |
| 6 | 집 꾸미기 인벤토리 + 슬롯 시스템 첫 시안 (가구 자산 결정 포함) | step1 | 대기 | (별도) | — |
| 7 | NPC 매일 안부 카드 시스템 첫 시안 | step4 | 대기 | (별도) | — |
| 8 | 비동기 편지·흔적 시스템 첫 시안 | step1·step6 | 대기 | (별도) | — |
| 9 | 환경음·BGM 통합 | step1 | 대기 | (별도) | — |

## 3. 현재 단계 상세

### Step 1 — 자산 토대 + Welcome 모션 + 디자인 시스템 점검

**무엇**:
- `.gitignore` 정정 — `frontend/public/assets/` 전체 ignore → redistribute 금지 자산만 ignore (LimeZu Modern Interiors Free)
- `frontend/public/assets/village/LICENSE.md` 작성 — Kenney CC0 + LimeZu Serene Village CC BY 4.0 attribution
- Kenney Tiny Town + RPG Urban Pack 자산 배치 (이미 다운로드 완료, 자동)
- `frontend/src/components/ui/WelcomeOverlay.tsx` 신규 — 첫 진입 시 페이드인 (2초 visible + 0.8초 fade)
- `frontend/src/app/GameLoader.tsx` 갱신 — WelcomeOverlay 추가
- 기존 `globals.css` 17색 팔레트 점검 (이미 마음의 고향 따뜻한 안식처 톤이라 정합 ◎)

**산출물**:
- `.gitignore` (정정)
- `frontend/public/assets/village/LICENSE.md` (신규)
- `frontend/public/assets/village/kenney/tiny-town/` (자산 폴더, 132 tiles)
- `frontend/public/assets/village/kenney/rpg-urban-pack/` (자산 폴더, 486 tiles)
- `frontend/src/components/ui/WelcomeOverlay.tsx` (신규)
- `frontend/src/app/GameLoader.tsx` (갱신)
- spec D4 + tasks 9-step 갱신

**Step 1 의 의도적 한계**:
- VillageScene 코드 변경 X — Step 2 에서 본격 갱신
- 자산 파일은 받았지만 Phaser 통합은 Step 2 에서
- 토큰 신규 추출 X — 기존 globals.css 가 이미 따뜻한 안식처 톤 정합

**spec.decisions 동기화**: D4 (Commercial-safe + GitHub-publishable 큐레이션) · D8 (As You Go) 직접 적용

### Step 2 — VillageScene Tilemap 토대 (진행 중)

**현재 상태** (2026-05-05 시각 검증):
- Cozy Asset Pack individual Slice 통합 완료 — 풀밭 (Slice 5) / 집 (Slice 128) / 나무 (Slice 76 가설) / 캐릭터 4종 (Slice 129~132)
- VillageScene `createVillageBackground()` 풀밭 grid + 집 1채 + 나무 16곳 배치 코드 작성됨
- Playwright MCP 시각 검증 결과 (`village-step2-current.png`):
  - ✅ 캐릭터 ('나') · NPC ('마을 주민') · 집 (붉은 지붕) — 따뜻한 픽셀 결 정합 ◎
  - ❌ **풀밭 색이 갈색·올리브 톤** — 코드 주석 가설 ("Slice 5 = 진녹색 풀밭") 과 실제 sprite 가 안 맞음. config.ts backgroundColor `#a5c465` 와 풀밭 unmatch
  - ❌ **나무 (Slice 76) 화면에 안 보임** — 16곳 배치했는데 시각적으로 부재. 다른 sprite 일 가능성 (또는 풀밭과 색 비슷해 묻힘)

**다음 액션 후보**:
- (a) `/dev/slices` 임시 검증 페이지 — Slice 1~150 그리드 표시, 사용자가 진녹색 풀밭·나무·길·꽃 직접 식별 → sprite 매핑 정정
- (b) Slice 5/76 만 우선 정정 (작은 시도) — 현재 코드에서 sprite 키만 바꿔보기
- (c) Cozy Pack 자체를 포기하고 Kenney Tiny Town tileset 으로 회귀 (당초 spec Step 2 계획)

**2026-05-05 진행 (대량 변경, 시안 큐레이션 + 본심 흔들림·회복 사이클)**:

- ✅ **WORLD 사이즈 동적 처리** — `window.innerWidth/Height` 와 `gameSize` max fallback 으로 viewport 기반 결정. RATIO 1.5 → 2.5 → 1.5 → 1.0 흔들림 후 **현재 1.0 (WORLD = viewport, 시안 3 Symmetric Garden 결정 시점)**
- ✅ **카메라 즉시 캐릭터 중앙** — `centerOn` + `setSize` 명시. 카메라 follow 의미는 미세 (1.0 배 라 산책 거의 X)
- ✅ **객체 scale viewport 비례** — `worldScaleFactor = sizeH / 720` (viewport 기준, WORLD 기준이면 비대해짐)
- ✅ **활엽수 sprite 식별** — `/dev/slices` 페이지 (`frontend/src/app/dev/slices/page.tsx`) 만들어 1~150 그리드 보고 식별:
  - Slice 56 = 진녹색 풀밭 (현재 사용)
  - Slice 116·117·118·119 = 활엽수 4종 (노랑·주황·빨강·녹색)
  - Slice 105·107 = 그루터기, 113·114 = 통나무, 111 = 표지판, 120·123 = 돌, 30·47 = 풀잎 디테일, 75·76 = 모래 plot 빨간 물결
- ✅ **3 시안 큐레이션 비교** (`seon1-plaza.png`·`seon2-forest-final.png`·`seon3-symmetric-final.png`):
  - 시안 1 Plaza-centric (집 정중앙, 활엽수 좌우 외곽 둘러쌈)
  - 시안 2 Forest Village (preview 결, 좌측 빽빽 활엽수 숲 + 우측 plot·연못)
  - 시안 3 Symmetric Garden (집 정중앙, 활엽수 좌우 대칭) — 현재 코드 상태
- ✅ **연못 Phaser graphics 직접 그림** (sprite 미식별 → 회청록 타원 + 흰 거품)
- ✅ **모래 + 풀밭 + 모래 plot** layer 적용 (단색 stretch)
- ✅ **채팅창 width 핫픽스** — `CHAT_WIDTH initial 700, max 1200`
- ❌ **사용자 모든 시안 거부** — "개구려, 화장실에 가스렌지 결". sprite 자동 배치의 본질 한계 인정

**2026-05-06 본심 흔들림·회복 사이클**:

- ⚠️ **활동 메타버스 회귀 시도** (3D + 음성 + 화면공유) → `learning 71` §2 의 "도피" 패턴 정확 재현. spec D1·D2 (안식처·Alone Together) 인용으로 회귀 회피
- ⚠️ **프로젝트 폐기 고민** → ZEP 과 차별점 의문. 진단: 본질 가치 (D6 4축 — NPC 안부·비동기 편지·환경음·안식 의식) 미구현이 차별점 안 보임의 원인. 디자인 부담 X
- ✅ **본심 회복** — 사용자 발화 "더이상 그만흔들리고". spec D1·D2·D6 유지 결정
- ✅ **자산 결정 — spec D4 그대로** — Sprout Lands 영구 제외 유지 (redistribute 금지). LimeZu Serene Village (CC BY 4.0) 본격 진입 결정. Cozy Pack 한계 인정
- ✅ **마을 확장 결정** — 현재 1.0 배 거부. **WORLD 더 크게 + zone 분할 산책 결** (옆으로 이동 → 다른 지역 진입). Stardew 결 정합

**Step 2 의 의도적 한계**:
- 캐릭터 sprite 4방향 walk 애니메이션은 Step 4
- LimeZu Serene Village 24종 집 본격 풍경은 Step 3
- 디자인 토큰 신규 추출은 사용처 등장 시 점진 (D8 As You Go)

## 3.5 다음 세션 착수 의제 (2026-05-06 정리)

### 우선 순위 (본인 결정)

**(1) 자산 트랙** — LimeZu Serene Village 다운로드 + 통합:
- 사용자가 [limezu.itch.io/serenevillagerevamped](https://limezu.itch.io/serenevillagerevamped) 다운로드
- `frontend/public/assets/village/limezu/serene-village/` 배치
- LICENSE.md 에 CC BY 4.0 attribution 추가
- Cozy Pack 결과 → LimeZu 자산 교체

**(2) 마을 확장 트랙** — WORLD 사이즈 키움 + zone 분할:
- 현재 `WORLD_VIEWPORT_RATIO = 1.0` → 2~3 배로 변경 (산책 결)
- Zone 분할 — 마을 / 숲 / 해변 / 농장 등 영역별 객체 배치
- 카메라 follow 산책 + 옆 zone 진입 자연 결

**(3) 본질 가치 트랙 (병행)** — D6 4축 미구현이 ZEP 차별점 안 보이는 진짜 원인:
- Step 9 환경음 (Howler.js + freesound.org 빗소리·바람) — 가벼움, 의욕 회복용 ⭐
- Step 7 NPC 매일 안부 카드 (Spring 스케줄러 + 채팅 + 카드 UI)
- Step 8 비동기 편지·흔적 (DB + UI)
- 4축 1개라도 동작하면 사용자 본인이 ZEP 차별점 직접 느낌

### 메타 결정 (디자인 부담 풀기)

**디자인 막힘의 진짜 원인** (정직 진단):
- AI 가 sprite 단위 자동 배치 — 시각 직관 X. 사용자 비유 "화장실에 가스렌지" 정확
- messenger.abeto.co 결 = 사람이 일러스트 한 장 직접 그림. 자산 자체가 차이
- 우리 길: (a) 자산 풍부 큐레이션 (LimeZu) + (b) 본질 가치 (D6 4축) 동시 진행

**visual spec 부재 = AI Native 안 됨** (사용자 지적):
- spec 에 "활엽수 군락 좌측 외곽, 그루 수 N, WORLD ratio M" 같은 검증 가능 시각 기준 X
- Comprehension Gate 13 카테고리 모두 백엔드 — 시각·UI 결정 카테고리 부재
- 자유 대화 모드라 step-start / track-start 슬래시 명시 진입점 없이 진행 → 세팅 우회
- 별도 메타 트랙 (`visual-spec-driven`) 후보 — Gate 카테고리 #14 시각·UI + visual-spec.md 템플릿 + image diff 도구 셋업. 다음 UI 트랙부터 적용

## 4. 충돌 위험 파일

> `docs/conventions/parallel-work.md` §3 Tier 분류 참조.

- `frontend/src/styles/tokens.ts` — Tier 1 (다른 트랙 token 갱신 가능). 본 트랙이 정의 시작
- `frontend/src/components/ui/` — Tier 1 (다른 트랙도 컴포넌트 추가 가능)
- `frontend/public/assets/` — Tier 2 (자산 파일 누적)
- `frontend/src/app/village/` — Tier 1 (마을 화면, ws-redis Step 3 도 손댈 가능)
- Phaser 씬 코드 — Tier 1 (ws-redis Step 3 와 충돌 가능)

> 다른 활성 트랙 없음 (2026-05-04 기준). ws-redis Step 3 착수 시 본 트랙과 머지 순서 협의 필요.

## 5. 다음 세션 착수 전 확인 사항

- `docs/handover/INDEX.md` 활성 트랙 확인
- 본 트랙 spec 정독 ([docs/specs/features/village-design-mvp.md](../specs/features/village-design-mvp.md))
- learning 69·70·71 정독 (사고 과정 복원)
- main 동기화 — 본 워크트리는 ChatAppProject-ui, main 은 별도 워크트리(ChatAppProject) 점유. `git pull origin main` 후 충돌 해결
- Step 1 plan 사용자 승인 → 자산 다운로드 → 코드 작성

## 6. 보류 메모

- AI 에셋 생성 (D7 재검토 트리거 도달 시 별도 트랙) — PixelLab.ai / Scenario.gg 후보
- 풀 디자인 시스템 (Storybook, 모든 컴포넌트) — 사용처 등장 시 점진 추가
- (ii) 변화 공간 / (vi) 예측 못 한 만남 (머무는 이유 후보) — 본심 정합 약하나 추후 검토 가능
- Stardew 농사·호감도·결혼 메커니즘 (D5 분리) — 사용자 "심심하다" 신호 시 안식 결 유지하는 가벼운 활동 추가 검토
