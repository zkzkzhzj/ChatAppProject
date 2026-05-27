---
description: Superpowers-inspired harness adoption notes
tags: [harness, superpowers, skills, workflow]
version: 1.0.0
---

# Superpowers 도입 검토

> 참조: <https://github.com/obra/superpowers>
> 이 문서는 Superpowers를 그대로 벤더링하지 않고, 마음의 고향 하네스에 맞게 흡수할
> 운영 규칙을 정리한다.

---

## 판단 요약

Superpowers의 핵심은 특정 Claude Code 플러그인이 아니라, 작업 전반에 스킬을
자동 트리거하는 개발 방법론이다.

우리 하네스에는 이미 다음 기반이 있다.

- `AGENTS.md`: Codex 기본 오케스트레이터
- `docs/harness/agent-orchestration.md`: 역할형 서브 에이전트
- `docs/harness/skills/`: 반복 절차와 체크리스트
- `docs/harness/critic-gates.md`: 리뷰/검증 게이트

따라서 도입 방향은 "Superpowers 설치를 필수화"가 아니라 "좋은 트리거와 절차를
모델 중립 하네스에 반영"이다.

---

## 바로 채택할 것

| Superpowers 개념 | 우리 하네스 적용 |
|------------------|------------------|
| brainstorming | 요구가 모호하거나 설계 선택지가 여러 개인 경우, 구현 전 짧은 설계 대화를 먼저 한다. |
| writing-plans | 큰 변경은 `spec-new`, `track-start`, `step-start`로 계획을 쪼갠 뒤 진행한다. |
| using-git-worktrees | 병렬 기능 개발, 장기 작업, 충돌 위험이 큰 작업에서 격리 워크트리를 우선 고려한다. |
| dispatching-parallel-agents | 독립 영역이 분명할 때만 Domain/Adapter/Test/Critic 역할을 병렬로 쓴다. |
| requesting-code-review | 위험 변경은 커밋 전 또는 PR 전 Critic gate를 통과시킨다. |
| finishing-a-development-branch | 작업 종료 시 검증, PR/merge/보류 판단, 브랜치 정리를 체크리스트로 끝낸다. |

---

## 기본 트리거

| 상황 | 기본 행동 |
|------|-----------|
| 요구가 한 문장이고 구현 범위가 불명확함 | brainstorming 방식으로 목표, 비목표, 성공 조건을 먼저 확인 |
| 새 기능, 새 API, DB 변경, 하네스 변경 | 계획을 먼저 작성하고 작은 단계로 나눔 |
| 여러 파일/계층을 동시에 바꾸는 기능 | 역할별 에이전트 또는 병렬 분석을 검토 |
| 같은 저장소에서 다른 작업이 진행 중 | git worktree 또는 새 브랜치 격리를 검토 |
| 보안, 인증, 동시성, 멱등성, 메시징 변경 | 해당 Critic을 필수 호출 |
| 작업 완료 직전 | 테스트, lint, 문서 정합성, PR preflight를 확인 |

---

## 도입하지 않을 것

다음은 현재 기본 경로에 넣지 않는다.

- Superpowers 플러그인 설치 강제: Claude Code, Codex, GitHub 환경이 섞여 있어
  특정 플러그인에 하네스를 종속시키지 않는다.
- 모든 작업의 강제 TDD: 신규 기능과 위험 변경에는 강하게 요구하되, 문서 정리나
  단순 설정 변경에는 비용이 더 클 수 있다.
- 모든 작업의 git worktree 강제: 짧고 단일 브랜치인 수정에는 오히려 운영 비용이 생긴다.
- 모든 서브 에이전트 병렬 호출: 컨텍스트 비용과 중복 리뷰가 커진다.
- 외부 스킬 파일의 무조건 복사: 우리 도메인 규칙, 한글 문서 체계, 기존 Claude 자산과
  충돌할 수 있다.

---

## 운영 규칙

1. Superpowers는 참고 방법론으로 취급한다.
2. 절차는 `docs/harness/skills/`에 모델 중립 스킬로 옮길 때만 프로젝트 규칙이 된다.
3. 판단자는 `docs/harness/agents/`에 남기고, 반복 절차는 `skills/`로 둔다.
4. 메인 Codex가 최종 책임을 가진다. 플러그인이나 하위 에이전트 결과는 판단 재료다.
5. 새 스킬을 추가할 때는 기존 `track-*`, `pr-preflight`, `critic-gates`와 중복되는지 먼저 확인한다.

---

## 스킬로 승격한 것

이번 검토에서 다음 후보는 `docs/harness/skills/`로 승격했다.

- `brainstorming.md`: 모호한 요구를 목표/비목표/성공 조건으로 정리하는 스킬
- `writing-plan.md`: 큰 변경을 2-5분 단위 작업으로 쪼개는 계획 스킬
- `worktree-start.md`: 격리 워크트리 생성, baseline 검증, 작업 브랜치 연결 절차
- `development-finish.md`: 최종 검증, PR/merge/cleanup 결정을 하나로 묶는 종료 스킬
- `tdd-cycle.md`: 신규 기능에서 RED-GREEN-REFACTOR를 강제할 조건과 예외
- `parallel-agent-dispatch.md`: 병렬 Agent 실행 조건, 입력 템플릿, 결과 통합 방식

---

## 남은 후보

현재는 없다. Superpowers 외부 스킬을 더 들여올 때는 실제 사용 빈도와 중복 여부를
확인한 뒤 별도 문서로 승격한다.

기존 스킬과 겹치는 부분:

- `track-start.md`, `step-start.md`: planning 역할 일부
- `track-end.md`, `pr-preflight.md`, `branch-cleanup.md`: finishing 역할 일부
- `docs-consistency-check.md`, `review-capture.md`: review 기록 역할 일부
