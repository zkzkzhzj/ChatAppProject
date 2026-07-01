# 72 — Phaser 2D → Three.js 3D 전환 결정: 도피 진단 vs 시각 욕심 구분 + 안식처 가드레일

> 트랙 `village-design-mvp` (Step 2 진행 중) 에서 큐레이션 자산으로 안식처·Alone Together 결 표현 한계 인정 + 사용자 결 명시 박음 (시안 거부 누적 → 3D 시각 욕심).
> 결과: 트랙 종료 + 새 트랙 `village-3d` 신설. spec D3 ("3D 전환 거부") → 6일 후 정정.
> 작성일: 2026-05-10

---

## 1. TL;DR

큐레이션 자산만으로 안식처·Alone Together 결 표현 한계 도달 → Three.js 기본 geometry 결로 시각 차원 전환.
본질 가치 D6 4축은 시각 차원 독립 → 새 트랙으로 승계.
3D = ZEP 메타버스 회귀 위험 → 안식처 가드레일 6축 spec 으로 보존.

## 2. 결 박힌 사고 과정

### 2.1 시안 거부 누적 (며칠, 5회)

- Cozy Asset Pack 시안 1 Plaza-centric / 2 Forest Village / 3 Symmetric Garden — 사용자 모두 거부 ("화장실에 가스렌지" 결)
- 본질 진단: AI sprite 자동 배치 한계. messenger.abeto.co = 사람이 일러스트 한 장 직접 그림 (자산 자체 차이)
- 우리 길: 자산 풍부 큐레이션 (LimeZu Serene Village CC BY 4.0) + 본질 가치 (D6 4축) 병행 — 그래도 시각 한계

### 2.2 흔들림 사이클 (2026-05-04 ~ 05-10, 6일)

1. 디자인 막힘 → 의욕 ↓
2. ZEP 차별점 의문 → 본질 흔들림 → **활동 메타버스 (3D + 음성 + 화면공유) 회귀 시도**
3. learning 71 §2 인용 → 본심 회복 (사용자 본인이 "도피" 인정)
4. 자산 결정 (LimeZu CC BY 4.0) → 한 발 회복
5. 마을 확장 + zone 분할 결정 → 한 발 회복
6. 마을 레이아웃 정리 (입구·캠프파이어·연못·도서관 세로 구도) → 한 발 회복
7. **"이 구성이면 3D 가도 괜찮을 거 같다" → 시각 욕심 신호**

### 2.3 도피 진단 vs 시각 욕심 — 어떻게 구분했나

**시니어 진단 (Claude)**:
- "직전 결 박은 직후 큰 결정 = learning 71 §2 도피 패턴 시그널" 짚음
- 비용 정직 박음 (사실상 새 프로젝트 / 자산 폐기 / 시간 ×10 / ZEP 결 회귀 위험)
- 차별점 진단 — "시각 차원 X, D6 4축 코드가 차별점"
- 권유 — Step 9 환경음 1~2h 먼저 박고 결정

**사용자 답변**:
- "3D로 가자. 이건 도피가 아니야. 더 멋있는 마을과 사람들의 소통이 보고싶어서. 자산 다 폐기 OK, 기본 자원으로 가자"
- 명시적 결 박음 — 도피 X 시각 욕심
- 추가: 점프 OK (가벼운 깡총), 뛰기 X — 안식처 결 정합 신호

**구분 방법론** (자기 정정 추적용):

| 신호 축 | 도피 결 | 시각 욕심 결 |
|---|---|---|
| 시점 | 디자인 막힘 직후 큰 결정 | 한 발 회복 후 결정 |
| 차별점 인지 | 차별점 코드 X 상태 | 차별점 코드 인지 + 가드레일 박음 |
| 결정 누적 | 큰 결정 후 또 큰 결정 (3D → 음성 → ...) | 본질 가치 (4축) 유지 결 |
| 발화 | "ZEP 보다 더 화려" | "Alone Together 결을 3D 공간감으로 표현" |
| 결 박은 후 | 흔들림 재발 | 안식처 가드레일 박음 |

→ 사용자 본인이 마지막 답 박음. 외부 (시니어) 단정 X. **신호만 짚는 결**.

## 3. Phaser 2D vs Three.js 3D 트레이드오프

