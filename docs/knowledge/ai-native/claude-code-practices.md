# Claude Code 파워유저 실천법

> 마지막 업데이트: 2026-04-12
> 출처: https://code.claude.com/docs/en/best-practices | https://www.builder.io/blog/claude-code-tips-best-practices

---

## 핵심 원칙

> "구조 없이 Claude에게 던지면 성공률 33%. 파워유저와 일반 유저의 차이는 프롬프트 품질이 아니라 실행 전에 만들어놓은 구조다." — Anthropic 내부 데이터

---

## 컨텍스트 관리

### CLAUDE.md 원칙
- **3,000 토큰 이하** 유지
- Claude가 이미 잘 하는 것은 쓰지 말 것 — **틀리는 것만** 적는다
- 상세 규칙은 별도 파일 분리 → `@filename`으로 import
- 이 프로젝트: `/docs/conventions/coding.md`, `/docs/knowledge/INDEX.md` 참조

### 컨텍스트 오염 방지
- 리서치/탐색 → 서브에이전트에 위임 (메인 컨텍스트 보호)
- 독립적인 탐색 작업 → 별도 컨텍스트에서 실행

---

## Skills 시스템

한 번 잘 수행한 작업을 SKILL.md로 저장 → 매번 재설명 없이 일관된 실행.

### 이 프로젝트 현황
| 스킬 | 경로 | 역할 |
|------|------|------|
| /코드리뷰 | `.claude/skills/코드리뷰/` | uncommitted 변경사항 Codex 리뷰 |
| /전체리뷰 | `.claude/skills/전체리뷰/` | 전체 프로젝트 리뷰 |
| /MD리뷰 | `.claude/skills/MD리뷰/` | 문서 정합성 + 코드↔명세 교차검증 |

---

## Hooks

가장 강력하지만 가장 덜 쓰이는 기능. `settings.local.json`에 설정.

### Hook 종류
| Hook | 트리거 시점 | 활용 예시 |
|------|-----------|---------|
| `PreToolUse` | 도구 실행 전 | 위험한 명령 차단, 검증 |
| `PostToolUse` | 도구 실행 후 | git commit 후 자동 리뷰 트리거 |
| `Stop` | Claude 응답 완료 후 | 세션 학습 자동 캡처 |
| `Notification` | 알림 발생 시 | 사운드/알림 |

### 이 프로젝트 현황 (2026-04-13)
- Stop Hook: 비프음 + 세션 학습 캡처 안내 (`settings.local.json`) — Claude에게 memory 저장 및 handover.md 확인 지시
- Notification Hook: 비프음 (`settings.local.json`)
- PostToolUse Hook: `git commit` 성공 감지 시 review-agent 리뷰 지시 메시지 출력 (`settings.json`)

---

## Subagents (.claude/agents/)

각 에이전트: 독립 컨텍스트 + 커스텀 시스템 프롬프트 + 별도 툴 권한.

### 파일 형식
```markdown
---
name: agent-name
description: 매칭 조건 포함한 역할 설명
tools: Read, Write, Edit, Bash, WebSearch
---

[시스템 프롬프트]
```

### 이 프로젝트 에이전트 (2026-04-12 구성)
| 에이전트 | 역할 | 자율성 |
|---------|------|-------|
| research-agent | AI/Claude Code 동향 리서치 + knowledge 업데이트 | 높음 |
| domain-agent | Domain Entity, VO, Port 설계 | 중간 |
| adapter-agent | Controller, JPA, Kafka 구현 | 중간 |
| test-agent | Cucumber BDD 시나리오 작성 | 중간 |
| review-agent | 코드 리뷰 (AGENTS.md 기준) | 높음 |
| docs-agent | API명세-코드 교차검증 | 높음 |

---

## 에이전트 팀 (실험적)

```json
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

오케스트레이터 1개 + 병렬 워커 N개 구조. Split-and-merge 패턴으로 각 에이전트가 독립 git worktree에서 작업 후 병합.

---

## 셀프러닝 루프 구성 현황

```
[2026-04-13 기준]

1. Stop Hook → 세션 종료 시 memory 저장 + handover 확인 지시       ✅ 구현
2. /schedule → research/realtime/job-market 주간 크론 등록           ✅ 구현
3. PostToolUse Hook → git commit 성공 시 review-agent 리뷰 지시     ✅ 구현
4. MCP → PostgreSQL/Redis 직접 연결 (docs-agent가 DB 직접 조회)     ❌ 미구현
```

---

## 2026-02: Agent Teams 정식 도입

**출처**: https://shipyard.build/blog/claude-code-multi-agent/ | https://code.claude.com/docs/en/agent-teams

Claude Code Agent Teams가 2026-02 Opus 4.6 출시와 함께 실험적 기능으로 공개.

### 기존 Subagents와의 차이
| 항목 | Subagents (기존) | Agent Teams (신규) |
|------|-----------------|-------------------|
| 통신 구조 | 부모 → 자식 (단방향) | 동료 ↔ 동료 (P2P 메일박스) |
| 협력 방식 | 결과 보고 | 공유 태스크 리스트 |
| 적합한 작업 | 단순 위임 | 크로스-레이어 복잡 작업 |

### 활성화 방법
```json
// .claude/settings.json (이미 이 프로젝트에 적용)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 강점 있는 유스케이스
- 멀티 레이어 변경 (프론트엔드 + 백엔드 + 테스트를 각 에이전트가 담당)
- 경쟁 가설 디버깅 (여러 에이전트가 다른 이론을 병렬 검증)
- 리서치 + 리뷰 병렬 실행

**마음의 고향 적용 의미**: domain-agent + adapter-agent + test-agent를 Agent Teams로 구성하면 API 변경 시 크로스-레이어 반영을 병렬화할 수 있음.

---

## 2026-02: Remote Control / 플러그인 에코시스템

**출처**: https://www.nagarro.com/en/blog/claude-code-feb-2026-update-analysis | https://dev.to/shuicici/claude-codes-feb-mar-2026-updates-quietly-broke-complex-engineering-heres-the-technical-5b4h

- `/remote-control`: 브라우저나 모바일에서 실행 중인 Claude Code 세션에 접속 가능 (`claude.ai/code`)
- **플러그인 에코시스템**: 법률/금융/HR/엔지니어링 등 13개 엔터프라이즈 커넥터 + 10개 도메인 특화 플러그인 추가

**마음의 고향 적용 의미**: 장시간 실행 백그라운드 작업(예: Cassandra 마이그레이션) 중 모바일에서 모니터링 가능해짐.

---

## 2026-03: Computer Use / Voice / /loop

**출처**: https://help.apiyi.com/en/claude-code-2026-new-features-loop-computer-use-remote-control-guide-en.html | https://www.geeky-gadgets.com/claude-code-channels/

### Computer Use (2026-03-23 추가)
Pro/Max 사용자에게 Claude Code가 파일 열기, 개발 도구 실행, 화면 클릭 및 탐색 가능. 별도 셋업 불필요.

### /loop — 스케줄 태스크
Cron 방식의 백그라운드 워커. PR 리뷰, 배포 모니터링 등 반복 작업 자동화.

### 출력 한도 상향
- Opus 4.6 기본 출력: 64k 토큰
- Opus 4.6 / Sonnet 4.6 최대 출력: 128k 토큰

### PowerShell 툴 프리뷰 (Windows 사용자)
Windows 환경에서 PowerShell 도구 사전 공개.

**마음의 고향 적용 의미**: `/loop`을 research-agent 주간 크론에 활용 가능. 셀프러닝 루프의 `/schedule` TODO 항목과 직결됨.
