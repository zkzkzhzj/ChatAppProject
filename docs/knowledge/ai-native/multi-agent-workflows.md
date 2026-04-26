# 멀티 에이전트 / 워크트리 / 협업 패턴 (2026 상반기)

> 마지막 업데이트: 2026-04-24
> 작성 배경: 사용자가 메인 Claude Code 세션 + git worktree 기반으로 ws-redis / ui / s3 트랙을 병행 작업하는 셋업을 구축한 직후, "이게 업계에서 일반적인지, 충돌은 어떻게 처치하는지" 질문에 답하기 위한 리서치 노트.

---

## 0. 이 노트가 답하려는 질문

1. 요즘 AI 시대에 다른 사람들은 에이전트를 어떻게 쓰는가
2. 워크트리 + 멀티 세션 동시 작업 패턴이 일반적인가
3. 충돌나는 작업이라면 어떻게 처치하는가
4. 여러 세션이 같은 파일을 동시에 바라볼 때의 문제 해결법

각 질문에 대한 단답은 §7 "마음의 고향 셋업 위치 평가"에 정리.

---

## 1. 단일 → 멀티 에이전트 사용 패턴 4단계

업계의 사용자 워크플로우는 대략 4단계 사다리로 분류된다. 위로 갈수록 throughput은 늘지만, 인지 부담과 충돌 위험이 함께 커진다.

### Stage 0 — Single Synchronous Session (전통)

- 한 IDE 창, 한 에이전트, 한 작업.
- Cursor 1.x, Copilot Chat 초기, 2025년 대부분의 사용자.
- "AI = 더 빠른 자동완성" 모델.

### Stage 1 — Multi-Window Parallel (현재 일반 사용자)

- IDE 창 또는 터미널을 여러 개 열어 같은 레포에서 다른 작업을 진행.
- **문제**: 같은 디렉토리 같은 파일을 두 에이전트가 만지면 마지막 쓴 쪽이 이긴다 (silent overwrite).
- 2026 초반까지의 "일반 파워유저" 패턴이지만, Reddit r/ClaudeCode 등에서 **암묵적으로 폐기되고 있음**. 이유: 충돌 디버깅 비용이 처리량 이득을 잠식.

### Stage 2 — Worktree-Isolated Parallel (현재 시니어 표준) ★ 사용자 셋업이 여기

- 작업마다 `git worktree add`로 별도 디렉토리·브랜치를 만들고, 각 worktree에서 독립 에이전트를 띄움.
- 파일시스템 수준에서 격리되므로 silent overwrite가 구조적으로 불가능.
- Anthropic, Cursor, OpenAI Codex, Aider 등 모든 주요 도구가 2026 Q1에 worktree 자동화 기능을 동시에 추가.
- 실측 한계: **3~5개 worktree**가 인간 한 명의 attention 한계. 그 이상은 supervisor agent 또는 자동화 필요.

### Stage 3 — Orchestrated Agent Teams (얼리 어답터)

- supervisor / mayor agent가 작업을 분해하고 worker agent를 spawn → 결과 수집.
- Claude Code Agent Teams (`isolation: worktree` frontmatter), Codex `subagents`, GitButler agent assist, Cursor 3 parallel fleet, Multiclaude / ruflo 등 OSS 오케스트레이터.
- 핵심 변화: 인간의 역할이 "코더"에서 "오케스트레이터"로 이동.
- 단점: routing accuracy가 8~12 round trip 후 떨어지고, AutoGen 류는 30턴 루프 한 번에 $0.5~$2 token cost.

> 인용: Addy Osmani, "From Conductor to Orchestrator" — 동기적 지휘자(conductor)에서 비동기 오케스트레이터(orchestrator)로의 역할 전환이 2026 패러다임 시프트의 핵심.

---

## 2. 도구별 멀티 세션 지원 현황 (2026-04 기준)