| 축 | Phaser 2D | Three.js 3D |
|---|---|---|
| 자산 비용 | 픽셀 sprite (CC0 풍부, Kenney · LimeZu) | 3D 모델 (CC0 좁음, Quaternius · Sketchfab · Kenney 3D) |
| 학습 곡선 | 낮음 (게임 + JS) | 높음 (셰이더 · 라이팅 · 카메라 · LOD · 애니메이션) |
| 코드 양식 | 2D Tilemap · Sprite · Physics (Arcade) | Mesh · Material · Light · Camera · AnimationMixer |
| 성능 | 가벼움 (모바일 OK) | 무거움 (GPU · VRAM · 로딩) |
| 차별점 결 | Stardew · 동물의 숲 (정적 안식처) | ZEP · VRChat (활동 메타버스, 회귀 위험) |
| 디자인 막힘 | sprite 자동 배치 한계 | 3D 모델 배치는 차원 더 어려움 |
| Time-to-PoC | 1주 (자산 있음) | 1주 (basic geometry) ~ 1개월 (모델 통합) |
| Alone Together 표현 | 2D 정적 결 자연 | 3D 공간감으로 표현 시도 (가능성) |
| 모바일 | OK (CLAUDE.md §2 = 데스크탑 우선이지만 가능) | 약함 (GPU · 발열) — 데스크탑 only 정합 ◎ |

## 4. 본질 가치 (D6 4축) 시각 차원 독립

- **(i) NPC 매일 안부 카드** — 시각 X, 백엔드 (스케줄러) · UI (카드 컴포넌트)
- **(iii) 비동기 편지·고해 도서관** — 시각 X, 데이터 (confessions·comments DB) · UX (책장 · 책상 · 모달)
- **(v) 자연 환경음** — 시각 X, 오디오 (Howler.js + freesound.org)
- **(vii) 안식 의식 공간** — 시각 일부 (책상 · 의자 · 노트 메타포), 결은 동일

**결론**: 시각 차원 (2D ↔ 3D) 변경 시에도 차별점 결 유지 가능.
but 차별점 코드 X 면 시각만 바꿔도 ZEP 결로 회귀.
→ 새 트랙은 **시각 차원 전환 + 본질 가치 4축 1개 이상 첫 시안 동시 박음** 결.

## 5. 안식처 가드레일 6축 (3D 에서 ZEP 회귀 막는 spec)

| 축 | 결 | 위반 시 신호 |
|---|---|---|
| 카메라 | 정적 + 천천히 follow. orbit 자유 회전 X | 사용자가 마우스로 빙빙 돌리는 결 → ZEP |
| 라이팅 | warm tone (오후 햇살) + soft shadow + Fog | 차가운 흰 라이팅 → 사무실 결 |
| 물리 | 걷기 + **점프 (가벼운 깡총, 높이 낮음)** + 뛰기·달리기 X | 빠른 이동 → VRChat 결 |
| 카메라 워크 | 페이드 + 천천히 zoom | 영화적 회전 → 게임 결 |
| 음향 | 환경음 (물 · 바람 · 새) 우선, BGM 잔잔 | EDM · 시끄러운 BGM → 게이머 결 |
| UI | 텍스트 익명, 음성 · 화면공유 X | 음성 채팅 추가 → 활동 메타버스 |

→ 새 spec `village-3d.md` 의 D11 (또는 별 결정 번호) 박음.

## 6. 마을 레이아웃 (사용자 결 박음, 2026-05-10)

```text
        ╱╲╱╲╱╲ 숲 wall (collision) ╱╲╱╲╱╲
       🌲                              🌲
       🌲      🏛️ 마음 도서관           🌲
       🌲       ↑ Three.js Scene 전환    🌲
       🌲          (URL 안 바뀜)         🌲
       🌲                              🌲
       🌲    ~ 연못 (물소리) ~          🌲
       🌲                              🌲
       🌲       🔥 캠프파이어            🌲
       🌲       (NPC 자리 · D6 통합)    🌲
       🌲                              🌲
       🌲       🚪 마을 입구             🌲
       🌲       (캐릭터 spawn)          🌲
        ╲╱╲╱╲╱ 숲 wall (collision) ╲╱╲╱╲╱
```

- 도서관 = "마음 도서관" 메타포 (고해소 진중함 X, 따뜻한 결 — 사용자 톤 결 선택)
- 진입 = **별도 Three.js Scene 결** (`VillageScene` → `LibraryScene`, 같은 React 페이지 안 state 결로 전환, URL 안 바뀜) — Phaser Scene Manager 결 X. Three.js 는 `THREE.Scene` 인스턴스 결로 두 개 박고 React state 결로 mount 결 박음 (또는 R3F 의 컴포넌트 mount/unmount 결). 결 박는 결 = 게임 결 자연 (Stardew 결로 농장↔마을 화면 전환 결 정합)
- 책장 = 사람들이 두고 간 글, 책상 = 글 쓰기, 댓글 다대다 + NPC 답변 1개 자동
- AI 추천 = "비슷한 마음의 책" 사이드바 (작성 중 실시간, 임베딩 + 벡터 검색)
- 익명성 = 자동 랜덤 닉 ("오후 3시의 누군가" 결, 완전 익명 X)

