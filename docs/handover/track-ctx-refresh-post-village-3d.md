# Track: ctx-refresh-post-village-3d ✅ 종료 (2026-05-16)

> 작업 영역: docs (CLAUDE.md / handover / wiki / knowledge) + `.claude/agents/*.md` (3개)
> 시작일: 2026-05-16
> 종료일: 2026-05-16 (1일 트랙)
> Issue: #90
> 브랜치: `chore/ctx-refresh-post-village-3d` (main 기준 분기)
> Spec: [docs/specs/features/ctx-refresh-post-village-3d.md](../specs/features/ctx-refresh-post-village-3d.md)
> Learning: [79 (컨텍스트 노화 사이클 메타 학습)](../learning/79-context-refresh-cycle-meta-learning.md)

## 0. 한 줄 요약

`village-3d` 트랙 머지 후 흩어진 컨텍스트 노화 (2D / Phaser 잔존 문구 · wiki 페이지 코드 불일치 · knowledge 고아 · handover 표 순서 · agents frontmatter 누락) 를 4 step 으로 일괄 정리.

## 0.5 Acceptance Criteria (이게 통과하면 트랙 종료)

- [ ] CLAUDE.md L29 + L44 + `.claude/agents/market-research-agent.md` L11 에 "2D" / "Phaser" 노화 단어 0
- [ ] `docs/wiki/frontend/{phaser-setup, asset-guide}.md` + `docs/wiki/village/character-system.md` 3개 첫 화면에 노화 경고 박스
- [ ] `docs/wiki/INDEX.md` Frontend 섹션 한 줄 요약에 `(Phaser 시점 — 갱신 필요)` 표기
- [ ] `docs/knowledge/INDEX.md` 의 모든 페이지가 실제 파일과 1:1 정합 (고아 0) + 마지막 업데이트 날짜 2026-05-16 으로 갱신
- [ ] `docs/knowledge/changelog.md` — 2026-04-30 karpathy-skills + 2026-05-16 sweep + 3d-chat-ui realtime 이동 모두 박힘
- [ ] `docs/handover.md` §1 "최근 종료 트랙" 표 — village-3d 시간 역순 최상단
- [ ] `docs/handover/track-village-3d.md` step 1.7 — "✅ 머지 / #85" 표기
- [ ] `.claude/agents/blog-writer-agent.md` frontmatter 박힘 (name/description/tools 최소)
- [ ] `.claude/agents/_archive/dependency-tracker-agent.md` description `[ARCHIVED 2026-04-30]` 표기
- [ ] `docs/handover/INDEX.md` L32 트랙 파일 보존 정책 — "후속 의제 살아있는 트랙은 보존" 결로 갱신

> spec §6 Verification 과 1:1 매핑. 트랙 종료 시 같이 체크.

## 1. 배경 / 왜

2026-05-16 종합 점검 (research-agent + context-health-agent + full-review-agent 동시 출격, 결과는 본 트랙 spec §7 References) 에서 발견된 컨텍스트 노화 CRITICAL 2건 + WARNING 3건 + 부수 노화 5건.

가장 큰 비용은 **CLAUDE.md L29 + L44 의 "2D / Phaser" 잔존** — 매 새 Claude 세션이 잘못된 기술 베이스로 시작. wiki frontend 3페이지도 같은 결로 코드 (Three.js) 와 어긋남.

본 트랙은 운영 P1 (트랙 ⓑ) 진입 전에 정확한 컨텍스트를 박는 게 목적이다 — 잘못된 베이스 위에서 spec 박으면 노이즈가 다음 트랙으로 새어 들어간다.

관련 learning: 작성 예정 (learning 79 — 컨텍스트 노화 사이클 메타 학습)
관련 spec: 본 트랙 spec
관련 incident: 없음 (정기 점검 결로 발견)

