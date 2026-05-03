# Track: village-design-mvp

> 작업 영역: Frontend (UI/UX, Phaser 마을, 디자인 시스템) + 자산 큐레이션 + Claude UI 코드
> 시작일: 2026-05-04
> Issue: #56
> 브랜치: `feat/village-design-mvp-step1-village-entry` (Step 1)
> Spec: [docs/specs/features/village-design-mvp.md](../specs/features/village-design-mvp.md)

## 0. 한 줄 요약

마음의 고향 마을 디자인 MVP — Stardew Valley 결 따뜻한 픽셀 톤 + "Alone Together — 같이 있되 말 안 해도 되는 마을" 차별점 + 머무는 이유 4축 첫 시안.

## 0.5 Acceptance Criteria (이게 통과하면 트랙 종료)

> spec §6 Verification 과 1:1 매핑.

- [ ] 사용자가 마을 입장 시 Stardew 결 따뜻한 톤 즉시 느낌 (Step 1)
- [ ] 디자인 시스템 토큰화 완료 (컬러·타이포·스페이싱) (Step 1)
- [ ] UI 컴포넌트 키트 5종 이상 (Button / Card / Modal / Toast / Input) — 사용처 등장 분만큼 (Step 1~2)
- [ ] 환경음 1종 이상 통합 (Step 6)
- [ ] 머무는 이유 4축 중 1개 이상 첫 시안 동작 (Step 4 또는 5)
- [ ] 자산 라이선스 명시 (commercial use 확인) — 트랙 종료 전

## 1. 배경 / 왜

- 디자인 막막함 + 컨셉 흔들림을 본심 워크샵 (자기 인터뷰 4단계) 으로 정직하게 해소 ([learning 71](../learning/71-design-tone-from-self-interview.md))
- 활동 방 컨셉 피벗 시도 → 사용자 본인이 "도피" 인정 → 영구 보류
- 마음의 고향 §2 안식처 컨셉 확정 + Alone Together 학술 개념으로 차별점 명료화
- token-auto-renewal 트랙 (#38, closed) 보류 후 본 트랙 우선

## 2. 전체 로드맵 (1 step = 1 PR)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| **1** | **마을 입장 화면 + Welcome + 디자인 시스템 토큰·컴포넌트 동시 추출** | — | 🔧 진행 중 | #56 | (작업 시) |
| 2 | 채팅 UI 리디자인 + 디자인 토큰 확장 | step1 | 대기 | (별도) | — |
| 3 | 집 꾸미기 인벤토리 + 슬롯 시스템 첫 시안 | step1 | 대기 | (별도) | — |
| 4 | NPC 매일 안부 카드 시스템 첫 시안 | step1 | 대기 | (별도) | — |
| 5 | 비동기 편지·흔적 시스템 첫 시안 | step1·step3 | 대기 | (별도) | — |
| 6 | 환경음·BGM 통합 | step1 | 대기 | (별도) | — |

## 3. 현재 단계 상세

### Step 1 — 마을 입장 화면 + 디자인 시스템 동시 추출 ("Design System As You Go")

**무엇**:
- LimeZu Modern Interiors / Sprout Lands / Mystic Woods 자산 다운로드 + 라이선스 확인
- `frontend/public/assets/village/` 에 자산 배치
- 마을 입장 화면 (Phaser 씬) — 첫 진입 시 Welcome 모션 (페이드인 + BGM 1초 ramp)
- 화면 만들면서 사용된 토큰만 `frontend/src/styles/tokens.ts` 에 추출 (컬러 5색, 타이포 3종, 스페이싱 5단)
- 사용된 컴포넌트만 추출 (예상: WelcomeCard 1개로 시작)

**산출물**:
- `frontend/public/assets/village/` 자산 파일 + LICENSE.md
- `frontend/src/styles/tokens.ts` (디자인 토큰)
- `frontend/src/app/village/page.tsx` 또는 기존 마을 페이지 갱신
- `frontend/src/components/ui/WelcomeCard.tsx` (첫 컴포넌트)
- Phaser 씬 코드 (자산 통합)

**막힌 지점 / 결정 사항**:
- (작업 시 채움)

**spec.decisions 동기화**: D3 (Stardew 톤) · D4 (큐레이션) · D5 (메커니즘 분리) · D8 (As You Go) 직접 적용

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
