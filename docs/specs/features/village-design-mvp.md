---
feature: village-design-mvp
track: village-design-mvp
issue: "#56"
status: draft
created: 2026-05-04
last-updated: 2026-05-04
---

# 마을 디자인 MVP — Stardew 톤 + Alone Together 차별점

> 이 spec 은 트랙 `village-design-mvp` (Issue #56) 의 **요구사항 진실** 이다.
> 진행 상태는 [`docs/handover/track-village-design-mvp.md`](../../handover/track-village-design-mvp.md), 결정의 사고 과정은 [`docs/learning/69`](../../learning/69-asset-model-curated-vs-ai-generation.md) · [`70`](../../learning/70-village-mood-aesthetic-decision.md) · [`71`](../../learning/71-design-tone-from-self-interview.md).
> 4층 분리 모델: [conventions/spec-driven.md](../../conventions/spec-driven.md) §1.

---

## 1. Outcomes

> 외롭고 힘들 때 누군가의 곁이 그리운 사람이, 따뜻한 픽셀 마을에 들어와 강요 없는 동행을 경험한다.
> NPC 의 매일 안부, 누군가가 두고 간 편지, 자연 환경음 사이에서 자기 집을 꾸미고 마을을 넓혀가며 마음을 두고 갈 수 있다.

- (사용자) 마을 입장 시 Stardew 결 따뜻한 픽셀 톤으로 시각적 환영을 받는다
- (사용자) "강요된 대화" 없이 NPC 와 이웃의 안부 / 흔적만으로도 위로를 받는다
- (사용자) 자기 집을 꾸미고 마을을 넓혀가는 작은 성취가 누적된다
- (시스템) 디자인 시스템 토큰화로 모든 화면이 일관된 톤으로 빠르게 추가 가능하다

## 2. Scope

### 2.1 In

- 디자인 시스템 토큰 (컬러 팔레트 / 타이포 스케일 / 스페이싱 / 라운드 / 그림자) — Step 1 화면 만들면서 동시 도출 ("design system as you go")
- 마을 입장 화면 + Welcome 모션 (Step 1)
- Stardew 결 픽셀 자산 통합 (LimeZu Modern Interiors / Cup Nooble Sprout Lands / Game Endeavor Mystic Woods)
- 머무는 이유 4축 첫 시안:
  - (i) NPC 매일 안부 카드
  - (iii) 비동기 편지·흔적 시스템
  - (v) 자연 환경음 (BGM + 환경음)
  - (vii) 안식 의식 공간 (예: 마음 정리 책상, 고민 우물)
- 집 꾸미기 인벤토리 + 슬롯 시스템 첫 시안
- 마을 확장 메커니즘 첫 시안

### 2.2 Out

> Out 이 spec 가치의 절반.

- **Stardew 메커니즘 분리** — 농사 / 채집 / 노동 / 호감도 게이지 / 결혼 / 자녀 (안식과 충돌)
- **AI 에셋 생성** (보류 — D7 재검토 트리거 도달 시 별도 트랙)
- **활동 방 컨셉** — 화면공유 / 음성 채팅 / 영상 sync / 협업 낙서 (영구 보류, 마음의 고향 §2 안식처 컨셉과 결 충돌)
- **게임 전투 / 미니게임**
- 풀 디자인 시스템 (Storybook, 모든 컴포넌트) — 사용처 등장 시 점진 추가
- 모바일 우선 디자인 (CLAUDE.md §2 — 데스크탑 우선)

## 3. Constraints

| 차원 | 제약 |
|------|------|
| 성능 | Phaser 2D + Next.js baseline 유지. 2D 렌더링 60fps 목표 |
| 비용 | 무료 자산 우선, 유료는 $5~$20 범위 (LimeZu / Sprout Lands / Mystic Woods 합쳐 ≤ $50) |
| 시간 | Step 1 (마을 입장 + 디자인 시스템) 1~2주 목표 |
| 인프라 | 추가 인프라 0 (정적 자산만 추가) |
| 정책/규제 | 자산 라이선스 — CC0 / CC BY 우선, 상용 사용 가능 명시 |
| 인력 | 혼자 운영. 사용자 = 큐레이션·결정자 (감각 발휘), Claude = UI 코드·SVG·시스템 작성 |

## 4. Decisions

### D1. [컨셉] 마음의 고향 §2 안식처 컨셉 유지

- **왜**: 사용자 본심 (외롭고 힘들 때 누군가의 곁이 그리운 사람) 직접 정합. 본심 워크샵 (learning 71) Q1·Q3 에서 직접 도출
- **대안**:
  - 활동 방 컨셉 (화면공유·모각코·영상 sync) — **검토 후 거부**. 사용자 본인이 "도피" 로 인정. ZEP/Discord/Gather 와 차별점 약, WebRTC·SFU 기술 부담 폭증, 안식처 결과 충돌
- **빈틈**: 안식처 컨셉이 추상적이라 손에 안 잡히는 막막함은 본심 워크샵 4단계로 해소 (learning 71 §3·§4)
- **재검토 트리거**: 사용자 반응이 "안식 < 외로움 가중" 으로 측정될 때 / Step 4 (NPC 안부) Step 5 (편지) 첫 시안 후 사용자 정서 점검

### D2. [차별점] Alone Together — 같이 있되 말 안 해도 되는 마을

- **왜**: 본심 워크샵 답에서 직접 도출 (learning 71 §6) — 영화관 사람들 / 산책로 / 메일 선물 게임의 공통 패턴 = "함께 있되 강요 없는". 학술 개념 Sherry Turkle "Alone Together"
- **대안**:
  - "강제 모임" (ZEP, Discord) — 결과 반대
  - "익명 동행" (Sky) — 게이머 타겟, 대화 그리운 사람 본심과 거리
  - "비동기 친구" (인스타, 싸이월드) — 가벼움, 머무는 시간 짧음
- **빈틈**: Alone Together 가 사용자에 따라 "외로움 가중" 으로 받아들여질 수 있음 (재검토 트리거 D1 과 공유)
- **재검토 트리거**: 사용자 인터뷰 시 "혼자임이 더 강조되어 외로워졌다" 신호 / cross-user 인터랙션 비율이 너무 낮음

### D3. [무드 톤] Stardew 결 따뜻한 픽셀

- **왜**: 사용자 직접 결정 (2026-05-04 발화: "스타듀벨리 느낌으로 맵을 활용하고 싶고 집을 꾸미는 것도 그런 맵 넓히고"). 본심 답 ("애니메이션 풍, 오두막, 숲, 흐르는 물, 탁 트인 공간") 정합. Stardew 는 픽셀이지만 따뜻한 픽셀
- **대안** (learning 70·71 비교):
  - (나) 벡터 미니멀 (Alto's Odyssey, Monument Valley) — **검토 후 거부**. 차가운 명상 결, 본심 (스폰지밥·따뜻함) 과 안 맞음
  - (다) 따뜻한 일러스트 (Spiritfarer, 이웃집 토토로) — **검토 후 거부**. 본심 정합 강하나 직접 손그림 부담 큼, 자산 풍부함 ↓
  - 3D 전환 (Three.js / R3F) — **검토 후 거부**. baseline 변경 + 기존 코드 재작성 + 모델링 학습 부담
- **빈틈**: Stardew 의 정교한 픽셀은 도트 단위 의도. AI 양산 어렵고 (D4 보류 사유), 큐레이션 자산이 톤 정확히 안 맞으면 부담
- **재검토 트리거**: 큐레이션 자산만으로 디자인 영혼 표현 한계 / 사용자 반응 "픽셀이 차갑다 / 옛날 같다" 신호

### D4. [에셋 모델] 큐레이션 우선 (LimeZu / Sprout Lands / Mystic Woods) + Claude UI 코드

- **왜**: 본심 워크샵 후 사용자 결정 ("AI는 일단 없이 베이스로 가고 기본적 UI 등 만들거 만들고 싶어"). 디자인 감각 부담 ↓, 톤 일관성 ◎, 비용 ↓
- **대안** (learning 69 비교):
  - 옵션 B 풀 AI 생성 — **검토 후 거부**. 비용 폭발 위험 (월 $600~$1200 시나리오), 픽셀 톤 일관성 어려움, 진짜 픽셀 X
  - 옵션 C 하이브리드 — **검토 후 보류**. 베이스 + AI 악센트, 두 시스템 운영 부담. D7 재검토 트리거 도달 시 재고
  - 옵션 D 캐릭터만 AI — **검토 후 거부**. 사용자 본인 의도 ("내 캐릭 AI") 였으나 톤 일관성 우선
- **빈틈**: 무료 자산 톤이 마을 컨셉 정확히 안 맞을 위험 / 자산 라이선스 commercial use 확인 필요
- **재검토 트리거**: 큐레이션만으로 꾸미기 핵심 가치 표현 한계 도달 / 사용자 생성 콘텐츠 욕구 ↑ / PixelLab.ai $9.99/월 비용 회수 가능 시점

### D5. [메커니즘] Stardew 차용 / 분리

- **왜**: 본심 안식 결과 정합 메커니즘만 차용. 의무감·강요 결 분리
- **차용**: 집·마을 꾸미기·확장 (사용자 핵심 욕구) / NPC 대화·편지 (Alone Together 정합) / 계절·시간 변화 (매일 안부 의식)
- **분리**: 농사·채집·노동 (의무감) / 호감도 게이지 (강요) / 결혼·자녀 (부담)
- **빈틈**: 분리한 메커니즘 없이 "할 게 없다" 사용자 반응 가능
- **재검토 트리거**: 사용자가 "심심하다 / 할 게 없다" 신호 ↑ → 안식 결 유지하는 가벼운 활동 추가 (예: 마을 산책 보상, 풍경 변화 발견)

### D6. [머무는 이유] 4축 — (i) 안부 + (iii) 편지 + (v) 환경음 + (vii) 안식 의식

- **왜**: 본심 답 직접 매핑 (learning 71 §10). 7개 후보 중 본심 정합 ◎ 4개. ZEP/Discord 와 차별점 만드는 핵심
  - (i) NPC 매일 안부 — Q3 "들어줄 사람 / 같이 고민" 결
  - (iii) 비동기 편지·흔적 — Step3 "메일 선물 게임 (messenger.abeto.co)" 직접 매핑
  - (v) 자연 환경음 — Q2 "빗소리, 바람, 비행기 소리" 직접 매핑
  - (vii) 안식 의식 — "마음 정리 책상" / "고민 우물" 같은 의식적 공간
- **대안**:
  - (ii) 변화 공간 — ○ 자기 표현 결, 추후 추가 가능
  - (iv) 의사결정 게임 — ✕ 강요
  - (vi) 예측 못 한 만남 — △ Alone Together 와 약간 충돌
- **빈틈**: 4축 모두 첫 시안만 — Step 1 마을 입장 시점엔 (i)~(vii) 중 1개만 동작
- **재검토 트리거**: 4축 중 사용자 반응 강한 것 우선 깊이 (1축에 집중) / 약한 것 보류 또는 폐기

### D7. [AI 재검토 트리거] 보류 결정의 자동 정정 경로

- **왜**: AI 결정은 보류이지 "안 함" 아님. 미래 자기 정정 경로 마련
- **대안**:
  - 영구 거부 — 본심 정합 가능성 (사용자 "내 캐릭 AI" 욕구) 차단
  - 무조건 도입 — 비용·일관성 위험 미해소
- **빈틈**: 트리거 신호 모니터링 안 하면 영구 보류와 동일
- **재검토 트리거** (구체):
  - 큐레이션 자산만으로 꾸미기 표현 한계 도달
  - 사용자 생성 콘텐츠 욕구 신호 (UGC 요청 발화 3회 이상)
  - PixelLab.ai 또는 Scenario.gg 비용 회수 가능 (사용자 100명 ↑ 또는 유료 모델 검증)

### D8. [디자인 시스템 도입 방식] Design System As You Go

- **왜**: MVP 결로 사용자 직관 정합 — 마을 입장 화면 먼저, 그 화면에 쓰인 토큰만 추출 (Linear/Vercel 패턴). 풀 디자인 시스템 (Storybook 등) 은 사용처 등장 시 점진 추가
- **대안**:
  - "토대 먼저 (모든 컴포넌트 다)" — 안 보이는 작업, 동기 부족, MVP 결 X
  - "즉흥 디자인" — 추후 통일 부담 매우 큼
- **빈틈**: 토큰 추출 누락 위험 (체크리스트로 보강)
- **재검토 트리거**: Step 3~ 시점에 토큰 충돌 / 일관성 깨짐 신호

## 5. Tasks (= Steps)

> 1 step = 1 PR (엄격). `docs/conventions/git.md` §4.

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| **1** | **마을 입장 화면 + Welcome + 디자인 시스템 토큰·컴포넌트 동시 추출** | — | `frontend/src/styles/`, `frontend/src/app/village/`, `frontend/src/components/ui/`, `frontend/public/assets/village/` | (현재) #56 | (작업 시 채움) |
| 2 | 채팅 UI 리디자인 + 디자인 토큰 확장 | step1 | `frontend/src/components/chat/`, tokens 확장 | (별도 발급) | — |
| 3 | 집 꾸미기 인벤토리 + 슬롯 시스템 첫 시안 | step1 | `frontend/src/components/inventory/`, 도메인 모델 | (별도) | — |
| 4 | NPC 매일 안부 카드 시스템 첫 시안 | step1 | `frontend/src/components/npc/`, 시간 트리거 | (별도) | — |
| 5 | 비동기 편지·흔적 시스템 첫 시안 | step1·step3 | 도메인 모델 + UI | (별도) | — |
| 6 | 환경음·BGM 통합 | step1 | `frontend/src/lib/audio/`, 자산 큐레이션 | (별도) | — |

## 6. Verification (수용 기준 — track §0.5 와 1:1)

- [ ] 사용자가 마을 입장 시 Stardew 결 따뜻한 톤 즉시 느낌 (Step 1)
- [ ] 디자인 시스템 토큰화 완료 (컬러·타이포·스페이싱) (Step 1)
- [ ] UI 컴포넌트 키트 5종 이상 (Button / Card / Modal / Toast / Input) — 사용처 등장 분만큼 (Step 1~2)
- [ ] 환경음 1종 이상 통합 (Step 6)
- [ ] 머무는 이유 4축 중 1개 이상 첫 시안 동작 (Step 4 또는 5)
- [ ] 자산 라이선스 명시 (commercial use 확인) — 트랙 종료 전

## 7. References

- 트랙 파일: [track-village-design-mvp.md](../../handover/track-village-design-mvp.md)
- 관련 wiki: (필요 시 트랙 종료 시 추가)
- 관련 learning:
  - [69 — 에셋 모델 큐레이션 vs AI 생성 vs 하이브리드](../../learning/69-asset-model-curated-vs-ai-generation.md)
  - [70 — 마을 차별점 + 에셋 톤 결정](../../learning/70-village-mood-aesthetic-decision.md)
  - [71 — 본심에서 디자인 길어내기 워크샵](../../learning/71-design-tone-from-self-interview.md)
- 외부 자료 (자산 큐레이션):
  - [LimeZu — Modern Interiors](https://limezu.itch.io/modernfurniture)
  - [Cup Nooble — Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack)
  - [Game Endeavor — Mystic Woods](https://game-endeavor.itch.io/mystic-woods)
  - [Kenney — Tiny Town](https://kenney.nl/assets/tiny-town)
  - [freesound.org](https://freesound.org/) (환경음)
  - [Pixabay Music](https://pixabay.com/music/) (BGM)
- 외부 자료 (학술/사례):
  - Sherry Turkle, *Alone Together: Why We Expect More from Technology and Less from Each Other* (2011)
  - Stardew Valley (ConcernedApe) — 따뜻한 픽셀 + 마을 + NPC 결의 표준 사례
  - Spiritfarer (Thunder Lotus) — 따뜻한 일러스트 + 동행 + 명상 톤 (대안 참고)
