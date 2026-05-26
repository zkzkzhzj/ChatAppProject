---
last-verified: 2026-05-26
tags: [ai-native, harness, codex, orchestration, algosu]
scope: 마음의 고향 Codex primary harness migration
trigger: "사용자가 AlgoSu AI Native 블로그 6개 글을 기반으로 Codex 주력 하네스 전환 요청"
---

# AlgoSu 하네스 글 기반 적용 판단

> 결론: Claude Code 세팅을 뒤엎지 않는다. Codex를 주력으로 올리고,
> 공통 기억과 역할 체계를 모델 중립 하네스로 분리한다.

---

## 읽은 글

- 토큰 비용을 더 쓰기로 했다 — 사람을 위한 ADR 뷰 만들기
- 기억은 휘발되고 문서는 무한히 쌓인다 — 슬라이딩 윈도우로 agent 컨텍스트를 최적화하다
- 종속 없는 하네스를 향해 — Critic 도입기
- AI 코드의 안전망 — CI/CD 15 jobs 실전기
- 12명의 AI를 통제하는 법
- AI 에이전트 오케스트레이션 실전기

---

## 가져온 것

### 1. Markdown과 HTML의 역할 분리

Markdown은 agent memory로 유지한다. HTML은 사람이 다시 읽기 위한 보조 화면으로만
검토한다.

우리 적용:

- 기존 Markdown 문서는 유지
- 긴 리뷰/ADR 요약에만 HTML 뷰를 조건부 추가
- `AGENTS.md`, `CLAUDE.md`, spec, handover는 HTML 전환 금지

### 2. 슬라이딩 윈도우 컨텍스트

모든 ADR과 handover를 매번 읽으면 컨텍스트가 흐려진다.

우리 적용:

- `docs/harness/context-window.md` 신설
- 현재 작업과 직전 교훈만 자동 진입 컨텍스트로 유지
- 오래된 문서는 인덱스에서 on-demand로 읽음

### 3. 모델 중립 Critic

Codex를 "교체"가 아니라 "다른 시선"으로 쓰는 발상이 핵심이었다.
이 프로젝트에서는 한 단계 더 나아가 Codex를 primary로 올리되, Claude 자산을
검증층과 보조 실행 환경으로 유지한다.

우리 적용:

- `AGENTS.md`를 Codex primary 진입점으로 전환
- `docs/harness/critic-gates.md` 신설
- Claude review-agent 계열은 역할 자산으로 보존

### 4. 메인 AI + 역할형 서브 에이전트

모든 에이전트를 평등하게 두면 흐름이 흐려진다. 사용자와 소통하는 메인 AI가 있고,
그 아래 역할형 서브 에이전트가 있어야 한다.

우리 적용:

- `Main Codex Orchestrator`를 기본 구조로 정의
- 하위 역할은 Domain, Adapter, Test, Critic, Security, Concurrency, Scribe, Research로 축소
- 기존 23개 Claude 에이전트는 기본/선택/제외로 분류

### 5. AI 코드에는 CI/CD 가드레일이 필요

AI가 코드를 빨리 만들수록 자동 검증이 더 중요하다.

우리 적용:

- 당장 15 jobs를 복제하지 않는다.
- 우선 `.env` 차단, secret scan, 최소 권한, 변경 감지 같은 작은 게이트를 후보로 둔다.
- 배포/GitOps 파이프라인은 실제 운영 배포 흐름이 커질 때 별도 트랙으로 분리한다.

---

## 가져오지 않은 것

| 항목 | 판단 |
|------|------|
| Claude Code 세팅 폐기 | 기존 훅/스킬/에이전트가 이미 작동한다. 폐기 비용이 크다. |
| 12-agent 구조 그대로 복제 | 우리 프로젝트에는 이미 23개 역할이 있고, 그대로 늘리면 기본 경로가 흐려진다. |
| 모든 ADR HTML화 | 현재는 ADR보다 handover/spec/learning이 핵심이다. HTML은 보조 뷰로만 둔다. |
| CI 15 jobs 즉시 복제 | 현재 CI 규모와 운영 단계에 비해 과하다. 필요한 게이트부터 단계 도입한다. |
| Agent OS 전체 도입 | 기존 spec-driven 4층 모델과 중복된다. 패턴만 선별 차용한다. |

---

## 최종 구조

```text
AGENTS.md                 Codex primary entry
CLAUDE.md                 Claude Code entry, preserved
docs/harness/             Model-agnostic harness SSoT
docs/knowledge/           Long-term knowledge
docs/handover/            Track state and current work
.claude/agents/           Reusable Claude role assets
```

---

## 후속 후보

1. `docs/harness/` 기반 HTML human review surface 생성 스크립트
2. `.env` 차단 + secret scan CI 보강
3. NPC 트랙 시작 시 Langfuse/Grafana/LLM eval ADR
4. 새 도메인 트랙 시작 시 `/discover-domain-patterns` 스킬 시범
