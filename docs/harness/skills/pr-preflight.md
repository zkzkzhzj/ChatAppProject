---
description: Preflight checklist before creating or updating a PR
tags: [harness, skills, pr]
version: 1.0.0
---

# PR Preflight

## 목적

PR 생성 전 검증 누락과 절차 위반을 줄인다.

## 절차

1. 브랜치명이 `docs/conventions/git.md` 규칙을 따르는지 확인한다.
2. 같은 브랜치의 열린 PR이 이미 있는지 확인한다.
3. 테스트, lint, docs consistency 결과를 확인한다.
4. 위험도에 맞는 Critic Gates를 통과한다.
5. CRITICAL이 0건인지 확인한다.
6. PR 설명에 변경 의도, 검증, 남은 리스크를 적는다.

## 기존 Claude 자산

- `.claude/agents/pr-agent.md`
- `.claude/hooks/pre-bash-guard.js`
