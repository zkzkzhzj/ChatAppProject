---
feature: ctx-refresh-post-village-3d
track: ctx-refresh-post-village-3d
issue: "#90"
status: complete
created: 2026-05-16
last-updated: 2026-05-16
---

# 컨텍스트 노화 정리 — village-3d 머지 후 잔존 사실 갱신

> 이 spec 은 트랙 `ctx-refresh-post-village-3d` (Issue #90) 의 **요구사항 진실** 이다.
> 진행 상태는 `docs/handover/track-ctx-refresh-post-village-3d.md`, 결정의 사고 과정은 `docs/learning/`.
> 트리거: 2026-05-16 종합 점검 (`research-agent` + `context-health-agent` + `full-review-agent` 동시 출격) 에서 발견된 CRITICAL 2건 + WARNING 3건의 일괄 정리.

---

## 1. Outcomes

- **새 Claude 세션이 CLAUDE.md 를 읽을 때** "3D 마을 + Three.js + Howler" 베이스가 정확히 박힌다 (현재 "2D 공간 / Phaser" 노화로 매 세션마다 잘못된 베이스).
- **새 세션이 wiki frontend 결로 진입할 때** Phaser 시대 본문이라는 노화 경고가 즉시 보인다 (스크롤 없이 첫 화면).
- **knowledge 자가증식 시스템**이 정합한다 — 고아 문서 0, changelog 누락 0.
- **handover.md §1 "최근 종료 트랙" 표**가 시간 역순으로 정합한다 (village-3d 가 최상단).
- **blog-writer-agent 호출**이 라우팅에 매칭된다 (frontmatter 박힘).
- **market-research-agent**가 "2D 공간" 자가증식을 멈춘다.
- **종료 트랙 파일 보존 정책**이 현실 (7개 잔존) 과 정합한다.

## 2. Scope

### 2.1 In (이번 트랙에서 만든다)

- `CLAUDE.md` L29 + L44 사실 정정 (2D → 3D / Phaser → Three.js + Howler)
- `.claude/agents/market-research-agent.md` L11 "2D 공간" 정정
- `docs/handover.md` §1 "최근 종료 트랙" 표 — village-3d 를 시간 역순 최상단으로 이동
- `docs/handover/track-village-3d.md` step 1.7 — "🟢 작업 완료·검증 중 / (작업 중)" → "✅ 머지 / #85"
- `docs/wiki/frontend/phaser-setup.md` + `asset-guide.md` + `docs/wiki/village/character-system.md` — 본문 최상단 노화 경고 박스 (NOTICE) + `docs/wiki/INDEX.md` 카탈로그에 `(Phaser 시점 — 갱신 필요)` 표기
- `docs/knowledge/INDEX.md` 갱신:
  - `3d-game-chat-ui-patterns.md` 분류 결정 후 등록 (realtime 카테고리로 이동 권장)
  - `2026-05-ai-native-sweep.md` 신규 등록 (이미 작성됨)
  - `karpathy-skills-analysis.md` 등재 정합 재확인
  - 마지막 업데이트 날짜 갱신 (2026-04-30 → 2026-05-16)
- `docs/knowledge/changelog.md` — 2026-04-30 karpathy-skills 항목 누락 보강 + 2026-05-16 sweep 항목 추가 + 3d-game-chat-ui-patterns 분류 이동 항목
- `.claude/agents/blog-writer-agent.md` — frontmatter (name/description/tools) 5줄 추가
- `.claude/agents/_archive/dependency-tracker-agent.md` description 에 `[ARCHIVED 2026-04-30 — Dependabot 으로 대체. 호출 X.]` 결로 강화 (우연한 라우팅 차단)
- `docs/handover/INDEX.md` L32 트랙 파일 보존 정책 — "후속 의제 살아있는 트랙은 보존" 결로 현실화

### 2.2 Out (이번 트랙에서 명시적으로 안 만든다)

- **CLAUDE.md §5 / §7 구조 압축** — 본문 검증 동반 필요. 별도 트랙 (`ctx-claude-md-slim`) 후보.
- **wiki 13페이지 `last-verified` 일괄 갱신** — frontmatter 만 갱신하면 코드 불일치를 가린다. 본문 검증 동반 필요. 별도 트랙.
- **wiki `frontend/three-setup.md` 신규 작성** — Three.js 본문 신규 작성은 코드 트리 정리 (`frontend/src/three/*`) 동반 필요. 본 트랙은 노화 경고만.
- **종료 트랙 파일 7개 실제 삭제·이동** — 정책 갱신 후 별도 작업.
- **memory/project_next_session.md + infra_worktree_state.md 갱신** — 사용자 메모리 영역. 사용자 직접 갱신.
- **운영 P1 (JWT_SECRET / idempotency leak)** — 트랙 ⓑ `harden-village-ops` 로 분리.
- **AI Native 진화 반영 (compaction 60% / CodeRabbit / XML 태그)** — 트랙 ⓒ `ai-native-2026-05-upgrade` 로 분리.

## 3. Constraints

| 차원 | 제약 |
|------|------|
| 성능 | 영향 X (docs / config only) |
| 비용 | 영향 X |
| 시간 | 1~2일 (4 step) |
| 인프라 | 영향 X (백엔드 / 프론트 코드 변경 X) |
| 정책/규제 | 영향 X |

## 4. Decisions

### D1. [헥사고날 경계 / 본질 가치] wiki Phaser 3페이지 — 노화 경고 박스 vs archive vs 즉시 갱신

- **왜**: **노화 경고 박스** 가 정답. 정보 손실 0 + 사실 X 명시 + 다음 트랙이 Three.js 본문을 신규 작성할 때 비교 베이스로 활용 가능.
- **대안**:
  - archive — 정보 손실. Phaser 시절 결정·삽질이 다음 세션에 안 들어옴.
  - 즉시 Three.js 본문 갱신 — 코드 트리 정리·검증 동반 필요. 본 트랙 스코프 초과.
- **빈틈**: 다음 트랙이 Three.js 본문 작성 미시작 시 wiki 페이지가 영원히 노화 경고만 박힘.
- **재검토 트리거**: 다음 세션이 phaser-setup.md 진입 후 혼란 신호 → archive 로 전환. 또는 frontend 트랙 시작 시 즉시 Three.js 본문 작성.

### D2. [정책] 종료 트랙 파일 보존 정책 — 일괄 삭제 vs 현실화

- **왜**: **현실화** — 후속 의제 살아있는 트랙 (`ws-redis` Step 3, `token-auto-renewal` 재개) 의 파일을 다음 세션이 참조한다. 일괄 삭제는 정보 손실.
- **대안**:
  - 일괄 삭제 — 정책 단순화 + 정보 손실.
  - 보존 기한 N개월 룰 — 명확하나 자의적.
- **빈틈**: "후속 의제 살아있는 트랙" 판단이 주관적. 향후 세션이 "이 트랙은 살아있나?" 라고 매번 물을 수 있음.
- **재검토 트리거**: 종료 트랙 파일 15개 이상 누적 → 일괄 정리 트랙으로 별도 진행.

### D3. [DB 스키마 / 정합성] `3d-game-chat-ui-patterns.md` 분류 — realtime 이동 vs 신규 카테고리 vs 루트 보존

- **왜**: **realtime 카테고리로 이동**. 본 문서는 3D 채팅 UI 패턴 (말풍선·입력·내역) 비교라 realtime 카테고리에 자연 정합.
- **대안**:
  - `docs/knowledge/frontend-3d/` 신규 카테고리 — 추후 Three.js 관련 문서가 더 쌓이면 그때 분기.
  - 루트 보존 — 분류 X 결로 고아 누적.
- **빈틈**: 추후 frontend-3d 결 문서가 누적되면 카테고리 분기 필요.
- **재검토 트리거**: realtime 카테고리에 frontend 결 문서 3개 이상 누적 시 frontend-3d 카테고리 분기.

## 5. Tasks (= Steps)

> **1 step = 1 PR** — git.md §4. 본 트랙은 메타·도구 트랙이 아니라 일반 트랙이므로 엄격 적용.

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| 1 | CLAUDE.md L29+L44 + market-research-agent L11 + handover.md §1 표 + track-village-3d.md step 1.7 정정 | — | `CLAUDE.md`, `.claude/agents/market-research-agent.md`, `docs/handover.md`, `docs/handover/track-village-3d.md` | #90 | TBD |
| 2 | wiki frontend 3페이지 노화 경고 박스 + `docs/wiki/INDEX.md` 카탈로그 표기 | step1 | `docs/wiki/frontend/phaser-setup.md`, `asset-guide.md`, `docs/wiki/village/character-system.md`, `docs/wiki/INDEX.md` | #90 | TBD |
| 3 | knowledge INDEX/changelog 갱신 + `3d-game-chat-ui-patterns.md` realtime 이동 | step1 | `docs/knowledge/INDEX.md`, `docs/knowledge/changelog.md`, `docs/knowledge/realtime/INDEX.md`, `docs/knowledge/3d-game-chat-ui-patterns.md` → `docs/knowledge/realtime/3d-game-chat-ui-patterns.md` | #90 | TBD |
| 4 | blog-writer-agent frontmatter + dependency-tracker-agent description ARCHIVED + `docs/handover/INDEX.md` L32 정책 갱신 | step1 | `.claude/agents/blog-writer-agent.md`, `.claude/agents/_archive/dependency-tracker-agent.md`, `docs/handover/INDEX.md` | #90 | TBD |

## 6. Verification (수용 기준)

- [ ] CLAUDE.md L29 + L44 + market-research-agent L11 에 "2D" / "Phaser" 노화 단어 0
- [ ] wiki frontend 3페이지 본문 첫 화면에 노화 경고 박스 (스크롤 X 첫 시각 진입)
- [ ] `docs/wiki/INDEX.md` Frontend 섹션 한 줄 요약에 `(Phaser 시점 — 갱신 필요)` 표기
- [ ] `docs/knowledge/INDEX.md` 의 모든 페이지가 실제 파일과 1:1 정합 (고아 0)
- [ ] `docs/knowledge/changelog.md` 2026-04-30 항목 (karpathy-skills) + 2026-05-16 항목 (sweep + 3d-chat-ui realtime 이동) 박힘
- [ ] `docs/handover.md` §1 "최근 종료 트랙" 표 — village-3d 가 시간 역순 최상단
- [ ] `docs/handover/track-village-3d.md` step 1.7 — "✅ 머지 / #85" 표기
- [ ] `.claude/agents/blog-writer-agent.md` 1~5 줄 frontmatter (name/description/tools)
- [ ] `.claude/agents/_archive/dependency-tracker-agent.md` description 에 `[ARCHIVED 2026-04-30]` 표기
- [ ] `docs/handover/INDEX.md` L32 정책 — "후속 의제 살아있는 트랙은 보존" 결로 갱신

## 7. References

- 트랙 파일: [track-ctx-refresh-post-village-3d.md](../../handover/track-ctx-refresh-post-village-3d.md)
- 관련 wiki: [docs/wiki/frontend/phaser-setup.md](../../wiki/frontend/phaser-setup.md) · [asset-guide.md](../../wiki/frontend/asset-guide.md) · [docs/wiki/village/character-system.md](../../wiki/village/character-system.md)
- 관련 learning: 79 (작성 예정 — 컨텍스트 노화 사이클 메타 학습)
- 관련 knowledge: [docs/knowledge/ai-native/2026-05-ai-native-sweep.md](../../knowledge/ai-native/2026-05-ai-native-sweep.md) — 본 트랙과 같은 사이클에서 작성
- 외부 자료: 2026-05-16 종합 점검 — research-agent + context-health-agent + full-review-agent

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-16 | 초안 작성 (종합 점검 결로 트랙 시작) |
