---
description: Difference between role agents and skills in the 마음의 고향 harness
tags: [harness, agents, skills]
version: 1.0.0
---

# Agents vs Skills

> 서브 에이전트와 스킬은 둘 다 하네스 구성요소지만, 책임이 다르다.

---

## 한 줄 차이

- **Agent**: 독립된 관점과 판단을 가진 역할
- **Skill**: 반복 가능한 절차, 체크리스트, 도구 사용법

---

## Agent가 맞는 경우

Agent는 "누가 생각하는가"에 가깝다.

사용 예:

- Domain Engineer가 도메인 모델을 비판한다.
- Concurrency Critic이 멱등성 누락을 의심한다.
- Security Critic이 인증/인가 경계를 본다.
- Technical Strategy Critic이 기술 선택 자체를 따진다.

특징:

- 독립된 판단 기준이 있다.
- 메인 AI와 다른 관점을 일부러 가진다.
- 병렬 탐색이나 비평에 적합하다.
- 결과는 최종 답이 아니라 메인 AI가 통합할 재료다.

---

## Skill이 맞는 경우

Skill은 "어떻게 실행하는가"에 가깝다.

사용 예:

- 새 spec 파일을 템플릿으로 만든다.
- track-start 절차를 수행한다.
- track-end 체크리스트를 실행한다.
- markdown lint나 wiki lint를 돌린다.
- 리뷰 결과를 정해진 포맷으로 저장한다.

특징:

- 반복 절차가 명확하다.
- 체크리스트, 템플릿, 스크립트를 포함하기 좋다.
- 판단자라기보다 실행법이다.
- 같은 일을 매번 같은 방식으로 하게 만든다.

---

## 우리 하네스 기준

| 상황 | 선택 |
|------|------|
| 기술 선택이 맞는지 따져야 함 | Agent |
| 리뷰 관점이 필요함 | Agent |
| 도메인/어댑터 설계 판단 | Agent |
| 정해진 파일을 템플릿으로 생성 | Skill |
| PR 종료 체크리스트 실행 | Skill |
| handover, learning note, ADR 기록 | Skill |
| 문서 정합성 체크리스트 | Skill |
| context health 점검 | Skill |
| 여러 역할의 의견을 모아 판단 | Main Orchestrator |
| 단순 명령 자동화 | Skill |

---

## 백그라운드 실행과의 관계

백그라운드 실행은 Agent의 장점 중 하나일 뿐, 본질은 아니다.

Agent를 쓰는 핵심 이유:

- 독립된 컨텍스트를 준다.
- 다른 관점으로 문제를 보게 한다.
- 메인 AI가 구현하는 동안 병렬로 검토하게 할 수 있다.

Skill을 쓰는 핵심 이유:

- 절차를 표준화한다.
- 템플릿과 스크립트를 재사용한다.
- 매번 설명하지 않아도 같은 방식으로 실행하게 한다.

따라서 "묶어서 한번에 오케스트레이션"할 때도 둘 다 쓸 수 있다.
메인 AI가 Agent에게 판단을 맡기고, 각 Agent나 메인 AI가 필요한 Skill을 사용해
절차를 실행하는 구조가 가장 자연스럽다.

---

## 이번 분리 결과

Agent로 남긴 것:

- Main Orchestrator
- Domain Engineer
- Adapter Engineer
- Test Engineer
- Technical Strategy Critic
- Critic
- Security Critic
- Concurrency Critic
- Research Scout

Skill로 내린 것:

- Docs/Learning Scribe 성격의 handover, learning note, docs consistency, review capture
- PR Agent 성격 중 PR preflight 체크리스트
- Context Health Agent 성격의 주기 점검
- wiki lint, branch cleanup 같은 단순 절차
