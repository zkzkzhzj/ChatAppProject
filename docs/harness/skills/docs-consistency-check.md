---
description: Check whether code changes require document updates
tags: [harness, skills, docs]
version: 1.0.0
---

# Docs Consistency Check

## 목적

코드 변경과 문서가 어긋나지 않도록 필요한 문서 반영 여부를 확인한다.

## 절차

1. 새 Entity가 있으면 ERD 문서 영향을 확인한다.
2. 새 Controller/API가 있으면 API 명세 영향을 확인한다.
3. 새 Kafka event/consumer/producer가 있으면 event 명세 영향을 확인한다.
4. 새 기술 선택이 있으면 ADR 또는 learning note 필요성을 확인한다.
5. 변경이 없다고 판단하면 그 이유를 완료 보고에 남긴다.

## 기존 Claude 자산

- `.claude/agents/docs-agent.md`
- `.claude/hooks/pre-bash-guard.js`