## 2. 전체 로드맵 (1 step = 1 PR — git.md §4)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 0 | 트랙 시작 절차 + lint config 처치 (pre-commit hook auto-fix 버그) | — | ✅ 완료 | #90 | (트랙 머지 PR) |
| 1 | CLAUDE.md L29+L44 + market-research-agent L11 + handover.md §1 표 + track-village-3d.md step 1.7 정정 | step0 | ✅ 완료 | #90 | (트랙 머지 PR) |
| 2 | wiki frontend 3페이지 노화 경고 박스 + INDEX 카탈로그 표기 | step1 | ✅ 완료 | #90 | (트랙 머지 PR) |
| 3 | knowledge INDEX/changelog 갱신 + 3d-game-chat-ui-patterns realtime 이동 + MD040 disable | step1 | ✅ 완료 | #90 | (트랙 머지 PR) |
| 4 | blog-writer-agent frontmatter + dependency-tracker-agent ARCHIVED + handover/INDEX L32 정책 | step1 | ✅ 완료 | #90 | (트랙 머지 PR) |
| 5 | 트랙 종료 — learning 79 작성 + 메인 handover §1·§2 갱신 + handover/INDEX 활성→완료 + RESERVED 79 사용 완료 + spec/track ✅ 종료 표기 | step4 | ✅ 완료 | #90 | (트랙 머지 PR) |

## 3. 현재 단계 상세

**모든 step 완료** — 6 commit (Step 0~5) 후 트랙 머지 PR 생성 예정.

종료 시점 발견 사항 (learning 79 의 §9):
- "결박" 단어 자가증식 발생 — memory feedback_korean_output_quality 룰 위반. 본 트랙 종료 후 memory 갱신 검토.

**Decision 4축** (spec §4 와 동기화):
- D1 wiki Phaser 3페이지 — 노화 경고 박스 채택
- D2 종료 트랙 파일 보존 — 현실화 (후속 의제 살아있는 트랙은 보존)
- D3 3d-game-chat-ui-patterns 분류 — realtime 카테고리 이동

## 4. 충돌 위험 파일

> parallel-work.md §3 Tier 분류 참조.

**Tier 0** (트랙 단독 사용):
- `docs/specs/features/ctx-refresh-post-village-3d.md`
- `docs/handover/track-ctx-refresh-post-village-3d.md`

**Tier 1** (공유 파일 — 다른 트랙이 동시 수정 가능):
- `CLAUDE.md` — 다른 트랙 (ⓒ ai-native-2026-05-upgrade) 도 수정 예정. 본 트랙 머지 후 ⓒ 시작 결로 충돌 회피.
- `docs/handover.md` — 메인 handover. 머지 PR 안에서만 갱신 (§5).
- `docs/handover/INDEX.md` — 활성 표는 본 트랙 시작 시 1행 추가 (이미 완료), 종료 시 활성→완료 이동 (머지 PR 안).
- `docs/wiki/INDEX.md` — 카탈로그 표기 (본 트랙 외 다른 트랙이 동시 수정 가능성 낮음, 현재 활성 X)

**Tier 2** (도메인 분리 — 충돌 X):
- `docs/wiki/frontend/*.md` (3페이지)
- `docs/wiki/village/character-system.md`
- `docs/knowledge/INDEX.md` · `changelog.md` · `3d-game-chat-ui-patterns.md`
- `.claude/agents/{market-research, blog-writer}.md` · `_archive/dependency-tracker-agent.md`
- `docs/handover/track-village-3d.md` (종료 트랙 파일 — 본 트랙이 수정하는 유일 트랙)

## 5. 다음 세션 착수 전 확인 사항

- 본 트랙 시작 시 main 기준 분기 (현재 HEAD `fc7927f` detached 상태 → main pull 후 새 브랜치)
- ⓐ → ⓑ → ⓒ 순서. ⓐ 종료 후 ⓑ 시작 (CLAUDE.md 수정 충돌 회피)
- 종합 점검 사이클 메타 학습 (learning 79) 은 본 트랙 종료 시점에 작성. 사이클 자체를 기록.

## 6. 보류 메모

- CLAUDE.md §5 / §7 구조 압축 — 별도 트랙 (`ctx-claude-md-slim`) 후보
- wiki 13페이지 `last-verified` 일괄 갱신 — 본문 검증 동반. 별도 트랙
- wiki `frontend/three-setup.md` 신규 작성 — frontend 코드 트리 정리 동반. 별도 트랙
- 종료 트랙 파일 7개 실제 삭제·이동 — 본 트랙은 정책 갱신만, 실제 정리는 후속
- memory/project_next_session.md + infra_worktree_state.md 갱신 — 사용자 메모리 영역
