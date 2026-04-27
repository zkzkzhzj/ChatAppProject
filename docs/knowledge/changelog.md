# 지식 베이스 변경 이력

---

## 2026-04-24 (2nd)

### Handover 충돌 관리 + Agent Teams 실전 디테일 (직전 노트 후속 심화)

직전 `multi-agent-workflows.md`가 큰 분류·트렌드를 다뤘다면, 이 노트는 **"내일 당장 적용할 실전 디테일"**에 집중. 사용자 우려 ("내가 뭘 선택했고 왜 선택했는지가 안 남는다")가 동기.

#### 신규 문서: `ai-native/handover-collision-management.md`

- **handover 패턴 5종 분류**: Single SSOT / Memory Bank (Cline·Roo Code) / Session Log + Handoff (rjmurillo) / Branch-scoped 메타 (우리 + GitButler) / 외부 메모리 레이어 (Mem0·LangMem)
- **Cline Memory Bank 6 표준 파일** 구조 (projectbrief / productContext / activeContext / systemPatterns / techContext / progress) — 우리 handover.md를 분리할 청사진
- **Spring AI Session API의 branch label 패턴** — 우리 트랙별 sub-handover의 이론적 정당화 (점-구분 ancestry 경로)
- **AGENTS.md staleness 함정** — 분기 audit, 200줄 임계, nested 분할, YAML frontmatter progressive disclosure
- **자동 handover 갱신 5종** 비교: 수동 / Stop hook 강제 (현재 우리) / git-stint / claude-git shadow / CI 통합 (Anthropic Issue→PR)
- **Anthropic 미해결 worktree-hook 이슈 6건** 정리 (#16600, #46808, #49989, #28041, #34437, #31872) — 우리 hook이 침묵할 위험 식별
- **`stop-handover-check.js` 구체 개선 제안**: 워크트리 인지 분기, 트랙 ID 추출, 차단 대신 자동 초안 생성, fallback log
- **Boris Cherny 2026 best practice** 검증 — 3-5 worktrees, alias 패턴, `/btw`, tab 번호화, CLAUDE.md SSOT 유지가 우리 방향과 일치
- **Agent Teams 실전 사례**: incident.io (4-5 sessions), Sanjoy Kumar Malik (Spring Boot 2시간 microservice), Sigrid Jin (한국, 25B token/year)
- **도메인별 vs 레이어별 에이전트 분할** 트레이드오프 — 우리 헥사고날 + 도메인 격리 구조에 옵션 B (현재 우리 방식)가 정답인 이유
- **CrewAI / LangGraph "prototype-then-migrate"** 패턴 — NPC 백엔드에 적용 검토
- **Attention 분배 패턴**: desktop 분할, terminal alias (`za`/`zb`/`zc`/`zr`), 인터럽트 처리 (SessionStart hook 신규 도입 권장)
- **즉시 적용 7개 액션** + 중장기 12개 권장안

#### 핵심 1차 출처

- Issue #16600 — CLAUDE.md traversal worktree boundary: <https://github.com/anthropics/claude-code/issues/16600>
- Issue #46808 — Hooks not triggered in worktree: <https://github.com/anthropics/claude-code/issues/46808>
- Cline Memory Bank: <https://docs.cline.bot/features/memory-bank>
- Spring AI Session API (event-sourced, branch-aware, 2026-04): <https://spring.io/blog/2026/04/15/spring-ai-session-management/>
- git-stint (session-scoped tracking, Stop hook auto-commit): <https://github.com/rchaz/git-stint>
- claude-git (shadow worktree): <https://github.com/listfold/claude-git>
- Boris Cherny — 3-5 worktrees parallel: <https://x.com/bcherny/status/2017742743125299476>
- Augment Code — How to Build AGENTS.md (2026): <https://www.augmentcode.com/guides/how-to-build-agents-md>
- AGENTS.md v1.1 progressive disclosure: <https://github.com/agentsmd/agents.md/issues/135>
- mattbrailsford.dev — worktree skill → hook 마이그레이션: <https://mattbrailsford.dev/replacing-my-custom-git-worktree-skill-with-claude-code-hooks>
- tfriedel/claude-worktree-hooks (env, deps, port): <https://github.com/tfriedel/claude-worktree-hooks>
- Spring Boot 2시간 마이크로서비스 (Sanjoy Kumar Malik): <https://medium.com/@sanjoykumarmalik/claude-code-playbook-for-spring-boot-microservice-development-879a508cc190>

---

## 2026-04-24

### 멀티 에이전트 / 워크트리 / 협업 패턴 리서치 노트

사용자가 메인 Claude Code 세션 + git worktree로 ws-redis / ui / s3 트랙을 병행하는 셋업을 막 구축한 직후, "이 셋업이 업계에서 일반적인지 / 충돌은 어떻게 처치하는지"라는 메타 질문에 답하기 위한 리서치.

#### 신규 문서: `ai-native/multi-agent-workflows.md`

- **단일 → 멀티 4단계 사다리** 정리 (Stage 0 single sync / Stage 1 multi-window / Stage 2 worktree-isolated [사용자 위치] / Stage 3 orchestrated team)
- **도구별 멀티 세션 지원 현황** 표 (Claude Code, Cursor 3, OpenAI Codex, Aider, Cline, Copilot, Windsurf, Devin) — 2026-02 multi-agent 동시 출시 윈도우 식별
- **Worktree + 에이전트 실제 사용자 보고서** 인용 (Anthropic 내부, incident.io, Laurent Kempé, Trigger.dev의 worktree 폐기 반대 사례)
- **충돌 처치 4계층**: 사전 회피 / Orchestration / Lock / 사후 AI 해결 — 각 계층 도구·사례
- **프레임워크 비교**: Anthropic Managed Agents, Claude Code Agent Teams, LangGraph, CrewAI, AutoGen, OpenAI Agents SDK, GitButler — 마음의 고향 적합성 포함
- **2026 상반기 표준 패턴 추측** 7가지 (worktree = isolation lingua franca, conductor → orchestrator, AGENTS.md 표준화 등)
- **마음의 고향 셋업 위치 평가**: Stage 2 후반 ~ Stage 3 초입, "앞으로 일반화될 패턴을 6개월 빨리 채택" 정의
- **함정 가능성 5가지**: worktree 디스크 폭증, 공유 캐시·DB 충돌, 포트 충돌, CLAUDE.md drift, 트랙별 handover.md 모호성
- **권장 다음 단계 6가지**: AGENTS.md 도입, `git rerere` 활성화, Testcontainers 트랙별 격리, clash-sh 시범, GitButler 평가, cost monitoring

#### 핵심 1차 출처

- Anthropic Managed Agents (Brain/Hands/Session): <https://www.anthropic.com/engineering/managed-agents>
- Anthropic Effective Harnesses: <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>
- Claude Code Agent Teams: <https://code.claude.com/docs/en/agent-teams>
- Cursor 3 (agent-first IDE, 2026-04-02): <https://cursor.com/blog/cursor-3>
- OpenAI Codex Subagents: <https://developers.openai.com/codex/subagents>
- Addy Osmani — Code Agent Orchestra: <https://addyosmani.com/blog/code-agent-orchestra/>
- Addy Osmani — Conductors to Orchestrators: <https://www.oreilly.com/radar/conductors-to-orchestrators-the-future-of-agentic-coding/>
- AGENTS.md 표준: <https://agents.md/>
- clash-sh (worktree 충돌 사전 탐지): <https://github.com/clash-sh/clash>
- Trigger.dev — Ditched worktrees for GitButler: <https://trigger.dev/blog/parallel-agents-gitbutler>
- Source.dev Harmony (88~90% 충돌 자동 해결): <https://www.source.dev/journal/harmony-preview>
- Pragmatic Engineer — AI Tooling 2026: <https://newsletter.pragmaticengineer.com/p/ai-tooling-2026>

---

## 2026-04-21

### Next.js Standalone + Docker Healthcheck IPv6 바인딩 이슈 정리

PR #17/#18/#19 CD 파이프라인 연속 실패를 해결한 과정을 리서치 기반 의사결정 기록으로 정리.

#### 신규 문서: `infra/nextjs-docker-healthcheck-ipv6-binding.md`

- 근본 원인 삼중 교착 분석
  - Next.js standalone `server.js` 기본 hostname이 `localhost` (Issue #44043)
  - Node 17+ `localhost` IPv6(`::1`) 우선 해석 (Node Issue #40537, #48712)
  - Alpine BusyBox `wget`/`nc` IPv6 미지원 (Alpine aports #10937, #16286)
- 우리 해결 `HOSTNAME=0.0.0.0`이 Vercel 공식 `examples/with-docker` 패턴과 일치함을 1차 출처로 검증
- 대안 6개 비교 (CLI flag, server.js 패치, curl 설치, `node -e "..."`, `/api/health` 라우트, nginx 프록시)
- 보안 고려사항: 컨테이너 내부 `0.0.0.0` 바인딩은 공격 면 증가 없음
- 블로그 소재로서의 가치 평가 — "세 레이어 우연의 교집합" 스토리

#### 리서치 핵심 출처 (1차)

- Next.js #44043 Hostname configuration: <https://github.com/vercel/next.js/issues/44043>
- Next.js #54025 13.4.15 listening host issue: <https://github.com/vercel/next.js/discussions/54025>
- Next.js #46090 next dev vs start IPv6: <https://github.com/vercel/next.js/issues/46090>
- Next.js PR #77612 bind address: <https://github.com/vercel/next.js/pull/77612>
- Node #40537 localhost IPv6 breaking change: <https://github.com/nodejs/node/issues/40537>
- Node #48712 Why IPv6 default: <https://github.com/nodejs/node/issues/48712>
- Alpine aports #10937 BusyBox wget IPv6 미지원: <https://gitlab.alpinelinux.org/alpine/aports/-/issues/10937>
- Alpine aports #16286 BusyBox netstat IPv6: <https://gitlab.alpinelinux.org/alpine/aports/-/issues/16286>
- Vercel with-docker Dockerfile (canary): <https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile>
- Next.js Self-Hosting 공식 문서: <https://nextjs.org/docs/app/guides/self-hosting>

---

## 2026-04-13

### 2026-02 / 2026-03 누락 데이터 소급 수집

#### anthropic-research.md 추가

- 2026-02: Anthropic RSP v3.0 / Risk Report 체계 도입 (Sabotage Risk Report, Opus 4.6)
- 2026-02: Anthropic Economic Index — 디렉티브 자동화 27% → 39% 급증, 코딩 작업 Claude.ai → API 이동
- 2026-03: Anthropic Economic Index Learning Curves — Agentic Coding Trends Report (Zapier 800 에이전트 사례)

#### claude-code-practices.md 추가

- 2026-02: Agent Teams 정식 도입 — Subagents P2P 메일박스 통신, 공유 태스크 리스트
- 2026-02: Remote Control (`/remote-control`), 플러그인 에코시스템 (13개 엔터프라이즈 커넥터)
- 2026-03: Computer Use (Pro/Max), Voice Mode (`/voice`, Push-to-Talk), `/loop` 스케줄 태스크
- 2026-03: Opus 4.6 출력 64k 기본 / 128k 최대, PowerShell 툴 프리뷰

#### software-paradigm.md 추가

- 2026-02: Karpathy MicroGPT 공개 (243줄 순수 Python GPT), Ambient Programming 개념
- 2026-03: Karpathy Autoresearch — 700회 자율 실험 / 11% LLM 학습 속도 향상, Agentic Engineering 선언
- 2026-03: AI Native Engineering 현황 — 95% 주간 AI 사용, 75% 절반 이상 AI, 병목이 "코드 작성"에서 "무엇을 만들지 결정"으로 이동

### 리서치 출처

- Claude Code Feb-Mar 2026 Technical Deep-Dive: <https://dev.to/shuicici/claude-codes-feb-mar-2026-updates-quietly-broke-complex-engineering-heres-the-technical-5b4h>
- Nagarro Claude Code Feb 2026 분석: <https://www.nagarro.com/en/blog/claude-code-feb-2026-update-analysis>
- Claude Code Agent Teams 가이드: <https://shipyard.build/blog/claude-code-multi-agent/>
- Claude Code March 2026 기능 해설: <https://help.apiyi.com/en/claude-code-2026-new-features-loop-computer-use-remote-control-guide-en.html>
- Anthropic RSP v3.0: <https://anthropic.com/feb-2026-risk-report>
- Anthropic Economic Index Mar 2026: <https://www.anthropic.com/research/economic-index-march-2026-report>
- Agentic Coding Trends 2026: <https://resources.anthropic.com/2026-agentic-coding-trends-report>
- Karpathy (Feb 2026): <https://simonwillison.net/2026/Feb/26/andrej-karpathy/>
- Karpathy Autoresearch GitHub: <https://github.com/karpathy/autoresearch>
- Karpathy Autoresearch Fortune: <https://fortune.com/2026/03/17/andrej-karpathy-loop-autonomous-ai-agents-future/>
- AI Native Engineering 2026: <https://newsletter.pragmaticengineer.com/p/ai-tooling-2026>

---

## 2026-04-12

### 초기 지식 베이스 구축

- Karpathy Software 3.0 / LLM OS / Agentic Engineering 개념 정리
- Anthropic 2026 Managed Agents, Trustworthy Agents, 에러 비일관성 연구 정리
- Claude Code 파워유저 실천법 정리
- 에이전트 조직도 초안 작성 (research/domain/adapter/test/review/docs-agent)
- `.claude/agents/` 디렉토리 구성
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 설정

### 리서치 출처

- Karpathy YC AI Startup School 키노트 (2025.06): <https://www.latent.space/p/s3>
- Karpathy X 포스트 Agentic Engineering (2026.01): <https://x.com/karpathy/status/2026731645169185220>
- Anthropic Managed Agents: <https://thenewstack.io/with-claude-managed-agents-anthropic-wants-to-run-your-ai-agents-for-you/>
- Anthropic Trustworthy Agents: <https://www.anthropic.com/research/trustworthy-agents>
- Claude Code Best Practices: <https://code.claude.com/docs/en/best-practices>
