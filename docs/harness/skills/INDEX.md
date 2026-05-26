---
description: Model-neutral procedural skills for the 마음의 고향 harness
tags: [harness, skills, procedures]
version: 1.0.0
---

# 하네스 스킬

> 이 디렉터리는 반복 절차, 체크리스트, 템플릿 실행을 정의한다.
> 독립 판단이 필요한 역할은 `docs/harness/agents/`에 둔다.

---

## 기본 스킬

| 스킬 | 파일 | 기존 Claude 자산 |
|------|------|------------------|
| Spec New | `spec-new.md` | `.claude/skills/spec-new/SKILL.md` |
| Track Start | `track-start.md` | `.claude/skills/track-start/SKILL.md` |
| Step Start | `step-start.md` | `.claude/skills/step-start/SKILL.md` |
| Track End | `track-end.md` | `.claude/skills/track-end/SKILL.md` |
| Learning Note | `learning-note.md` | `.claude/skills/학습노트/SKILL.md` |
| Handover Update | `handover-update.md` | `stop-handover-check.js`, handover 문서 |
| Docs Consistency Check | `docs-consistency-check.md` | `.claude/agents/docs-agent.md` 일부 |
| Review Capture | `review-capture.md` | `.claude/agents/review-agent.md` 결과 저장 절차 |
| PR Preflight | `pr-preflight.md` | `.claude/agents/pr-agent.md` 일부 |
| Context Health Check | `context-health-check.md` | `.claude/agents/context-health-agent.md` 절차화 |
| Wiki Lint | `wiki-lint.md` | `.claude/skills/wiki-lint/SKILL.md` |
| Branch Cleanup | `branch-cleanup.md` | `.claude/skills/브랜치정리/SKILL.md` |

---

## 서브 에이전트에서 스킬로 뺀 것

| 기존 역할 성격 | 스킬로 뺀 이유 |
|----------------|----------------|
| Docs/Learning Scribe | handover, learning, ADR, 문서 정합성은 반복 절차와 산출 포맷이 핵심이다. |
| PR Agent의 preflight 부분 | PR 생성 자체보다 "PR 전 체크리스트"는 절차다. |
| Context Health Agent | 주기 점검표 성격이 강하다. 독립 판단자는 아니다. |
| Docs Agent 일부 | 문서 정합성 확인은 체크리스트로 표준화할 수 있다. |

남긴 에이전트는 도메인 설계, 기술 선택 비판, 보안/동시성 비판처럼 독립 판단이 필요한 역할이다.
