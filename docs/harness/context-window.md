---
description: Sliding-window context policy for AI agents
tags: [harness, context, memory, sliding-window]
version: 1.0.0
---

# 컨텍스트 윈도우

> 문서는 무한히 쌓이지만, 에이전트가 매번 들고 가야 하는 문맥은 작아야 한다.

---

## 기본 원칙

모든 문서를 자동으로 읽지 않는다.

컨텍스트는 네 계층으로 나눈다.

| 계층 | 위치 | 자동 로딩 | 역할 |
|------|------|-----------|------|
| 현재 윈도우 | `docs/handover/INDEX.md`, 현재 track 파일 | 예 | 직전 완료 + 현재 진행 |
| 인덱스 | `docs/knowledge/INDEX.md`, `docs/learning/INDEX.md` | 예 | 어디에 무엇이 있는지 |
| 규약 | `AGENTS.md`, `CLAUDE.md`, `docs/harness/` | 예 | 변하지 않는 강한 규칙 |
| 영구 저장소 | `docs/knowledge/`, `docs/learning/`, `docs/reviews/` | 아니오 | 필요할 때만 읽는 과거 맥락 |

---

## 세션 시작 시 읽는 최소 세트

Codex 기준:

1. `AGENTS.md`
2. `docs/harness/README.md`
3. `docs/harness/agent-orchestration.md`
4. `docs/handover/INDEX.md`
5. 현재 작업과 직접 관련된 track/spec 문서

Claude Code 기준:

1. `CLAUDE.md`
2. `docs/harness/README.md`
3. `.claude` 훅이 제공하는 세션 시작 요약
4. 현재 작업과 직접 관련된 track/spec 문서

---

## 윈도우 크기

기본 윈도우는 2개다.

- [1] 직전 완료 작업의 교훈
- [2] 현재 진행 작업의 목표와 변경 범위

그 이전 작업은 인덱스에서 찾아 들어간다. 오래된 ADR이나 리뷰 문서를 자동으로
모두 읽지 않는다.

---

## 언제 과거 문서를 읽나

다음 조건일 때만 영구 저장소를 추가로 읽는다.

- 같은 도메인에서 이전 결정과 충돌 가능성이 있다.
- 이미 겪은 장애나 회귀 패턴으로 보인다.
- 사용자가 특정 문서를 언급했다.
- 새 도구나 하네스 변경처럼 이전 AI Native 결정의 연속이다.
- 리뷰에서 근거 확인이 필요하다.

---

## 컨텍스트 절약 규칙

- 긴 리뷰 결과는 요약만 대화에 올리고 원문은 `docs/reviews/`에 둔다.
- 학습 노트는 인덱스에 1줄 요약과 링크만 남긴다.
- 하네스 규칙은 여러 파일에 복붙하지 않는다.
- 큰 탐색은 가능하면 하위 에이전트나 별도 검증 단계로 격리한다.
- 대화가 길어지면 현재 목표, 결정, 변경 파일, 검증 상태만 남기고 압축한다.

---

## HTML 보조 뷰 기준

HTML은 다음 조건을 모두 만족할 때만 추가한다.

- 사람이 반복해서 다시 읽을 가능성이 높다.
- Markdown 원문은 계속 유지된다.
- 시각적 계층, 표, 카드, 링크 모음이 실제 검토 시간을 줄인다.
- 에이전트 입력으로 HTML을 자동 주입하지 않는다.

현재 기본 도입 대상:

- 긴 하네스 회고
- 여러 리뷰 결과를 묶은 사람용 리포트
- ADR 흐름을 요약한 대시보드

보류 대상:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/conventions/*.md`
- feature spec
- handover track 문서
