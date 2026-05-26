---
description: Model-agnostic harness SSoT for 마음의 고향
tags: [harness, codex, claude, ai-native]
version: 1.0.0
---

# 모델 중립 하네스

> 이 디렉터리는 Claude Code, Codex, 이후 다른 에이전트 도구가 함께 참조하는
> 공통 운영 규칙이다. 특정 모델의 설정 파일이 아니라 프로젝트 하네스의 SSoT다.

---

## 왜 분리했나

기존 하네스는 Claude Code 중심으로 잘 작동했다. 하지만 Codex를 주력으로 쓰기
시작하면 `CLAUDE.md` 하나에 모든 규칙을 묶어두는 구조는 모델 종속을 만든다.

이번 분리의 목표는 교체가 아니다.

- Claude Code 세팅은 유지한다.
- Codex를 기본 실행 주체로 올린다.
- 공통 규칙은 `docs/harness/`로 이동한다.
- 각 도구의 진입점은 얇게 만들고, 같은 공통 규칙을 참조하게 한다.

---

## 문서 구조

| 문서 | 역할 |
|------|------|
| `README.md` | 하네스 원칙과 문서 라우팅 |
| `agent-orchestration.md` | 메인 AI와 서브 에이전트 역할 체계 |
| `agents/` | 역할별 모델 중립 페르소나 카드 |
| `skills-vs-agents.md` | 서브 에이전트와 스킬의 책임 구분 |
| `skills/` | 반복 절차와 체크리스트용 모델 중립 스킬 |
| `context-window.md` | 슬라이딩 윈도우 컨텍스트 관리 |
| `critic-gates.md` | 교차 리뷰와 CI 가드레일 |

---

## 운영 원칙

### 1. Codex Primary, Claude Preserved

Codex가 기본 작업자다. Claude Code는 기존 스킬, 훅, 에이전트 자산과 비교 검증
레이어로 보존한다.

이 원칙은 "한 도구를 버리고 다른 도구로 갈아타기"가 아니다. 역할과 기억을 모델
밖으로 빼서, 더 나은 모델이 나왔을 때도 하네스가 흔들리지 않게 만드는 것이다.

### 2. 좋은 구조만 가져온다

AI Native 글과 도구에서 아이디어를 가져오되, 이 프로젝트의 ROI가 낮으면 보류한다.

도입 기준:

- 반복되는 실수를 줄이는가?
- 컨텍스트 비용을 줄이는가?
- 검증 가능성을 높이는가?
- 기존 Claude 세팅과 충돌하지 않는가?
- 유지보수할 문서와 훅이 과하게 늘지 않는가?

### 3. 메인 AI가 책임진다

서브 에이전트는 참고 의견과 작업 산출물을 만든다. 최종 판단, 사용자 소통, 변경
통합, 검증 보고는 메인 AI가 책임진다.

### 4. 문서는 두 표면으로 나눌 수 있다

기본 저장 포맷은 Markdown이다.

- Agent memory: Markdown
- Human review surface: 필요 시 HTML 추가

HTML은 기존 문서를 대체하지 않는다. 긴 ADR, 리뷰 결과, 하네스 요약처럼 사람이
반복해서 읽어야 하는 산출물에만 보조 뷰로 추가한다.

---

## 보류한 것

다음 항목은 좋아 보여도 기본 경로에 넣지 않는다.

- Agent OS 전체 도입: 기존 spec-driven 4층 모델과 중복된다.
- 전체 문서 HTML 전환: 에이전트 입력과 사람 편집에는 Markdown이 낫다.
- Cursor, Antigravity, Aider 도입: 현재 문제는 IDE 교체가 아니라 하네스 중립화다.
- 운영 DB MCP 직노출: 보안 표면이 크다.
- 모든 Claude 에이전트의 Codex 복제: 역할 수만 늘고 기본 흐름이 흐려진다.

---

## 참조한 방향

- AlgoSu: Markdown ADR과 HTML ADR의 소비자 분리
- AlgoSu: 슬라이딩 윈도우 기반 agent context 관리
- AlgoSu: Codex Critic을 교체가 아니라 추가로 둔 모델 중립 하네스
- AlgoSu: 12-agent orchestration에서 메인 조율자와 역할형 하위 에이전트 분리
- AlgoSu: AI 생성 코드에는 더 촘촘한 CI/CD 가드레일 필요
