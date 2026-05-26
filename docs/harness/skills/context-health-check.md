---
description: Check whether agent context documents are stale or bloated
tags: [harness, skills, context]
version: 1.0.0
---

# Context Health Check

## 목적

하네스 문서가 커지거나 오래되어 세션 품질을 떨어뜨리지 않는지 점검한다.

## 절차

1. `AGENTS.md`, `CLAUDE.md`, `docs/harness/`의 중복 지시를 찾는다.
2. `docs/handover/INDEX.md`와 실제 활성 트랙이 맞는지 확인한다.
3. 오래된 AI Native 결론이 최신 판단을 가리고 있지 않은지 확인한다.
4. 기본 경로에 너무 많은 Agent가 올라와 있지 않은지 확인한다.
5. Skill로 내려야 할 반복 절차가 Agent로 남아 있는지 확인한다.

## 기존 Claude 자산

- `.claude/agents/context-health-agent.md`
