---
description: Close a tracked work stream
tags: [harness, skills, track]
version: 1.0.0
---

# Track End

## 목적

트랙 종료 시 산출물, 검증, 문서 정합성을 닫는다.

## 절차

1. Acceptance Criteria 통과 여부를 확인한다.
2. 변경 파일과 테스트 결과를 요약한다.
3. wiki, API, ERD, event 문서 영향이 있는지 확인한다.
4. `docs/handover/track-{id}.md`를 종료 상태로 갱신한다.
5. `docs/handover/INDEX.md`의 활성/완료 상태를 맞춘다.
6. 필요한 learning note와 RESERVED 정리를 수행한다.
7. PR 전 Critic Gates를 통과한다.

## 기존 Claude 자산

- `.claude/skills/track-end/SKILL.md`