| 도구 | 멀티 세션 1차 모델 | Worktree 기본 지원 | Subagent / Team | 비고 |
|------|------------------|------------------|----------------|------|
| **Claude Code** | tmux + `--worktree` 플래그, Agent Teams | ✓ (`claude --worktree`, `.claude/worktrees/`) | Agent Teams (Feb 2026, Opus 4.6와 동시 출시) — 공유 task list, P2P mailbox, file lock | Anthropic 내부 팀이 "10~15 parallel sessions"를 #1 productivity tip으로 보고 |
| **Cursor 3** | Agent-first IDE, Agent Tabs | ✓ (네이티브, 사이드바에 local/cloud agent 동시 표시) | Background Agents + 최대 8 agent ensemble (best-of-N) | 2026-04-02 출시. UI 자체가 file-edit → agent-fleet 관리로 재설계 |
| **OpenAI Codex** | CLI subagents v2, Codex App | ✓ (자동) | path-based addressing (`/root/agent_a`), 구조적 inter-agent messaging | App에서 cloud 환경 + worktree 병행 |
| **Aider** | 다중 인스턴스 수동 (Issue #302 진행 중) | 사용자 수동 | 정식 multi-agent는 미지원 (Issue #4428 제안 단계) | "single disciplined pair programmer" 정체성 유지 |
| **Cline** | "enhanced task card"로 multi-instance 가시성 작업 중 | 사용자 수동 | Multi-Agent Software Development Discussion #1007에서 설계 중 | 트레딩 방향: 병렬 + 가시성 |
| **GitHub Copilot** | Coding Agent (cloud) | 외부 worktree 의존 | spec-driven, GitHub Actions와 통합 | 클라우드 비동기 위탁 모델 |
| **Windsurf** | 5 parallel agents (Feb 2026) | ✓ | 내장 | Forrester가 "2026 multi-agent 동시 출시 윈도우"로 식별한 5개 도구 중 하나 |
| **Devin** | parallel sessions | 클라우드 격리 | 내장 | 같은 시기 multi-agent 추가 |

핵심 관찰: **2026년 2월에 모든 메이저 도구가 같은 2주 윈도우 안에 multi-agent 기능을 출시**. 이건 우연이 아니라 시장 합의가 단일 → 멀티로 이동한 신호다.

---

## 3. Worktree + 에이전트 조합 사례 (실제 사용자 보고)

### 3.1 Anthropic 내부 (Boris Cherny 외)

- `claude --worktree [name]` 단일 플래그로 실행. 옵션으로 `--tmux` 같이 줘서 자동 tmux 세션 띄움.
- Subagent에 `isolation: worktree` frontmatter 선언 → 호출마다 worktree 자동 생성, 변경 없으면 자동 정리.
- Anthropic 팀 자체가 10~15개 동시 세션 운영을 베스트 프랙티스로 공개.

### 3.2 Laurent Kempé (블로그 "From 3 Worktrees to N", 2026-03-31)

- 처음 3 worktree → AI 에이전트 도입 후 N개로 확장. Windows 환경에서 PowerShell 스크립트로 자동화.
- 핵심 깨달음: **worktree 개수보다 "task 분해 품질"이 병목**.

### 3.3 incident.io 엔지니어링 (Intility 블로그)

- 4~5 parallel Claude session, 각자 독립 plan을 들고 진행.
- Agent Teams + worktree 조합으로 merge conflict 걱정 없이 작업.

### 3.4 Trigger.dev — "We Ditched Worktrees for Claude Code"

- 반대 사례. worktree의 디렉토리 폭증 / IDE 워크스페이스 관리 부담 / `node_modules` 중복 등 단점 지적.
- 대안으로 **GitButler virtual branch** 채택. 같은 working directory에서 변경사항을 가상 브랜치로 라벨링 → worktree 없이 병렬 작업.
- 시사점: worktree가 만능이 아니라 **트레이드오프 존재** (디스크·DX vs 격리 강도).

### 3.5 OSS 자동화 도구 생태계 (2026 Q1~Q2)

| 도구 | 역할 |
|------|------|
| **clash-sh** (Rust CLI) | `git merge-tree`로 worktree 쌍 사이 잠재 충돌 사전 탐지. HN Show HN 두 차례 등장 |
| **ComposioHQ/agent-orchestrator** | 에이전트 fleet 관리, 자동 CI fix · merge conflict · review · PR lifecycle |
| **johannesjo/parallel-code** | Claude Code / Codex / Gemini를 worktree로 병렬 실행 |
| **codeagentswarm** | tmux 기반 멀티 Claude 세션 매니저 |
| **ruvnet/ruflo** | Claude/Codex 멀티 에이전트 swarm 오케스트레이션 |
| **Multiclaude / Gas Town** | mayor → designated subagent 위임 패턴 |

---

## 4. 충돌 처치 4가지 방법론

### 4.1 사전 회피 (Prevention)

가장 비용이 낮고 효과가 큰 레이어. 모든 가이드가 가장 먼저 권장.

- **Non-Overlapping File Domains**: 작업 시작 전에 에이전트별 파일 도메인을 명시적으로 분할. CLAUDE.md / AGENTS.md에 "이 에이전트는 `src/auth/**`만 만진다" 식으로 박아두기.
- **Additive-Only 원칙**: 기존 파일 수정 대신 새 파일 추가 (새 라우트, 새 export, 새 타입). 추가는 거의 충돌하지 않음.
- **공유 자원은 "first step"으로 분리**: `package.json`, `application.yml`, ERD 등 모든 트랙이 건드릴 파일은 병렬 시작 전에 한 번에 처리.
- **Dependency lock 변경 금지 in parallel**: `pnpm-lock.yaml`, `gradle.lockfile`, `Gemfile.lock` 등은 병렬 세션에서 동시에 갱신 금지.
- **Reddit 관찰**: "wait 30 seconds and retry" 같은 단순 conflict protocol만으로도 cascading failure 80% 감소 보고.

### 4.2 에이전트 위임 / Orchestration

supervisor agent가 task를 분해할 때 의존성과 파일 도메인을 함께 결정.

- **Hierarchical / Supervisor pattern**: LangGraph supervisor node, AutoGen GroupChatManager, CrewAI Process.hierarchical, Claude Code Agent Teams의 team lead.
- **Routing 정확도 한계**: sub-agent 8~12 round trip 후 routing이 무너지기 시작. → 너무 깊은 hierarchy는 금물, 한 supervisor 밑에 3~5 worker가 sweet spot.
- **MCP 결합**: Anthropic MCP는 web-based agent toolbox 표준. LangGraph + MCP 조합이 production grade orchestration의 사실상 표준으로 부상.

### 4.3 Lock 메커니즘 (런타임 협조)

- **Claude Code Agent Teams의 file locking**: 공식 기능. shared task list + P2P mailbox와 함께 패키지로 제공.
- **Advisory lock 패턴**: Unix advisory lock 형태로 inbox/mailbox 파일을 read-modify-write 보호. OpenCode Issue #4278에서 Vim-style 락 요청.
- **GitButler 접근**: lock 대신 **change attribution** — 변경을 가상 브랜치에 귀속시켜서 같은 파일이라도 어떤 변경이 어느 브랜치 것인지 추적.
- 한계: advisory lock은 협조하는 에이전트끼리만 유효. 인간이나 외부 도구는 무시 가능.

### 4.4 사후 충돌 해결 (AI 기반)

- **Harmony AI** (Source.dev): LLM 오케스트레이터가 88~90% conflict 자동 해결. Android 시스템 통합에서 검증.
- **Reconcile-AI**: 헤드리스 conflict resolver, CI 파이프라인 통합용.
- **GitHub Copilot Merge**: 충돌 발생 전 PR 단계에서 의도 비교로 사전 경고.
- **GitKraken AI Assist**: 3-way merge UI에 LLM 제안.
- **JetBrains AI Assistant**: IDEA 내장 conflict resolver.
- **git rerere**: AI는 아니지만 **반드시 켜둘 것**. 같은 충돌이 반복될 때 (rebase 다회 발생 시나리오) 이전 해결을 자동 재적용. `git config rerere.enabled true`.

---

## 5. Multi-Agent Orchestration 프레임워크 비교

| 프레임워크 | 패턴 | 강점 | 약점 / 트레이드오프 | 우리 프로젝트 적합성 |
|----------|------|------|------------------|------------------|
| **Anthropic Managed Agents** | Brain / Hands / Session 분리, meta-harness | 운영 부담 0, session durable log, sandbox 격리 | Anthropic 종속 (vendor lock-in), 데이터가 Anthropic DB에 저장 | 코딩 에이전트 자체로는 과잉. 향후 마음의 고향 NPC 백엔드로는 후보 |
| **Claude Code Agent Teams** | team lead + teammate, P2P mailbox + 공유 task list + file lock | 코딩 워크플로우에 최적화, worktree 통합 | 아직 experimental, Claude 종속 | 현재 사용자 셋업의 자연스러운 다음 단계 |
| **LangGraph (+supervisor-py)** | stateful graph, supervisor / swarm | checkpoint, human-in-the-loop, 토큰 효율 최고, Klarna/Replit/Elastic production 사용 | 학습곡선 가장 가파름 | NPC 대화 오케스트레이션에 강력 후보 (대화 상태 관리가 핵심이라) |
| **CrewAI** | role-based crew, hierarchical/sequential process | 학습곡선 낮음, time-to-production 40% 빠름 | 표준 워크플로우에 최적화, 비표준 분기 약함 | NPC role(주민/안내자/이웃) 모델링에 직관적 |
| **AutoGen → Microsoft Agent Framework** | conversation loop, GroupChat | 협상형 작업 강함, MS 생태계 통합 | 토큰 비용 가장 비쌈 ($0.5~$2/30턴), AutoGen은 maintenance mode | 비추 |
| **OpenAI Agents SDK / Codex** | path-based addressing, structured messaging | OpenAI 생태계 통합 | OpenAI 종속 | 우리는 Claude 중심이라 우선순위 낮음 |
| **GitButler** | virtual branches + agent assist | worktree 디렉토리 폭증 회피, 같은 working dir에서 병렬 | git 자체 멘탈 모델과 충돌 | 사용자 셋업의 worktree 디렉토리 관리가 부담될 때 검토 |

---

## 6. 2026 상반기 표준 패턴 추측

여러 출처가 수렴하는 합의:

1. **단일 에이전트 능력 향상보다 멀티 에이전트 협업이 1차 무게중심**. 2026 2월에 메이저 도구가 동시에 multi-agent를 출시한 시점이 변곡점.
2. **Worktree는 "isolation의 lingua franca"**. Anthropic / Cursor / Codex가 동시에 네이티브 지원하면서 사실상 표준.
3. **인간의 역할은 conductor → orchestrator로 이동**. Addy Osmani "Conductors to Orchestrators" 표현이 업계에서 가장 인용됨.
4. **AGENTS.md가 도구 중립 표준**. Sourcegraph + OpenAI + Google + Cursor가 합의, Linux Foundation 산하 Agentic AI Foundation이 관리. Claude Code는 아직 CLAUDE.md 우선이지만 fallback 호환.
5. **Spec-driven development가 multi-agent 시대의 1차 워크플로우**. one-prompt-and-pray → 명세 → 분해 → 병렬 실행 → 통합으로 사이클 분해.
6. **Cost가 fastest-rising 우려**. 멀티 에이전트는 토큰 사용량이 곱셈으로 증가, 월 청구액이 분기 대비 2~3배 출렁.
7. **체감 한계는 인간 attention**. 기술적으로 10~15 가능, 권장은 3~5, 실용 manageable은 2~3.

데이터 포인트:

- multi-agent system inquiries: Q1 2024 → Q2 2025에 1,445% 급증
- 55%의 응답자가 정기적으로 AI agent 사용 (staff+ engineer는 63.5%)
- 매주 11.4시간 review vs 9.8시간 작성 — **2026에 코드 review 시간이 작성 시간을 추월**

---

## 7. 마음의 고향 셋업 위치 평가

### 사용자 셋업 요약

- 메인 Claude Code 세션 1개 (오케스트레이션 / 결정)
- ws-redis / ui / s3 트랙별 git worktree + 병행 Claude Code 세션
- HQ + subagent (research / domain / adapter / test / review / docs) 조직 운영
- Codex CLI를 리뷰 에이전트로 분리 (토큰 절약 학습 후)
- CLAUDE.md + memory + handover.md + learning notes로 셀프러닝 루프

### 사용자 4가지 질문에 대한 단답

**Q1. 다른 사람들은 어떻게 쓰는가?**
대다수 일반 사용자는 아직 Stage 0~1. 시니어/파워유저는 Stage 2 (worktree isolation)로 정착했고, 얼리 어답터가 Stage 3 (orchestrated team)로 진입 중. 사용자는 Stage 2 후반 ~ Stage 3 초입.

**Q2. 워크트리 + 멀티 세션이 일반적인가?**
**시니어 백엔드 개발자 사이에서 빠르게 표준화되는 중**. Anthropic 내부 팀이 공식 best practice로 공개, Cursor 3가 UI 자체를 이 모델에 맞춰 재설계. 다만 절대 사용자 수로 보면 아직 소수. 사용자의 셋업은 "이미 일반적"이라기보다 **"앞으로 일반화될 패턴을 6개월 빨리 채택"**이 정확한 위치.

**Q3. 충돌나는 작업은 어떻게 처치하는가?**
4계층 방어선 권장:

1. (사전) AGENTS.md에 트랙별 파일 도메인 명시 + 공유 자원(`build.gradle.kts`, `application.yml`, ERD) 변경은 직렬화
2. (런타임) Claude Code Agent Teams의 file lock 활성화 또는 `clash-sh`로 잠재 충돌 사전 탐지
3. (rebase) `git config rerere.enabled true` — 같은 충돌 반복 시 자동 재적용
4. (사후) 충돌 발생 시 각 worktree에서 `git rebase main` 후 수동 해결, 필요 시 Codex 리뷰 에이전트에게 conflict 분석 위탁

**Q4. 같은 파일을 동시에 바라볼 때?**
이 프로젝트는 헥사고날이라 도메인 격리가 강함 → 다행히 Q4가 자주 발생할 구조는 아님. 발생 시나리오와 처리:

- **공유 설정 (build.gradle, application.yml, docker-compose)**: 한 트랙이 first-step으로 처리, 다른 트랙은 그 커밋을 base로 시작
- **공통 유틸 / 공통 예외**: Additive-only 원칙. 기존 클래스 수정 대신 새 클래스 추가
- **ERD / docs/specs/**: 문서 트랙을 별도 직렬 작업으로 분리. 기능 트랙과 병렬 금지
- **테스트 파일**: 기능 트랙과 같은 worktree 안에서 같이 작성 (트랙 간 분리 X)

### 함정 가능성

- **worktree 디렉토리 / `node_modules` / `.gradle` 캐시 폭증**: Trigger.dev가 worktree를 버린 이유. 디스크 사용량 모니터 필요.
- **공유 캐시·DB 충돌**: 각 worktree가 같은 PostgreSQL/Redis를 보면 테스트 데이터가 꼬임. **테스트 DB는 Testcontainers로 worktree별 격리** 필수.
- **포트 충돌**: 각 worktree가 8080을 잡으면 두 번째 세션이 죽음. `application.yml`의 `server.port`를 환경변수화해서 worktree별 분리.
- **CLAUDE.md drift**: worktree마다 CLAUDE.md가 따로 있을 수 있음. 메인 레포의 CLAUDE.md를 단일 source of truth로 유지하고 worktree는 그걸 참조하는 컨벤션 필요.
- **memory/handover.md 갱신 누락**: 트랙 3개가 동시에 진행되면 handover.md가 3트랙의 어떤 시점을 반영하는지 모호해짐. **트랙별 handover 섹션** 도입 검토.

### 권장 다음 단계

1. **AGENTS.md 추가** (CLAUDE.md와 별개). 도구 중립 표준이라 Codex 리뷰 에이전트도 같이 읽음.
2. **`git config rerere.enabled true`** 즉시 적용. 비용 0, 이득 큼.
3. **Testcontainers로 트랙별 DB 격리** 검토. 이미 적용 중이면 검증만.
4. **`clash-sh` 시범 도입** 검토. Rust CLI라 가볍고, worktree 간 잠재 충돌을 PR 만들기 전에 발견.
5. **GitButler 시범 평가**. worktree 디렉토리 부담이 커지면 virtual branch 모델로 전환 옵션.
6. **Cost monitoring 셋업**. 멀티 세션 = 토큰 곱셈. 월 한도 알람 필수.

---

## 8. 더 깊이 들어갈 자료 링크

### 1차 출처 (공식 / 엔지니어링 블로그)

- Anthropic — Scaling Managed Agents (Brain/Hands/Session): <https://www.anthropic.com/engineering/managed-agents>
- Anthropic — Effective harnesses for long-running agents: <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>
- Claude Code Docs — Agent Teams: <https://code.claude.com/docs/en/agent-teams>
- Claude Code Docs — Common Workflows (worktree): <https://code.claude.com/docs/en/common-workflows>
- Claude Code Docs — Best Practices: <https://code.claude.com/docs/en/best-practices>
- Cursor — Cursor 3 announcement: <https://cursor.com/blog/cursor-3>
- Cursor — Best practices for coding with agents: <https://cursor.com/blog/agent-best-practices>
- OpenAI Codex — Subagents docs: <https://developers.openai.com/codex/subagents>
- OpenAI Codex — Changelog: <https://developers.openai.com/codex/changelog>
- LangChain — LangGraph: <https://www.langchain.com/langgraph>
- LangChain — State of Agent Engineering: <https://www.langchain.com/state-of-agent-engineering>
- AGENTS.md 공식 사이트: <https://agents.md/>

### 업계 리더 / 분석

- Addy Osmani — The Code Agent Orchestra: <https://addyosmani.com/blog/code-agent-orchestra/>
- Addy Osmani — Conductors to Orchestrators (O'Reilly Radar): <https://www.oreilly.com/radar/conductors-to-orchestrators-the-future-of-agentic-coding/>
- Addy Osmani — My LLM coding workflow going into 2026: <https://addyosmani.com/blog/ai-coding-workflow/>
- Pragmatic Engineer — AI Tooling 2026: <https://newsletter.pragmaticengineer.com/p/ai-tooling-2026>
- JetBrains Research — Which AI Coding Tools Do Developers Actually Use: <https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/>
- Anthropic 2026 Agentic Coding Trends Report: <https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf>

### Worktree + 충돌 실전

- Termdock — Git Worktree Conflicts with Multiple AI Agents: <https://www.termdock.com/en/blog/git-worktree-conflicts-ai-agents>
- Augment Code — Git Worktrees for Parallel AI Agent Execution: <https://www.augmentcode.com/guides/git-worktrees-parallel-ai-agent-execution>
- Intility Engineering — Agent Teams or: How I Learned to Stop Worrying About Merge Conflicts: <https://engineering.intility.com/article/agent-teams-or-how-i-learned-to-stop-worrying-about-merge-conflicts-and-love-git-worktrees>
- Trigger.dev — We Ditched Worktrees for Claude Code: <https://trigger.dev/blog/parallel-agents-gitbutler>
- Laurent Kempé — From 3 Worktrees to N: <https://laurentkempe.com/2026/03/31/from-3-worktrees-to-n-ai-powered-parallel-development-on-windows/>
- Nick Mitchinson — Using Git Worktrees for Multi-Feature Development with AI Agents: <https://www.nrmitchi.com/2025/10/using-git-worktrees-for-multi-feature-development-with-ai-agents/>

### OSS 자동화 도구

- clash-sh (worktree 충돌 사전 탐지): <https://github.com/clash-sh/clash>
- ComposioHQ/agent-orchestrator: <https://github.com/ComposioHQ/agent-orchestrator>
- johannesjo/parallel-code: <https://github.com/johannesjo/parallel-code>
- GitButler: <https://github.com/gitbutlerapp/gitbutler> | Parallel Branches docs: <https://docs.gitbutler.com/features/branch-management/virtual-branches>
- ruvnet/ruflo: <https://github.com/ruvnet/ruflo>
- wshobson/agents (Claude Code 멀티 에이전트 모음): <https://github.com/wshobson/agents>

### 프레임워크 비교

- 2026 AI Agent Framework Showdown (Claude Agent SDK vs Strands vs LangGraph vs OpenAI): <https://qubittool.com/blog/ai-agent-framework-comparison-2026>
- CrewAI vs LangGraph vs AutoGen 2026 비교: <https://kanerika.com/blogs/crewai-vs-autogen/>
- LangGraph Multi-Agent Orchestration (supervisor vs swarm): <https://dev.to/focused_dot_io/multi-agent-orchestration-in-langgraph-supervisor-vs-swarm-tradeoffs-and-architecture-1b7e>

### 충돌 해결 (AI 기반)

- Source.dev Harmony (88~90% 자동 해결): <https://www.source.dev/journal/harmony-preview>
- reconcile-ai: <https://github.com/kailashchanel/reconcile-ai>
- Graphite — AI in merge conflict resolution: <https://www.graphite.com/guides/ai-code-merge-conflict-resolution>

### tmux + Claude Code 패턴

- andynu gist — Multi-agent Claude Code workflow using tmux: <https://gist.github.com/andynu/13e362f7a5e69a9f083e7bca9f83f60a>
- Code with Seb — Parallel Claude Code Sessions Production Setup: <https://www.codewithseb.com/blog/parallel-claude-code-sessions-git-worktrees-guide>

---

## 9. 후속 리서치 권장 토픽

1. **Testcontainers + git worktree 실제 패턴**: 트랙별 DB/Redis 격리의 표준 셋업이 이미 있는지.
2. **AGENTS.md vs CLAUDE.md 마이그레이션 사례**: 한 프로젝트가 둘 다 유지할 때의 실전 운영법.
3. **GitButler virtual branch + Spring Boot multi-module 적합성**: Gradle 멀티모듈에서 worktree 디렉토리 부담 vs virtual branch 단일 working dir의 트레이드오프.
4. **Anthropic Managed Agents 가격 모델 현황**: 마음의 고향 NPC 백엔드 후보로서 운영비 추정.
5. **LangGraph supervisor를 NPC 대화 상태 머신에 적용한 사례**: 대화의 상태 관리·체크포인트가 LangGraph 강점과 직결.
