---
description: Main Codex and sub-agent orchestration model
tags: [harness, orchestration, subagents, codex]
version: 1.0.0
---

# 에이전트 오케스트레이션

> 이 문서는 "나와 소통하는 메인 AI"와 "역할이 분리된 서브 에이전트" 구조를
> 마음의 고향에 맞게 정의한다.

---

## 핵심 구조

```text
사용자
  |
  v
Main Codex Orchestrator
  |-- Domain Engineer
  |-- Adapter Engineer
  |-- Test Engineer
  |-- Technical Strategy Critic
  |-- Critic
  |-- Security Critic
  |-- Concurrency Critic
  |-- Research Scout
```

메인 Codex는 사용자와 직접 대화한다. 하위 역할은 필요한 순간에만 호출된다.
반복 절차는 하위 에이전트가 아니라 `docs/harness/skills/`의 스킬로 실행한다.

---

## 기본 역할

역할별 상세 페르소나는 `docs/harness/agents/`에 둔다.

### Main Codex Orchestrator

기본 주력 AI다.

- 사용자 의도 확인
- 작업 범위 결정
- 필요한 문서와 코드 탐색
- 하위 역할 위임 여부 판단
- 구현과 검증 통합
- 최종 보고

메인 Codex는 최종 책임을 하위 역할에 넘기지 않는다.

### Domain Engineer

도메인 모델, VO, UseCase, Port 설계를 맡는다.

사용 조건:

- 새 도메인 개념이 생긴다.
- 상태 변경 규칙이 생긴다.
- 도메인 간 연결 방식 판단이 필요하다.

기존 Claude 역할 자산:

- `.claude/agents/domain-agent.md`

### Adapter Engineer

Controller, DTO, Persistence Adapter, Messaging Adapter를 맡는다.

사용 조건:

- API, JPA, Kafka, WebSocket 입출력 경계가 바뀐다.
- 도메인 설계가 이미 확정되어 있다.

기존 Claude 역할 자산:

- `.claude/agents/adapter-agent.md`

### Test Engineer

테스트 시나리오와 테스트 품질을 맡는다.

사용 조건:

- 새 기능 또는 버그 수정이 있다.
- 성공/실패 케이스 누락 가능성이 있다.
- 테스트가 구현 의도보다 약해 보인다.

기존 Claude 역할 자산:

- `.claude/agents/test-agent.md`
- `.claude/agents/test-quality-agent.md`

### Critic

머지 전 의심자 역할이다. 동의자가 아니라 합의를 깨는 시선이다.

사용 조건:

- 구현이 끝났고 리뷰가 필요하다.
- PR 생성 전이다.
- 큰 리팩토링 또는 공유 규칙 변경이 있다.

기존 Claude 역할 자산:

- `.claude/agents/review-agent.md`
- `.claude/agents/full-review-agent.md`

### Technical Strategy Critic

코드가 작성되기 전 기술 선택이 서비스 요구와 맞는지 검증한다.

사용 조건:

- 통신 방식, 저장소, 메시징, 인증, LLM, 관측, 배포 전략을 고른다.
- 기존 baseline과 다른 방식을 도입한다.
- 실시간성, 정합성, 보안, 운영 비용에 영향을 주는 선택이 있다.

기존 Claude 역할 자산:

- `.claude/agents/realtime-tech-agent.md`
- `.claude/agents/research-agent.md`
- `.claude/agents/tradeoff-rehearsal-agent.md`

### Security Critic

인증, 인가, 민감 정보, 토큰, 외부 입력을 검증한다.

사용 조건:

- 인증/인가 코드가 바뀐다.
- WebSocket, SSE, 쿠키, JWT, OAuth 흐름이 바뀐다.
- API 응답에 사용자 정보가 포함된다.

기존 Claude 역할 자산:

- `.claude/agents/security-review-agent.md`

### Concurrency Critic

동시성, 멱등성, 트랜잭션, N+1, Kafka 재처리를 검증한다.

사용 조건:

- 포인트, 아이템, 좌석, 메시지 처리 상태가 바뀐다.
- `exists` 후 `save`, `containsKey` 후 `put` 같은 패턴이 보인다.
- Kafka consumer 또는 outbox/idempotency 흐름이 바뀐다.

기존 Claude 역할 자산:

- `.claude/agents/concurrency-review-agent.md`

### Research Scout

최신 기술, 시장, 경쟁 서비스 리서치를 맡는다.

사용 조건:

- 현재 정보가 바뀌었을 가능성이 높다.
- 외부 도구나 새 AI Native 패턴 도입을 검토한다.
- 제품 방향, 타겟 유저, 경쟁 서비스 조사가 필요하다.

기존 Claude 역할 자산:

