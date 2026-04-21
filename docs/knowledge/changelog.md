# 지식 베이스 변경 이력

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
- Next.js #44043 Hostname configuration: https://github.com/vercel/next.js/issues/44043
- Next.js #54025 13.4.15 listening host issue: https://github.com/vercel/next.js/discussions/54025
- Next.js #46090 next dev vs start IPv6: https://github.com/vercel/next.js/issues/46090
- Next.js PR #77612 bind address: https://github.com/vercel/next.js/pull/77612
- Node #40537 localhost IPv6 breaking change: https://github.com/nodejs/node/issues/40537
- Node #48712 Why IPv6 default: https://github.com/nodejs/node/issues/48712
- Alpine aports #10937 BusyBox wget IPv6 미지원: https://gitlab.alpinelinux.org/alpine/aports/-/issues/10937
- Alpine aports #16286 BusyBox netstat IPv6: https://gitlab.alpinelinux.org/alpine/aports/-/issues/16286
- Vercel with-docker Dockerfile (canary): https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
- Next.js Self-Hosting 공식 문서: https://nextjs.org/docs/app/guides/self-hosting

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
- Claude Code Feb-Mar 2026 Technical Deep-Dive: https://dev.to/shuicici/claude-codes-feb-mar-2026-updates-quietly-broke-complex-engineering-heres-the-technical-5b4h
- Nagarro Claude Code Feb 2026 분석: https://www.nagarro.com/en/blog/claude-code-feb-2026-update-analysis
- Claude Code Agent Teams 가이드: https://shipyard.build/blog/claude-code-multi-agent/
- Claude Code March 2026 기능 해설: https://help.apiyi.com/en/claude-code-2026-new-features-loop-computer-use-remote-control-guide-en.html
- Anthropic RSP v3.0: https://anthropic.com/feb-2026-risk-report
- Anthropic Economic Index Mar 2026: https://www.anthropic.com/research/economic-index-march-2026-report
- Agentic Coding Trends 2026: https://resources.anthropic.com/2026-agentic-coding-trends-report
- Karpathy (Feb 2026): https://simonwillison.net/2026/Feb/26/andrej-karpathy/
- Karpathy Autoresearch GitHub: https://github.com/karpathy/autoresearch
- Karpathy Autoresearch Fortune: https://fortune.com/2026/03/17/andrej-karpathy-loop-autonomous-ai-agents-future/
- AI Native Engineering 2026: https://newsletter.pragmaticengineer.com/p/ai-tooling-2026

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
- Karpathy YC AI Startup School 키노트 (2025.06): https://www.latent.space/p/s3
- Karpathy X 포스트 Agentic Engineering (2026.01): https://x.com/karpathy/status/2026731645169185220
- Anthropic Managed Agents: https://thenewstack.io/with-claude-managed-agents-anthropic-wants-to-run-your-ai-agents-for-you/
- Anthropic Trustworthy Agents: https://www.anthropic.com/research/trustworthy-agents
- Claude Code Best Practices: https://code.claude.com/docs/en/best-practices
