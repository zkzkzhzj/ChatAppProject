---
description: Update handover state for the next session
tags: [harness, skills, handover]
version: 1.0.0
---

# Handover Update

## 목적

다음 세션이 현재 상태를 복원할 수 있도록 작업 결과와 남은 일을 기록한다.

## 절차

1. 활성 트랙이 있으면 해당 `docs/handover/track-{id}.md`를 갱신한다.
2. 단일 작업이면 `docs/handover.md` 갱신 필요 여부를 판단한다.
3. 완료한 것, 결정한 것, 남은 것, 검증 상태를 분리해 쓴다.
4. 충돌 위험 파일과 후속 작업을 명시한다.
5. 메인 handover는 트랙 머지 PR 안에서만 갱신한다.

## 기존 Claude 자산

- `.claude/hooks/stop-handover-check.js`
- `docs/conventions/parallel-work.md`
