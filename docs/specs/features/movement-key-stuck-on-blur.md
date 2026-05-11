---
feature: movement-key-stuck-on-blur
track: village-3d
issue: (별도 핫픽스, 트랙 진행 중 발견)
status: draft
created: 2026-05-11
last-updated: 2026-05-11
type: bug-fix
---

# 캐릭터 이동 키 stuck — window blur·visibility change 시 keys 미초기화

> 본 spec 은 §5.2 버그 수정 흐름의 mini-spec.
> 트랙 `village-3d` Step 1 PoC 머지(PR #68) 후 사용자 채팅 검증 단계에서 발견.

---

## 1. Outcomes

- 이동 키 (WASD·방향키) 누른 상태에서 다른 창·바탕화면 클릭·브라우저 메뉴 진입 시 캐릭터가 멈춤
- 탭 비활성화 (`document.hidden`) 시도 캐릭터 멈춤
- 다시 게임 화면 돌아오면 빈 입력 상태로 자연스럽게 재시작

## 2. Scope

### 2.1 In

- `frontend/src/three/input.ts` 의 InputState 클래스에 blur/visibilitychange 핸들러 추가
- `release()` 메서드 — 누른 키 set 전부 clear
- destroy 시 새 리스너 cleanup
- vitest 단위 테스트 — blur · visibilitychange 시 release 동작 확인

### 2.2 Out

- pointer 이동 (모바일 터치) — 본 fix와 무관 (PoC에는 박혀있지 않음)
- 게임패드 입력 — 트랙 범위 밖
- 키 매핑 변경 — 트랙 범위 밖

## 3. Constraints

| 차원 | 제약 |
|------|------|
| 호환 | window·document 이벤트 표준 API만 사용 (브라우저 의존성 X) |
| 성능 | release 호출 비용 O(1) (Set.clear) |
| 테스트 | jsdom 환경에서 단위 테스트 가능 (실제 OS blur 시뮬은 fireEvent) |

## 4. Decisions

### D1. blur 이벤트 + visibilitychange 둘 다 박음

- **왜**:
  - `window.blur` 단독 — 다른 창으로 포커스 가져갈 때 (Alt+Tab, 바탕화면 클릭, 브라우저 메뉴) 잡힘
  - `document.visibilitychange` + `document.hidden` — 탭 전환·최소화 시 잡힘 (blur가 항상 박히진 않음)
  - 둘은 trigger 시점이 다름 — 둘 다 박는 게 안전 (멱등)
- **대안**:
  - blur 하나만 — 탭 전환 케이스 누락 가능 (브라우저 별로 동작 다름)
  - visibilitychange 하나만 — 같은 창 내 다른 element 포커스 시 안 잡힘
  - mouseleave 추가 — 게임 캔버스 밖으로 마우스 나가도 멈춤? — **거부** (사용자 의도와 다름, 마우스 위치 무관하게 이동 가능해야 함)
- **빈틈**: 키 떼는 순간이 blur·visibility 직전이면 keyup이 다른 창으로 가서 못 받지만 release가 다음 trigger 결로 클리어 — 시각적으로 1프레임 멈춤 지연 가능
- **재검토 트리거**: 사용자가 "캐릭터가 의도와 다르게 멈춘다" 신호 (예: 탭 전환 후 돌아왔을 때 이동 의도 있었는데 release 됐다)

### D2. `release()` 헬퍼 메서드 박음

- **왜**: blur · visibilitychange · 향후 reset 시나리오 (예: 채팅 입력 포커스) 에서 동일 동작 공유. 단일 진실 + 테스트 단위
- **대안**: 인라인 `this.keys.clear()` — 거부 (테스트 어려움, 향후 확장 어려움)
- **빈틈**: 없음 — 단순 wrap
- **재검토 트리거**: 입력 상태 결박 다른 필드 추가 시 (예: lastDirection)

## 5. Tasks (= Steps)

| Step | 내용 | PR |
|------|------|-----|
| 1 | input.ts 수정 + vitest 단위 테스트 + 사용자 dev 검증 | (본 PR) |

## 6. Verification

- [ ] 단위 테스트 통과 — blur 발생 시 `keys` set 빈 상태
- [ ] 단위 테스트 통과 — `document.hidden = true` + visibilitychange 발생 시 `keys` set 빈 상태
- [ ] 단위 테스트 통과 — destroy 후 blur 발생해도 release 안 호출됨 (리스너 제거 검증)
- [ ] 사용자 dev 검증 — WASD 누른 채 바탕화면 클릭 → 캐릭터 즉시 멈춤
- [ ] 사용자 dev 검증 — WASD 누른 채 다른 탭으로 전환 → 돌아왔을 때 캐릭터 멈춰있음

## 7. References

- 트랙: [track-village-3d.md](../../handover/track-village-3d.md)
- 관련 코드: `frontend/src/three/input.ts` (Step 1 PR #68 결박 박힘)
- learning 26 — Phaser HTML 포커스 충돌 (옛 트랙, Phaser 기준 — Three.js 결도 같은 원리)
