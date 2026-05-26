---
description: Model-neutral role cards for the 마음의 고향 agent harness
tags: [harness, agents, role-cards]
version: 1.0.0
---

# 하네스 역할 카드

> 이 디렉터리는 Codex와 Claude가 함께 참고할 수 있는 모델 중립 역할 카드다.
> Claude Code의 `.claude/agents/`를 대체하지 않고, Codex primary 운영에서 필요한
> 최소 역할만 선별해 정의한다.

---

## 기본 역할

| 역할 | 파일 | 기본 호출 조건 |
|------|------|----------------|
| Main Orchestrator | `main-orchestrator.md` | 모든 작업의 기본 주체 |
| Domain Engineer | `domain-engineer.md` | 도메인 모델, 상태 변경 규칙, Port 설계 |
| Adapter Engineer | `adapter-engineer.md` | Controller, DTO, Persistence, Messaging |
| Test Engineer | `test-engineer.md` | 테스트 작성, 테스트 품질 보강 |
| Critic | `critic.md` | 일반 코드 리뷰, 아키텍처 위반 검증 |
| Technical Strategy Critic | `technical-strategy-critic.md` | 기술 선택, 프로토콜, 저장소, 운영 전략 검증 |
| Concurrency Critic | `concurrency-critic.md` | 동시성, 멱등성, 트랜잭션, N+1 |
| Security Critic | `security-critic.md` | 인증, 인가, 민감 정보, 외부 입력 |
| Research Scout | `research-scout.md` | 최신 기술, AI Native, 제품/시장 리서치 |

---

## 왜 12개가 아닌가

블로그의 12-agent 구조를 그대로 복제하지 않는다.

이 프로젝트에는 이미 `.claude/agents/`에 많은 역할 자산이 있다. 기본 경로에 역할을
너무 많이 올리면 메인 AI가 조율자가 아니라 라우터로만 남는다. 그래서 기본 역할은
9개로 제한하고, 채용/JD, 블로그, PR 리뷰 대응, 회고 리허설 같은 역할은 요청 시에만
기존 Claude 자산을 참조한다.

---

## 사용 규칙

- Main Orchestrator가 먼저 문제를 이해한다.
- 역할 카드는 필요한 순간에만 읽는다.
- 역할 카드는 최종 결정권이 없다. 최종 통합과 사용자 보고는 Main Orchestrator 책임이다.
- 역할이 겹치면 더 좁은 역할을 선택한다. 예를 들어 포인트 차감은 Critic보다
  Concurrency Critic이 우선이다.
- handover, learning note, PR preflight, wiki lint 같은 반복 절차는 Agent가 아니라
  `docs/harness/skills/`의 Skill로 실행한다.