- `.claude/agents/research-agent.md`
- `.claude/agents/realtime-tech-agent.md`
- `.claude/agents/market-research-agent.md`
- `.claude/agents/competitor-agent.md`
- `.claude/agents/user-research-agent.md`

---

## 기본 경로에서 제외한 역할

아래 역할은 삭제하지 않는다. 다만 기본 오케스트레이션 경로에는 올리지 않는다.

| 역할 | 판단 |
|------|------|
| `job-market-agent` | 마음의 고향 제품 개발과 직접 관련이 낮다. 사용자가 채용/JD 분석을 요청할 때만 사용한다. |
| `tradeoff-rehearsal-agent` | 학습 회고용이다. 구현 기본 흐름에는 넣지 않는다. |
| `blog-writer-agent` | 외부 블로그 글 요청 시만 사용한다. 하네스 기본 검증과 무관하다. |
| `context-health-agent` | 주간/수동 점검용이다. 매 작업마다 호출하면 컨텍스트 비용이 크다. |
| `pr-agent` | PR 생성 단계 전용이다. 구현 중 기본 역할은 아니다. |
| `review-respond-agent` | PR 리뷰 코멘트가 있을 때만 사용한다. |

이 분류의 목적은 역할을 줄이는 것이 아니라 기본 경로를 선명하게 만드는 것이다.

---

## 위임 원칙

1. 메인 Codex가 먼저 전체 작업을 이해한다.
2. 즉시 필요한 blocking work는 메인 Codex가 직접 한다.
3. 병렬로 가능하고 범위가 분리된 작업만 서브 에이전트에 맡긴다.
4. 각 서브 에이전트는 명확한 파일/책임 범위를 가진다.
5. 하위 결과는 그대로 합치지 않는다. 메인 Codex가 검토 후 통합한다.
6. 서브 에이전트가 서로 충돌하면 메인 Codex가 조정한다.
7. 사용자가 명시적으로 멈추라고 하지 않으면, 한 절차가 끝난 뒤 다음 절차로 전이한다.
8. 브레인스토밍 결과가 구현 가능한 수준이면 메인 Codex가 Domain/Adapter/Test/Critic 등
   필요한 역할을 먼저 고르고, 사용자에게 "다음 단계로 가도 되냐"고 반복 확인하지 않는다.

---

## 자연 전이 규칙

하네스는 단일 문서 작성으로 끝나지 않는다. 메인 Codex는 각 단계의 산출물을 다음 단계의
입력으로 사용한다.

| 완료된 단계 | 다음 기본 단계 |
|-------------|----------------|
| brainstorming | writing-plan 또는 parallel-agent-dispatch |
| writing-plan | track-start 또는 구현 브랜치 준비 |
| parallel-agent-dispatch | 메인 Codex 통합 계획 작성 |
| track-start | Step 1 구현 |
| 구현 | 테스트 + Critic Gate |
| Critic Gate | 수정 또는 PR preflight |

전이를 멈추는 조건은 다음뿐이다.

- 사용자가 명시적으로 멈춤, 보류, 검토만 요청한다.
- 다음 단계에 필요한 정보가 없고 합리적 가정이 위험하다.
- 외부 권한, 이슈 번호, 브랜치 정책처럼 사용자의 명시적 결정이 필요하다.
- 작업 트리 충돌이나 다른 활성 트랙 때문에 진행하면 손상이 생길 수 있다.

---

## 작업 유형별 라우팅

| 작업 | 기본 라우팅 |
|------|------------|
| 단순 문서 수정 | Main Codex |
| 새 도메인 기능 | Domain Engineer -> Adapter Engineer -> Test Engineer -> Critic |
| API 추가 | Adapter Engineer -> Test Engineer -> Docs Consistency Check skill -> Critic |
| 상태 변경 로직 | Domain Engineer -> Concurrency Critic -> Test Engineer |
| 인증/인가 | Adapter Engineer -> Security Critic -> Test Engineer |
| 기술 선택 변경 | Technical Strategy Critic -> Research Scout 필요 시 -> Learning Note skill |
| 하네스 변경 | Technical Strategy Critic -> Research Scout -> Handover/Learning skills -> Critic |
| PR 전 점검 | Critic + Security/Concurrency/Test 필요 시 선택 |

---

## 운영상 금지

- 모든 역할을 매번 호출하지 않는다.
- 역할 이름만 다르고 같은 검토를 반복하지 않는다.
- 서브 에이전트 결과를 사용자에게 그대로 전달하지 않는다.
- Claude 전용 파일을 Codex용으로 복제만 해서 문서 수를 늘리지 않는다.
- "혹시 모르니" 역할을 새로 만들지 않는다.