## 7. spec 정정 결 박음

- 옛 spec [village-design-mvp.md](../specs/features/village-design-mvp.md) → status `closed-superseded`
- D3 ("3D 전환 거부") → 재검토 트리거 ("큐레이션 자산만으로 디자인 영혼 표현 한계") 도달로 정정
- 새 spec `village-3d.md` 결 박음 (트랙 시작 PR 결로 박을 것):
  - **D-prev (정정)** — Phaser 2D → Three.js 3D 전환 결정 (왜 · 대안 · 빈틈 · 재검토 4축)
  - D1 안식처 + D2 Alone Together + D6 4축 결 그대로 승계
  - **D11 안식처 가드레일 6축** 박음

## 8. 자기 정정 추적

- 정정 시점: 2026-05-04 (D3 박음) → 2026-05-10 (정정) — **6일**
- 트리거: D3 재검토 트리거 ("큐레이션 자산만으로 디자인 영혼 표현 한계") 명시 도달
- 다음 정정 트리거 후보:
  - 3D 결도 "화장실 가스렌지" 신호 (시안 거부 누적 ≥ 3)
  - WebGL 성능 부족 (FPS 30 미만 / 로딩 5초 이상)
  - 사용자 본심 결 "안식 < 활동" 신호
- 6개월 후 본 결정 평가: 정직 결 (트리거 도달) 인지 도피 결 (단순 어색) 인지 사용자 본인 결 박음.

## 9. 메타 학습

### 9.1 신호 짚기 vs 단정

시니어 결로 도피 시그널 짚되, "이건 도피야" 단정 X. 사용자 결 박음 결 침해.
- 신호 = "직전 결 박은 직후 큰 결정 = learning 71 §2 도피 패턴 시그널"
- 단정 = "이건 도피야"
- 결: 신호만 짚고 비용 정직 박고 권유 (Step 9 환경음 먼저). 본인이 결 박음.

### 9.2 표면 답 vs 본질 답 분기 (`feedback_essence_first_when_stuck.md`)

본 결정이 표면인지 본질인지는:
- 사용자가 차별점 결 인지하는가?
- 결 박은 후 안식처 가드레일 박는가?
- 본질 가치 (D6 4축) 코드 결 박는가?

→ 본 결정은 본질 결 — 사용자가 차별점 인지 + 가드레일 인지 + 마을 레이아웃에 본질 가치 박음 (도서관 = 비동기 편지·고해 / 캠프파이어 = NPC 안부 / 연못 = 환경음).

### 9.3 자산 모델 + 본질 가치 병행

시각 차원만으로 차별점 만들 수 없음 (learning 71 §2 결).
D6 4축 코드 결이 진짜 차별점.
→ 새 트랙 Step 1·2 = 시각 결 (3D PoC), Step 3·4 = 본질 가치 (환경음·NPC·도서관) 병행.

### 9.4 마플 커피챗 결 정합 (`marpple_coffee_chat_insights.md`)

- 트레이드오프 토론 → 위 §3 표 박음
- 시스템적 빈틈 방어 → 안식처 가드레일 6축 박음 (위반 시 신호 명시)
- 헥사고날·자산 모델 절대화 X → D3 거부를 6일 만에 정정
- AI 결에 끌려다니지 말 것 → 사용자 결 박음 (시니어 진단 X 시각 욕심)

## 10. 참조

- 옛 spec [village-design-mvp.md](../specs/features/village-design-mvp.md) (closed-superseded, D3 정정)
- 새 spec `docs/specs/features/village-3d.md` (트랙 시작 PR 결, 미작성)
- learning [69 — 에셋 모델 큐레이션 vs AI](./69-asset-model-curated-vs-ai-generation.md)
- learning [70 — 마을 톤·미감 결정](./70-village-mood-aesthetic-decision.md)
- learning [71 — 디자인 톤 자기 인터뷰 (§2 도피 패턴)](./71-design-tone-from-self-interview.md)
- village-design-mvp 트랙 결정 이력 (✅ 종료, spec/learning에 보존)
- 메모리 `feedback_essence_first_when_stuck.md` · `marpple_coffee_chat_insights.md`
- 외부 자료:
  - Three.js 공식 [threejs.org](https://threejs.org)
  - React Three Fiber [r3f docs](https://docs.pmnd.rs/react-three-fiber)
  - Quaternius CC0 3D [quaternius.com](https://quaternius.com)
  - Kenney 3D Pack [kenney.nl/assets](https://kenney.nl/assets)
  - Howler.js (3D positional audio + Three.js PositionalAudio) — 환경음
