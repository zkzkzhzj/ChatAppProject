---
description: Dispatch independent role agents and integrate their results
tags: [harness, skills, agents, parallel]
version: 1.0.0
---

# Parallel Agent Dispatch

## 목적

서로 독립적인 분석이나 구현 범위를 병렬로 맡기고, 메인 Codex가 결과를 통합한다.

## 사용 조건

- 작업 범위가 도메인, 어댑터, 테스트, 문서처럼 명확히 분리된다.
- 한 역할의 결과가 다른 역할의 입력을 막지 않는다.
- 리뷰 관점이 구현 관점과 독립적이다.
- 컨텍스트 비용보다 병렬 검토 이득이 크다.

## 절차

1. 전체 목표와 완료 조건을 한 문장으로 고정한다.
2. 각 Agent의 입력 파일, 책임 범위, 금지 범위를 적는다.
3. 병렬 실행 가능한 역할만 고른다.
4. 각 결과를 그대로 채택하지 않고 충돌과 누락을 비교한다.
5. 메인 Codex가 최종 변경 계획 또는 구현을 통합한다.
6. 통합 후 Critic Gate와 테스트를 실행한다.

## 입력 템플릿

```text
목표:
범위:
참조 파일:
금지 범위:
필요 산출물:
검증 기준:
```

## 금지

- 같은 질문을 여러 Agent에게 반복해서 묻기
- Agent 결과를 검증 없이 최종 답으로 전달하기
- 파일 소유권이 겹치는 구현을 병렬로 직접 수정하게 하기
- 사용자가 검토만 요청했는데 구현 Agent를 호출하기

## Superpowers 참조

- `dispatching-parallel-agents`
- `subagent-driven-development`
