# Track: ai-native-2026-05-upgrade

> 작업 영역: AI Native 하네스 진화 — CLAUDE.md 보강 + Skills 마이그 + CodeRabbit 플러그인 + sweep v2 sub-research
> 시작일: TBD (트랙 시작 시 본 줄 갱신)
> Issue: #TBD (gh issue create + label `track:ai-native-2026-05-upgrade`)
> 브랜치: `chore/ai-native-2026-05-upgrade` (main 기준 분기)
> Spec: [docs/specs/features/ai-native-2026-05-upgrade.md](../specs/features/ai-native-2026-05-upgrade.md)
> 사전 ADR: [sweep v1](../knowledge/ai-native/2026-05-ai-native-sweep.md)

## 0. 한 줄 요약

PR #91 종합 점검의 sweep v1 "도입 권고 + 조건부" 매트릭스 반영 + sweep v2 (MCP / AI Eval / AGENTS.md 등) sub-research 통합 트랙. AI Native 하네스를 2026-05 표준에 맞춤.

## 0.5 Acceptance Criteria

- [ ] CLAUDE.md "context 60% 시점 `/compact` 발동" 룰 명시
- [ ] Critical Rules 10개 모두 `<rule id=N>...</rule>` XML 태그 보강
- [ ] CodeRabbit Claude Code 플러그인 설치 + 1주 시범 실행 + 협력 vs 충돌 판단 learning 노트
- [ ] sweep v2 노트 (`docs/knowledge/ai-native/2026-05-ai-native-sweep-v2.md`) 작성 + INDEX 등록
- [ ] (조건부) `track-start` / `track-end` SKILL.md supporting files 분리
- [ ] (조건부) `/discover-domain-patterns` 자체 슬래시 스킬 작성 (Agent OS 패턴 차용)

## 1. 배경 / 왜

PR #91 (`ctx-refresh-post-village-3d`) 의 sweep v1 (`docs/knowledge/ai-native/2026-05-ai-native-sweep.md`) 가 4섹션 (MD vs HTML / Agent OS / Skills 진화 / Claude Code 2026 신기능) 종합 분석 + 도입 매트릭스 박았음. 본 트랙은 그 매트릭스 적용.

추가로 sweep v1 의 누락 영역 (사용자 지적): MCP 생태계 / AI Agent Evaluation / AGENTS.md v1.1 표준 / Karpathy 5월 후속 / k6 LMOps 최신 / 경쟁 환경 (Cursor / Antigravity / Copilot). 본 트랙 Step 0 결박 sweep v2 sub-research.

관련 learning: 작성 예정 (트랙 종료 시)
관련 spec: 본 트랙 spec
관련 incident: 없음

## 2. 전체 로드맵 (1 step = 1 PR · 메타 트랙 결박 결박 결박 결박)

> 본 트랙은 docs / config + slash skill 변경이라 메타·도구 트랙 분류. 1 PR · N commit 채택 검토 (트랙 시작 시 결정).

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 0 | sweep v2 sub-research (research-agent 위임) | — | 대기 | #TBD | — |
| 1 | CLAUDE.md compaction 60% 룰 + Critical Rules XML 태그 | step0 | 대기 | #TBD | — |
| 2 | CodeRabbit Claude Code 플러그인 설치 + 1주 시범 | step1 | 대기 | #TBD | — |
| 3 | (1주 후) CodeRabbit 협력 vs 충돌 판단 + 정책 정착 | step2 + 1주 | 대기 | #TBD | — |
| 4 | track-start / track-end SKILL.md supporting files 분리 | step1 | 대기 | #TBD | — |
| 5 | `/discover-domain-patterns` 자체 슬래시 스킬 (Agent OS 패턴 차용) | step1 | 대기 | #TBD | — |
| 6 | (sweep v2 추가 액션) | step0 | TBD | #TBD | — |

## 3. 현재 단계 상세

**트랙 미시작** — PR #91 머지 후 시작 권장. `/track-start ai-native-2026-05-upgrade` 또는 수동:

1. `gh label create track:ai-native-2026-05-upgrade` + `gh issue create`
2. `docs/handover/INDEX.md` 활성 표 1행 추가
3. `docs/learning/RESERVED.md` 83~85 예약 (이미 pre-scaffold 됨)
4. `git checkout -b chore/ai-native-2026-05-upgrade origin/main`
5. Step 0 (sweep v2 research-agent 위임) 진입

## 4. 충돌 위험 파일

**Tier 1** (공유 — 다른 트랙도 자주 수정):

- `CLAUDE.md` — Step 1 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박. 다른 트랙 (특히 `harden-village-ops`) 와 동시 수정 충돌 위험. 본 트랙 우선 처치 권장 (`harden-village-ops` 결박 결박 결박 결박 결박 결박).
- `.claude/settings.json` — CodeRabbit 플러그인 설치 시 수정 가능.

**Tier 2** (도메인 분리):

- `.claude/skills/track-start/SKILL.md` + `.claude/skills/track-end/SKILL.md` + supporting files
- `.claude/skills/discover-domain-patterns/SKILL.md` (신규)
- `docs/knowledge/ai-native/2026-05-ai-native-sweep-v2.md` (신규)
- `docs/knowledge/INDEX.md` + `changelog.md` (sweep v2 등록)

## 5. 다음 세션 착수 전 확인 사항

- **PR #91 머지 여부 확인** (CodeRabbit/Codex 리뷰 통과 + 사용자 머지)
- **트랙 ⓑ `harden-village-ops` 와 동시 진행 시 CLAUDE.md 수정 충돌 회피** — 본 트랙 Step 1 (CLAUDE.md 보강) 우선 머지 권장
- sweep v1 노트 다시 Read — 적용 매트릭스 / D1~D4 결정 사항 / Out 항목 확인
- main 기준 분기 (PR #91 머지 후 main 결박 결박 결박 결박)
- Step 0 (sweep v2) 결박 `research-agent` 호출 시 sweep v1 와 동일 형식 (frontmatter / 섹션 / 매트릭스) 박을 것 권장

## 6. 보류 메모

- `spec-new` / `step-start` SKILL.md 마이그 — `track-start/end` 만족스러우면 후속 트랙 `skills-migration-batch-2`
- Task budgets / effort levels 정책화 — 큰 트랙 시범 후 별도 정책 트랙
- Memory cross-tool compression (AGENTS.md v1.1) — sweep v2 결과 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박
- 전체 docs/ HTML 마이그 / Agent OS 전체 채택 / Spec-Kit·BMAD·Kiro 채택 — 보류 (sweep v1 결정)
