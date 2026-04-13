---
title: Claude Code 훅 자동화
tags: [infra, hooks, automation, subagent, ai-native]
related: [infra/docker-local.md, infra/outbox-pattern.md]
last-verified: 2026-04-13
---

# Claude Code 훅 자동화

Claude Code의 훅 시스템을 활용하여 서브에이전트 라우팅, docs 검증, handover 갱신을 자동화한다.

## 훅 이벤트 구성

| 이벤트 | 스크립트 | 동작 | 차단 여부 |
|--------|---------|------|----------|
| **Stop** | `stop-handover-check.js` | 세션 종료 시 handover.md 미갱신이면 종료 차단 | blocking (exit 2) |
| **UserPromptSubmit** | `keyword-router.js` | 정규식 패턴으로 5개 에이전트 자동 라우팅 | advisory (stdout) |
| **PreToolUse(Bash)** | `pre-bash-guard.js` | git commit → docs 경고 / gh pr create → 규칙 차단 | mixed |
| **PostToolUse(Bash)** | 인라인 Node.js | git commit 성공 → review-agent 리뷰 지시 | advisory |

## 키워드 라우팅 (keyword-router.js)

정규식 기반 패턴 매칭으로 사용자 프롬프트에서 의도를 감지하여 적절한 에이전트를 라우팅한다.

| 패턴 | 라우팅 대상 |
|------|-----------|
| `기록\|정리해\|문서화\|학습\s*노트` | learning-agent |
| `PR\s*.{0,4}(날려\|생성\|올려\|써\|...)` | pr-agent |
| `리서치\|조사해\|최신\s*동향` | research-agent |
| `동시성\s*(검증\|리뷰)` | concurrency-review-agent |
| `보안\s*(검증\|리뷰)` | security-review-agent |

## 훅 동작 원리

- **exit 0 + stdout**: Claude가 additionalContext로 인식하여 행동에 반영
- **exit 2 + stderr**: 도구 호출 또는 종료를 차단하고, stderr 내용을 지시로 전달
- **stop_hook_active**: 무한 루프 방지 플래그. Stop hook이 한 번 차단 후 재실행 시 true

## 파일 위치

```
.claude/
├── settings.json          ← 4개 훅 이벤트 등록
└── hooks/
    ├── stop-handover-check.js
    ├── keyword-router.js
    └── pre-bash-guard.js
```

## 런타임 의존성

- Node.js (python3 아님). 모든 훅 스크립트가 Node.js 기반.
- `git`, `gh` CLI — pre-bash-guard에서 사용.
