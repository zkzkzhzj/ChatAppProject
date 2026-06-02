---
description: Start one commit-sized implementation step within a ticket PR
tags: [harness, skills, step]
version: 1.0.0
---

# Step Start

## 목적

한 티켓 PR 안에서 커밋 가능한 작업 단위를 시작한다.

## 절차

1. 현재 track 문서의 로드맵과 티켓 PR 범위를 확인한다.
2. 이번 작업 커밋의 in/out scope를 확정한다.
3. 필요한 Agent를 고른다.
4. 위험도에 따라 Technical Strategy, Security, Concurrency Critic을 붙인다.
5. 성공 기준을 검증 가능한 문장으로 적는다.
6. 구현 후 관련 테스트를 수행하고 하나의 커밋으로 남긴다.
7. 티켓 전체 구현이 끝나면 PR preflight와 Critic Gate를 수행한다.

## 기존 Claude 자산

- `.claude/skills/step-start/SKILL.md`
