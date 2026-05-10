---
feature: village-3d
track: village-3d
issue: "#67"
status: draft
created: 2026-05-11
last-updated: 2026-05-11
predecessor: docs/specs/features/village-design-mvp.md
---

# 마을 3D — Three.js 안식처 + Alone Together 차별점

> 이 spec 은 트랙 `village-3d` (Issue #67) 의 **요구사항 진실** 이다.
> 진행 상태는 [`docs/handover/track-village-3d.md`](../../handover/track-village-3d.md), 결정의 사고 과정은 [`docs/learning/`](../../learning/INDEX.md).
> 4층 분리 모델: [conventions/spec-driven.md](../../conventions/spec-driven.md) §1.
>
> **승계 트랙** — 옛 spec [`village-design-mvp.md`](./village-design-mvp.md) (closed-superseded) 의 D1·D2·D6 결을 그대로 승계, D3·D4 정정. 정정 사유: [learning 72](../../learning/72-phaser-to-threejs-pivot-decision.md).

---

## 1. Outcomes

> 외롭고 힘들 때 누군가의 곁이 그리운 사람이, 따뜻한 3D 안식처 마을에 들어와 강요 없는 동행을 경험한다.
> NPC 의 매일 안부, 누군가가 두고 간 편지·고해, 자연 환경음 사이에서 마음을 두고 갈 수 있다.

- (사용자) 마을 입장 시 안식처 결 (warm 라이팅·Fog·환경음) 즉시 느낌
- (사용자) "강요된 대화" 없이 NPC 와 이웃의 안부·흔적만으로도 위로받음
- (사용자) 도서관에 들어가 익명으로 마음을 두고 가거나 다른 사람 글 읽고 위로 댓글 남길 수 있음
- (시스템) 안식처 가드레일 6축 (D11) 위반 없이 3D 공간 운영
- (시스템) 시각 차원 (3D) 과 본질 가치 (D6 4축) 가 동시 동작 — ZEP 결 회귀 X

## 2. Scope

### 2.1 In (이번 트랙에서 만든다)

- Three.js 기반 3D 마을 레이아웃 (입구·캠프파이어·연못·도서관 세로 구도, 숲 wall collision)
- 캐릭터 이동 (걷기 + **점프 가벼운 깡총** + 뛰기·달리기 X)
- 별도 3D Scene 전환 (`VillageScene` ↔ `LibraryScene`, URL 안 바뀜 — `THREE.Scene` 인스턴스 결 또는 R3F 컴포넌트 mount/unmount 결)
- 안식처 가드레일 6축 (D11) 코드 적용 — 정적 카메라 + warm 라이팅 + Fog + 점프 가능 + 환경음 우선 + 텍스트 익명
- 도서관 첫 시안 — 책장 (글 list) + 책상 (글 작성) + 댓글 다대다 + NPC 답변 1개 자동 + AI 추천 "비슷한 마음의 책" 사이드바 + 자동 랜덤 닉
- 머무는 이유 4축 (D6) 첫 시안:
  - (i) NPC 매일 안부 카드
  - (iii) 비동기 편지·고해 (도서관 결 통합)
  - (v) 자연 환경음 (Howler.js)
  - (vii) 안식 의식 공간 (도서관 책상 결)
- 3D 자산 점진 통합 — Three.js 기본 geometry → CC0 3D 모델 (Quaternius / Kenney 3D / Sketchfab CC0)
- 옛 트랙 보존분 결 활용 — Welcome 모션 (React 페이드인) · LICENSE 인프라 · 디자인 토큰 (globals.css 17색)

### 2.2 Out (이번 트랙에서 명시적으로 안 만든다)

> Out 이 spec 가치의 절반.

- **Stardew 메커니즘 분리** — 농사 / 채집 / 노동 / 호감도 게이지 / 결혼 / 자녀 (안식과 충돌)
- **AI 에셋 생성** (보류 — D7 재검토 트리거 도달 시 별도 트랙. Meshy.ai · Scenario.gg 등 3D AI)
- **활동 방 컨셉** — 화면공유 / 음성 채팅 / 영상 sync / 협업 낙서 (영구 보류, D2 Alone Together 결 충돌)
- **게임 전투 / 미니게임**
- **VR / AR** — 데스크탑 우선 (CLAUDE.md §2)
- **모바일 우선 디자인** — 데스크탑 only. 3D 성능 결로 모바일 최적화는 후속 트랙
- **자유 카메라 회전 (orbit controls)** — D11 가드레일 위반. 정적 follow 만
- **Phaser 2D 코드 보존** — 옛 트랙 Step 2 미커밋 결 폐기됨, Welcome 모션·LICENSE 만 보존

## 3. Constraints (비기능 제약)

| 차원 | 제약 |
|------|------|
| 성능 | Three.js + Next.js. 60fps 목표 (FPS 30 이하 = D-prev 재검토 트리거). 데스크탑 GTX 1050 / Intel UHD 620 동작 기준 |
| 비용 | 무료 자산만 (Quaternius CC0 + Kenney 3D CC0 + Sketchfab CC0 BY). AI 3D 도구 (Meshy.ai 등) 는 D7 트리거 도달 시 |
| 시간 | Step 1 (Three.js PoC) 1주 목표. 본질 가치 (Step 2 환경음) 1~2시간 병행 |
| 인프라 | 추가 인프라 0 (정적 자산만 추가). 도서관 백엔드는 Step 4 시점 별도 검토 (confessions·comments 테이블) |
| 정책/규제 | 자산 라이선스 — CC0 / CC BY 우선, 상용 사용 가능 명시. 도서관 글 = 익명 자동 닉, 운영자 모더레이션 결 (Step 4) |
| 인력 | 혼자 운영. 사용자 = 큐레이션·결정자, Claude = Three.js 코드·SVG·시스템 작성 |

## 4. Decisions

> 각 결정마다 **왜 · 대안 · 빈틈 · 재검토 트리거 4축**.

### D-prev. [정정] 옛 spec D3 "3D 전환 거부" → Phaser 2D → Three.js 3D 전환

- **왜**: 옛 spec D3 의 재검토 트리거 ("큐레이션 자산만으로 디자인 영혼 표현 한계") 명시 도달. 시안 1·2·3 사용자 거부 5회 누적 + AI sprite 자동 배치 본질 한계 인정. 사용자 본인이 "도피 X 시각 욕심" 명시 결 박음 (2026-05-10) + 안식처 가드레일 6축 동의 = 본질 결 (도피 결 X 분기, learning 72 §2.3).
- **대안**:
  - Phaser 2D 큐레이션 지속 — **거부** (재검토 트리거 도달, 한계 인정)
  - 일러스트 직접 그리기 — **거부** (옛 D3 거부 그대로 유지, 디자인 감각 부담)
  - AI 에셋 도입 (Meshy.ai · Scenario.gg) — **보류** (D7 트리거 결로 후속 검토)
  - LimeZu Serene Village 본격 통합 후 재시도 — **거부** (사용자 직관 거부 신호 강함, 시도해도 같은 결 예상)
- **빈틈**: 3D 모델링 학습 부담 / 3D 자산 라이선스 좁음 / WebGL 성능 (모바일 X 데스크탑 only) / **3D = ZEP 메타버스 회귀 위험** — D11 가드레일 결로 보강
- **재검토 트리거**:
  - 3D 결도 "화장실에 가스렌지" 신호 (시안 거부 누적 ≥ 3)
  - WebGL 성능 부족 (FPS < 30 / 로딩 5초 이상)
  - 사용자 본심 결 "안식 < 활동" 신호
  - learning 72 §8 다음 정정 트리거 결 도달

### D1. [컨셉] 마음의 고향 §2 안식처 컨셉 유지 (옛 트랙 승계)

- **왜**: 사용자 본심 (외롭고 힘들 때 누군가의 곁이 그리운 사람) 직접 정합. 본심 워크샵 (learning 71) Q1·Q3 에서 직접 도출. 시각 차원 변경에도 결 유지 (learning 72 §4).
- **대안**: 활동 방 컨셉 (화면공유·모각코·영상 sync) — **검토 후 거부** (사용자 본인이 "도피" 인정, ZEP/Discord 와 차별점 약, 안식처 결 충돌)
- **빈틈**: 안식처 컨셉이 추상적. 본심 워크샵 4단계 (learning 71 §3·§4) + D11 가드레일로 해소
- **재검토 트리거**: 사용자 반응이 "안식 < 외로움 가중" / Step 2 (환경음) Step 4 (도서관) 첫 시안 후 정서 점검

### D2. [차별점] Alone Together — 같이 있되 말 안 해도 되는 마을 (옛 트랙 승계)

- **왜**: 본심 워크샵 직접 도출 (learning 71 §6). Sherry Turkle "Alone Together" 학술 컨셉. 영화관·산책로·메일 선물 게임의 공통 패턴 = "함께 있되 강요 없는". 시각 차원 변경에도 결 유지.
- **대안**:
  - "강제 모임" (ZEP, Discord, VRChat) — 거부
  - "익명 동행" (Sky) — 게이머 타겟, 본심과 거리
  - "비동기 친구" (인스타, 싸이월드) — 가벼움, 머무는 시간 짧음
- **빈틈**: 사용자에 따라 "외로움 가중" 으로 받아들여질 수 있음 (D1 과 공유 빈틈)
- **재검토 트리거**: 사용자 인터뷰 "혼자임이 더 강조되어 외로워졌다" 신호 / cross-user 인터랙션 비율 너무 낮음

### D3'. [무드 톤] 3D 따뜻한 안식처 (옛 D3 정정)

- **왜**: 옛 D3 "Stardew 결 따뜻한 픽셀" → 3D 차원에서 동일 결 추구. warm tone + soft shadow + Fog 결 박음. Three.js 의 라이팅·셰이더 결로 픽셀 결과 다른 "공간감 있는 따뜻함" 실현 시도. learning 72 §5 가드레일 6축 결 박음.
- **대안**:
  - 어둡고 진중한 톤 (고해성사실 결) — **거부** (사용자 톤 결정 = 따뜻한 도서관·편지함, 2026-05-10)
  - 차가운 명상 톤 (Monument Valley 3D 결) — **거부** (옛 D3 거부 그대로, 본심 정합 X)
  - 게임 톤 (RPG · 채도 ↑) — **거부** (D11 가드레일 위반 신호)
- **빈틈**: 3D 의 "사진 같은 사실감" 결로 빠질 위험 (Unreal Engine MetaHuman 결 = 결 충돌). low-poly + warm 셰이더 결 박음
- **재검토 트리거**: 사용자 반응 "차갑다 / 무미건조하다 / 사실감만 있고 결 안 느껴짐" 신호

### D4'. [에셋 모델] 3D 기본 geometry → CC0 3D 모델 점진 통합 (옛 D4 정정)

- **왜**: PoC 단계 = 자산 0 (`BoxGeometry` · `PlaneGeometry` · `SphereGeometry` · `CylinderGeometry` 만으로 1주 PoC). 점진 단계 = CC0 3D 모델 통합. 옛 트랙 D4 의 "Commercial-safe + GitHub-publishable" 원칙 그대로 승계.
- **확정 자산 후보** (Step 1 이후):
  - **Quaternius CC0** ([quaternius.com](https://quaternius.com)) — Ultimate Nature Pack · Ultimate Modular Men · Ultimate Animated Animal Pack 등. 무조건 자유
  - **Kenney 3D Pack** (CC0) — Tower Defense Kit · Mini Characters 1 · Castle Kit 등
  - **Sketchfab CC0/BY** — 개별 모델, 라이선스 페이지별 확인
- **로컬 사용 결 (redistribute 금지 자산)**: `.gitignore` 등록, 작가 직접 문의 후 결정
- **영구 제외**: redistribute 명시 금지 자산 (옛 트랙 Sprout Lands · Mystic Woods 결과 동일 원칙)
- **대안** (learning 69 결 그대로):
  - 풀 AI 생성 (Meshy.ai 등) — 보류 (D7 트리거)
  - 직접 모델링 (Blender) — 거부 (디자인 감각 부담, 옛 D4 결 그대로)
  - 비상업적 자산 — 거부 (광고 도입 시 라이선스 위반)
- **Attribution 의무**: `frontend/public/assets/village-3d/LICENSE.md` 신규 작성 + 화면 "About/Credits" 페이지 명시
- **빈틈**: 3D CC0 자산이 2D 픽셀보다 좁음 / 톤 통일 부족 가능성 (Quaternius low-poly + Kenney 3D 결합)
- **재검토 트리거**: 톤 통일 부족 신호 / 자산 한계 도달 (Step 4 도서관 인테리어) → 다른 CC0 검색 또는 AI 도입 (D7)

### D5. [메커니즘] Stardew 차용 / 분리 (옛 트랙 승계)

- **왜**: 본심 안식 결 정합 메커니즘만 차용. 의무감·강요 결 분리.
- **차용**: 집·마을 꾸미기·확장 / NPC 대화·편지 / 계절·시간 변화 (매일 안부 의식)
- **분리**: 농사·채집·노동 (의무감) / 호감도 게이지 (강요) / 결혼·자녀 (부담)
- **빈틈·재검토 트리거**: 옛 spec D5 와 동일

### D6. [머무는 이유] 4축 — (i) 안부 + (iii) 편지·고해 + (v) 환경음 + (vii) 안식 의식 (옛 트랙 승계)

- **왜**: 본심 답 직접 매핑 (learning 71 §10). ZEP/Discord 와 차별점 만드는 핵심. **시각 차원 독립** (learning 72 §4).
  - (i) NPC 매일 안부 — Q3 "들어줄 사람 / 같이 고민" 결
  - (iii) 비동기 편지·고해 — Step3 "메일 선물 게임 (messenger.abeto.co)" 직접 매핑. **본 트랙은 도서관 결로 통합** (사용자 결, 2026-05-10)
  - (v) 자연 환경음 — Q2 "빗소리, 바람, 비행기 소리" 직접 매핑. Three.js `PositionalAudio` + Howler.js 결합
  - (vii) 안식 의식 — 도서관 책상 결 (마음 정리 노트)
- **대안**: 옛 spec D6 와 동일
- **빈틈**: 4축 모두 첫 시안만 — Step 2 환경음 1개 우선 박는 결
- **재검토 트리거**: 4축 중 사용자 반응 강한 것 우선 깊이

### D7. [AI 재검토 트리거] 보류 결정의 자동 정정 경로 (옛 트랙 승계)

- 옛 spec D7 그대로. 3D 컨텍스트 추가:
  - 3D AI 도구 (Meshy.ai · Scenario.gg) 비용 회수 가능 시점 (사용자 100명 ↑)
  - 3D 자산 한계 도달 (Step 4 도서관 인테리어)
  - 사용자 UGC 욕구 신호 (UGC 요청 발화 3회 이상)

### D8. [디자인 시스템 도입 방식] Design System As You Go (옛 트랙 승계)

- 옛 spec D8 그대로. 화면 만들면서 토큰 추출 (Linear / Vercel 패턴). 3D 컨텍스트 추가:
  - 라이팅 톤 토큰 (warm tone hex · ambient intensity · directional intensity · fog density)
  - 카메라 결 토큰 (FOV · follow lerp · zoom 한계)

### D9. [PR 흐름] 트랙 통합 PR (옛 트랙 D9 승계)

- 옛 spec D9 그대로 적용. 본 트랙도 long-lived 통합 브랜치 (`feat/village-3d`) 운영. step PR base = 통합 브랜치. 트랙 종료 시 통합 → main 단일 PR.
- **이유**: CD 파이프라인 즉시 자동 배포. 트랙 진행 중 step PR 마다 main 머지 = 운영 마디마다 시각 변화 = (b) 시나리오 일관 경험 깨짐.
- **운영 정책**: main sync 주기 (다른 트랙 main 머지 시 통합 브랜치에 `git merge origin/main` 또는 rebase). 옛 트랙 종료 결로 main sync 누수 방지 결 박음 (PR #65).

### D10. [도서관 진입 모델] 별도 Three.js Scene 전환 (URL 안 바뀜)

- **왜**: 사용자 결 박음 (2026-05-10) — "URL 이동은 좀 그렇고, 위치가 바뀌고". Phaser Scene Manager 결 결 결 X (Three.js 결로 박음). React state 결로 `VillageScene` ↔ `LibraryScene` 전환. 페이드 트랜지션. 게임 결 자연 (Stardew 농장↔마을 결 정합).
- **대안**:
  - URL 라우팅 (Next.js `/library` 페이지) — **거부** (사용자 결 명시 X)
  - React 풀스크린 모달 오버레이 (마을 멈춤) — **거부** (마을 결 단절)
  - 같은 Scene 카메라 줌인 + 인테리어 layer 교체 — **보류** (구현 복잡, Step 4 이후 검토)
- **빈틈**: Scene 전환 시 캐릭터 위치 결 결 결 결 결 (state 결로 박음). 메모리 결 결 (`THREE.Scene` 인스턴스 두 개 vs 하나만 두고 child 결 결로 박음)
- **재검토 트리거**: Scene 전환 결 결 결 결 (느림 / 깨짐) / 사용자 결 결 결 결

### D11. [안식처 가드레일] 3D 에서 ZEP 회귀 막는 6축 spec

- **왜**: 3D = ZEP 메타버스 결로 회귀 위험 (D-prev 빈틈 결 결). 6축 결 박음 — 위반 시 신호 결 박음. learning 72 §5 결 그대로.

| 축 | 결 | 위반 시 신호 |
|---|---|---|
| 카메라 | 정적 + 천천히 follow (lerp 0.05~0.10). orbit 자유 회전 X | 사용자가 마우스로 빙빙 돌리는 결 → ZEP |
| 라이팅 | warm tone hex (예: `#fff5e0` ambient + `#ffd9a3` directional) + soft shadow + `Fog` 옅게 | 차가운 흰 라이팅 → 사무실 결 |
| 물리 | 걷기 + **점프 (가벼운 깡총, 높이 ≤ 1 unit)** + 뛰기·달리기 X | 빠른 이동 (속도 > 5 units/s) → VRChat 결 |
| 카메라 워크 | 페이드 + 천천히 zoom (Scene 전환 결 박음) | 영화적 회전 → 게임 결 |
| 음향 | 환경음 (물·바람·새) 우선, BGM 잔잔 (음량 ≤ 0.3) | EDM · 시끄러운 BGM → 게이머 결 |
| UI | 텍스트 익명 (자동 랜덤 닉), 음성·화면공유 X | 음성 채팅 추가 → 활동 메타버스 |

- **대안**: 가드레일 X (자유 결) — **거부** (사용자 본인이 도피·시각 욕심 분기 결 인지 + 가드레일 결 동의)
- **빈틈**: 가드레일 너무 엄격해서 결 결 결 결 결 결 결 결 결 결 (예: orbit 결 제한 결 사용자 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결 결). 위반 신호 모니터링.
- **재검토 트리거**: 사용자 본인 결 결 결 결 ("orbit 결 결 결 결" 결 결) / 위반 신호 결 결 결 결 결 결

## 5. Tasks (= Steps)

> 1 step = 1 PR (엄격, **base = 통합 브랜치 `feat/village-3d`** — D9). `docs/conventions/git.md` §4.

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| **1** | **Three.js PoC** — 마을 박스 레이아웃 (입구·캠프파이어·연못·도서관·숲 wall) + 캐릭터 이동 (걷기 + 점프) + 도서관 별도 Scene 전환 + warm 라이팅 + Fog. 자산 X 기본 geometry | — | `frontend/src/three/`, `frontend/src/app/GameLoader.tsx`, `frontend/package.json` (three 추가) | (Step 발급 시) | — |
| **2** | **환경음 통합** ⭐ — Howler.js + freesound.org (빗소리·바람·새) + Three.js `PositionalAudio` (연못 결, 캠프파이어 결) | step1 | `frontend/src/lib/audio/`, 자산 큐레이션 | (별도) | — |
| **3** | **캐릭터 3D 모델 + 4방향 walk 애니메이션** (Quaternius Ultimate Modular Men 결) | step1 | `frontend/src/three/character/`, `frontend/public/assets/village-3d/` | (별도) | — |
| **4** | **도서관 인테리어 + 글 작성·조회·댓글 첫 시안** — 책장 (글 list) + 책상 (글 작성) + 댓글 다대다 + NPC 답변 1개 + AI 추천 사이드바. 백엔드 API 동반 (`POST /confessions`, `GET /confessions`, `POST /confessions/{id}/comments`, 익명 닉 생성, 임베딩 추천) | step1, 백엔드 도메인 (`confession`) | `frontend/src/three/library/`, `frontend/src/components/library/`, 백엔드 새 도메인 | (별도) | — |
| **5** | **NPC 매일 안부 카드 시스템** (D6 i) — Spring 스케줄러 + 카드 UI + 캠프파이어 NPC 자리 결 통합 | step3, 백엔드 | `frontend/src/components/npc/`, 백엔드 스케줄러 | (별도) | — |
| **6** | **비동기 편지 시스템** (D6 iii) — 도서관 결과 다른 결 (사용자 결 결로 검토) 또는 도서관 통합 | step4 | (Step 결 결 결) | (별도) | — |
| **7** | **집 꾸미기 인벤토리 + 슬롯 시스템** | step1, 백엔드 도메인 | `frontend/src/components/inventory/`, 백엔드 새 도메인 | (별도) | — |

## 6. Verification (수용 기준 — track §0.5 와 1:1)

- [ ] 사용자가 마을 입장 시 안식처 결 즉시 느낌 (Step 1) — warm 라이팅 + Fog + 정적 카메라
- [ ] 안식처 가드레일 6축 (D11) 위반 X (Step 1) — 모든 축 코드 결 결
- [ ] 환경음 1종 이상 통합 (Step 2)
- [ ] 도서관 진입 + 글 작성·조회 + 댓글 동작 (Step 4)
- [ ] 머무는 이유 D6 4축 중 1개 이상 첫 시안 동작 (Step 2 또는 5)
- [ ] 3D 자산 라이선스 명시 (commercial use 확인) — 트랙 종료 전
- [ ] 60fps (FPS ≥ 30 = 최소) — Step 1 PoC 시점 측정

## 7. References

- 트랙 파일: [track-village-3d.md](../../handover/track-village-3d.md) (트랙 시작 시 작성)
- 옛 spec: [village-design-mvp.md](./village-design-mvp.md) (closed-superseded, D3 정정 사유)
- 관련 wiki:
  - [frontend/asset-guide.md](../../wiki/frontend/asset-guide.md) — 자산 소스 · 규격 · 라이선스 (Step 1·3·4 자산 통합 시 갱신)
  - [frontend/phaser-setup.md](../../wiki/frontend/phaser-setup.md) — Phaser 설정 (트랙 종료 결 = Three.js 전환 결로 본 페이지 deprecate 검토 결, Step 1 시점)
- 관련 learning:
  - [69 — 에셋 모델 큐레이션 vs AI 생성](../../learning/69-asset-model-curated-vs-ai-generation.md)
  - [70 — 마을 톤·미감 결정](../../learning/70-village-mood-aesthetic-decision.md)
  - [71 — 디자인 톤 자기 인터뷰](../../learning/71-design-tone-from-self-interview.md)
  - [72 — Phaser 2D → Three.js 3D 전환 결정](../../learning/72-phaser-to-threejs-pivot-decision.md) ⭐ 본 트랙 정정 사유
- 관련 ADR: (트랙 진행 중 발생 시 추가)
- 외부 자료:
  - [Three.js 공식](https://threejs.org)
  - [React Three Fiber (R3F)](https://docs.pmnd.rs/react-three-fiber)
  - [Quaternius CC0 3D](https://quaternius.com)
  - [Kenney 3D Pack](https://kenney.nl/assets) (CC0)
  - [Sketchfab CC0 검색](https://sketchfab.com/search?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b)
  - [Howler.js](https://howlerjs.com) — 환경음
  - [freesound.org](https://freesound.org) — 환경음 자산
  - Sherry Turkle, *Alone Together: Why We Expect More from Technology and Less from Each Other* (2011)
  - Stardew Valley (ConcernedApe) — 따뜻한 안식처 + NPC 결 표준 사례

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-11 | 초안 작성. 옛 트랙 `village-design-mvp` (closed-superseded) 의 D1·D2·D5·D6·D7·D8·D9 승계, D3·D4 정정 (D3' D4'), D-prev (정정 사유) + D10 (도서관 진입 모델) + D11 (안식처 가드레일 6축) 신설. |
