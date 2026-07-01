---
description: Preflight checklist before creating or updating a PR
tags: [harness, skills, pr]
version: 1.0.0
---

# PR Preflight

## 목적

PR 생성 전 검증 누락과 절차 위반을 줄인다.

## 절차

1. `docs/conventions/git.md`를 읽고 현재 PR에 적용할 규칙을 확정한다.
2. `git status -sb`로 작업 트리가 의도한 상태인지 확인한다.
3. 브랜치명이 `docs/conventions/git.md` 규칙을 따르는지 확인한다.
   - 맞지 않으면 PR 생성 전에 사용자에게 rename 또는 예외 승인을 받는다.
4. PR base를 확인한다.
   - 현재 원격에 `develop`이 없으면 기본 base는 `main`이다.
   - 문서의 브랜치 전략과 원격 브랜치 현실이 충돌하면 PR 생성 전에 사용자에게 보고한다.
5. 같은 브랜치의 열린 PR이 이미 있는지 확인한다.
   - 이미 있으면 새 PR을 만들지 않고 기존 PR을 갱신한다.
6. 테스트, lint, docs consistency 결과를 확인한다.
7. 위험도에 맞는 Critic Gates를 통과한다.
8. CRITICAL이 0건인지 확인한다.
9. PR 제목을 `type: 간결한 설명` 형식으로 작성한다.
   - 허용 타입: `feat`, `fix`, `refactor`, `infra`, `test`, `docs`, `chore`
   - `[codex]`, `[Claude]`, `WIP:` 같은 도구 prefix를 붙이지 않는다.
   - Draft 여부는 제목이 아니라 GitHub PR 상태로 표시한다.
10. PR 본문을 아래 항목으로 작성한다.
    - `## 변경 사항`
    - `## 왜`
    - `## 영향` 또는 `## 남은 리스크`
    - `## Spec` — `docs/specs/features/{feature}.md` 링크 또는 mini-spec 링크
    - `## 검증`
    - `Closes #N` 또는 이슈가 없는 경우 `Issue: none`
11. `gh pr create --fill`처럼 커밋 메시지에서 제목/본문을 자동 채우는 옵션을 기본값으로 쓰지 않는다.
    - 사용하더라도 생성 직후 이 체크리스트 기준으로 제목과 본문을 수정한다.
12. PR 생성 후 `gh pr view --json title,body,baseRefName,headRefName,isDraft`로 결과를 확인한다.

## 기존 Claude 자산

- `.claude/agents/pr-agent.md`
- `.claude/hooks/pre-bash-guard.js`
