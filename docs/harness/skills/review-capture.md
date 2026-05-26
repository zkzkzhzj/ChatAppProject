---
description: Save review results in a stable report format
tags: [harness, skills, review]
version: 1.0.0
---

# Review Capture

## 목적

리뷰 결과를 대화에 흘려보내지 않고 `docs/reviews/YYYY-MM-DD/`에 저장한다.

## 절차

1. 리뷰 대상과 변경 파일을 기록한다.
2. [CRITICAL], [WARNING], [INFO], LGTM로 결과를 분리한다.
3. 가능하면 파일명:라인번호를 포함한다.
4. 긴 원문은 리뷰 파일에 저장하고 사용자에게는 핵심만 보고한다.
5. 기존 사용자 리뷰 파일을 덮어쓰지 않는다.

## 기존 Claude 자산

- `.claude/agents/review-agent.md`
- `.claude/agents/full-review-agent.md`
