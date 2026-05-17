---
last-verified: 2026-05-16
tags: [ai-native, claude-code, html-vs-md, agent-os, skills, opus-4-7, spec-driven]
scope: 마음의 고향 (Spring Boot 4.x + Next.js, AI Native dev env)
trigger: "사용자가 'md 대신 html 쓰자', 'Agent OS' 언급 — 16일 공백 종합 점검"
---

# 2026-05 AI Native 종합 스위프 — 4섹션 깊이 분석

> 4-30 (Karpathy Skills 분석) 이후 16일 공백 동안 업계에서 일어난 굵직한 변화 4가지를 깊이 추적.
> 각 섹션 끝에 **우리 프로젝트 적용 매트릭스** + 전체 문서 끝에 **도입 권고/조건부/보류** 통합 표.

---

## A. Markdown vs HTML / XML for LLM prompts (2026-05 시점)

### A.1 발화의 진원지 — Thariq Shihipar (Anthropic Claude Code team)

2026-05-08, Anthropic Claude Code 팀의 엔지니어 **Thariq Shihipar** 가
"**Using Claude Code: The Unreasonable Effectiveness of HTML**" 라는 글을 X 에 발행.

핵심 주장:
- "1M 컨텍스트가 일상이 된 2026, Markdown 의 토큰 절약 명분은 사라졌다."
- Claude Code 팀 내부에서 plans / code reviews / design systems / reports 의 **default format 을 HTML 로 전환** 했다고 명시.
- HTML 만의 강점: **real tables with alignment/spanning** (MD 테이블은 표현 못 함), **SVG 다이어그램**, **interactive widgets**, **in-page navigation (anchor)**, **CSS 로 정보 밀도 조절**.

반응 규모:
- 16시간 만에 X 4.4M views / 8.2K likes / 15.7K bookmarks
- Hacker News 1000+ points 토론 (item id 48071940)
- Simon Willison 이 자기 블로그에 정리 (2026-05-08 simonwillison.net)

출처:
- [Simon Willison — Using Claude Code: The Unreasonable Effectiveness of HTML](https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/)
- [Hacker News 토론](https://news.ycombinator.com/item?id=48071940)
- [Pasquale Pillitteri — Thariq Changed the Default (May 2026)](https://pasqualepillitteri.it/en/news/2243/html-vs-markdown-claude-code-thariq-anthropic)
- [Joe Njenga — I Tested His HTML In Claude Code](https://medium.com/@joe.njenga/anthropic-engineer-just-killed-markdown-as-ai-output-i-tested-his-html-in-claude-code-hes-right-71816cf8e414)

### A.2 중요한 구분 — Input(읽기) vs Output(쓰기), Human vs Agent

**Thariq 의 주장은 "에이전트의 OUTPUT 포맷" 한정.** 이 부분이 SNS 에서 많이 잘렸다.
실제 정리하면 4분면이 나온다:

| 방향 | 누가 읽는가 | 권장 포맷 | 근거 |
|------|------------|----------|------|
| Input → Agent | LLM | **Markdown + XML 태그** | 토큰 87.5% 절약 (web2md 벤치), Claude 가 XML 태그 학습됨 |
| Output → Agent (agent-to-agent) | 다른 LLM/시스템 | **Markdown** | "cheaper, more accurately parsed, easier to version" |
| Output → Human (read-only) | 사람 (검토만) | **HTML** | 정보 밀도, 표 / SVG / 인터랙티브 |
| Output → Human (편집필요) | 사람 (재편집) | **Markdown** | HTML 은 손으로 못 고침 (HN 최상위 비판) |

출처:
- [Beam AI — HTML vs Markdown for AI Agents: Which Format Wins in 2026](https://beam.ai/agentic-insights/html-vs-markdown-which-format-actually-makes-ai-agents-more-useful)
- [Web2MD — Markdown vs HTML for LLM](https://web2md.org/blog/markdown-vs-html-for-llm)
- [Tarik Davis — Markdown vs HTML for LLM Agents 2026 Showdown](https://www.tarikdavis.co.uk/blog/markdown-vs-html-for-llm-agents-the-2026-format-showdown/)

### A.3 Anthropic 공식 권고는 변했는가? — **NO**

`platform.claude.com/docs/en/build-with-claude/prompt-engineering/...` 공식 가이드는
**여전히 XML 태그를 prompt structure 의 권장 패턴으로 명시.** HTML 권고로 확장되지 **않음.**
Thariq 의 글은 개인 의견 + 팀 내부 관행 공유 수준이며, Anthropic 공식 docs 의 공식 입장은 **XML > MD > HTML (input 기준)**.

출처:
- [Anthropic — Use XML tags](https://docs.anthropic.com/en/docs/use-xml-tags)
- [Anthropic — Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Why XML Tags Are so Fundamental to Claude — glthr](https://glthr.com/xml-fundamental-to-claude)

검증 필요: "Anthropic 공식이 HTML 로 가고 있다" 는 주장은 **확인되지 않음.** Thariq 개인 글의 과대 해석.

### A.4 주요 비판 (HN 상위)

1. **편집성** — "스펙시트라면 직접 들어가서 수정해야 하는데, HTML 은 그게 어렵다" (HN 최상위)
2. **생성 비용/지연** — "리치 HTML 은 동등 MD 의 5배 시간이 든다. 대화 플로우에서는 지연이 체감된다."
3. **소스 가독성·보안·생태계** — Kurtis Redux 의 반박글 "Unreasonable Ineffectiveness of HTML": visual gloss for source readability / security / ecosystem compatibility / reviewability 의 트레이드.
4. **버전 관리** — git diff 에서 HTML 변경 추적이 MD 보다 훨씬 어려움.

출처:
- [Kurtis Redux — The Unreasonable Ineffectiveness of HTML](https://kurtis-redux.medium.com/the-unreasonable-ineffectiveness-of-html-5bd01ae1e879)
- [UXHack — Markdown is Dead? Why Claude is Pivoting back to HTML](https://uxhack.substack.com/p/markdown-is-dead-why-claude-is-pivoting)

### A.5 우리 프로젝트 적용 매트릭스 — 섹션 A

| 우리 파일군 | 현재 포맷 | 평가 | 액션 |
|-----------|----------|------|------|
| `CLAUDE.md` (Agent system prompt) | MD + XML 태그 일부 | **유지** — Claude 학습된 형식, XML 태그 추가 여지 | XML 태그(`<critical>`, `<rule>`) 부분 보강만 검토 |
| `docs/conventions/*.md` | MD | **유지** — agent input 이며 사람도 수정 | 변경 불필요 |
| `docs/specs/features/*.md` | MD | **유지** — agent input + 사람 편집 | 변경 불필요 |
| `docs/handover/*.md` | MD | **유지** — 세션 간 상태 (input) | 변경 불필요 |
| `docs/learning/*.md` | MD | **유지** — 학습노트 (input + 사람 검토) | 변경 불필요 |
| `docs/knowledge/*.md` | MD | **유지** — 본 문서 포함, knowledge base | 변경 불필요 |
| (없음) plans / 인터랙티브 리포트 | — | 만약 만들 일이 있다면 HTML 검토 | 현재 없음 |

**1차 판단: 보류 (대부분) + 조건부 (CLAUDE.md 의 XML 태그 보강만).**

이유:
- 우리 문서는 90%가 **agent input + 사람이 편집** 하는 위치 → MD 가 정확히 정답
- 우리는 시각화 리포트나 인터랙티브 plans 산출이 없음 → HTML 의 강점이 발휘될 자리가 없음
- Thariq 주장의 핵심 케이스는 "code review 결과를 HTML 로 시각화" 인데, 우리는 CodeRabbit/Codex 가 GitHub PR 위에서 처리 → 우리 케이스 아님

**예외: CLAUDE.md 의 Critical Rules 같은 강한 명령 블록은 `<rule>` XML 태그로 감싸면 명령 강도 ↑** 가능. 이것은 §C 의 SKILL.md 진화 패턴과 연결됨.

---

## B. Agent OS (Builder Methods, Brian Casel)

### B.1 정체 — Spec-driven 표준화 프레임워크 (v3, 2026)

- 개발자: **Brian Casel (Builder Methods)**
- 공식: [buildermethods.com/agent-os](https://buildermethods.com/agent-os) / [GitHub buildermethods/agent-os](https://github.com/buildermethods/agent-os)
- 라이선스: 오픈소스 (무료)
- v3 출시: 2026, "Leaner & Smarter for Building in 2026"

핵심 가치 제안:
> "AI agent 가 production-quality 코드를 쓰려면 구조화된 컨텍스트가 필요하다.
> Agent OS 는 specs, standards, workflows 를 제공해서 inconsistent output 을 reliable / production-ready 로 바꾼다."

v3 의 4대 기능:
1. **Discover Standards** — `/discover-standards`: 코드베이스에서 패턴/관습 추출해서 문서화
2. **Deploy Standards** — `/inject-standards`: 작업할 때 관련 standards 만 자동 주입 (index.yml 기반)
3. **Shape Spec** — `/shape-spec`: Plan mode 와 협업, 타겟 질문으로 spec 강화
4. **Index Standards** — 표준을 조직화/검색 가능하게 유지

호환:
- Claude Code, Cursor, Antigravity, OpenCode, Codex 등 어느 AI 도구든 OK
- 언어/프레임워크 무관

출처:
- [Agent OS v3 Discussion #310 (GitHub)](https://github.com/buildermethods/agent-os/discussions/310)
- [Recapio — Agent OS v3 Leaner & Smarter for 2026 (Brian Casel)](https://recapio.com/digest/agent-os-v3-leaner-smarter-for-building-in-2026-by-brian-casel)
- [Sugumar Panneerselvam — Agent OS: The Missing Layer in AI-Driven Software Development](https://medium.com/@sugumar.p/agent-os-the-missing-layer-in-ai-driven-software-development-7692a61a21e6)

### B.2 v2 → v3 의 결정적 변화

v3 에서 **implementation / orchestration 단계를 의도적으로 retire** 했다.
"오늘의 frontier 모델은 spec implementation 을 알아서 잘 한다.
Agent OS 는 spec 생성·표준 주입에만 집중하는 게 2026+ 의 정답."

→ 이건 우리 spec-driven 4층 모델의 발견과 같은 방향이다.

### B.3 우리 spec-driven 4층 (Issue / Spec / Track / Step) 과의 비교

| 축 | 우리 (CLAUDE.md §5 + docs/conventions/spec-driven.md) | Agent OS v3 |
|----|-------------------------------------------------------|--------------|
| Spec 작성 | `docs/specs/features/{feature}.md` + `_template.md` (outcomes/scope/decisions 4축/tasks/verification) | `/shape-spec` (Plan Mode 위에서 표적 질문) |
| 표준 관리 | `docs/conventions/*.md` (coding/testing/git/parallel-work/spec-driven/wiki-policy) — **수동 작성** | `/discover-standards` (코드베이스에서 자동 추출) + `index.yml` |
| 표준 주입 | CLAUDE.md 가 진입점 → 사람이 라우팅 / Comprehension Gate Tier 결정 | `/inject-standards` (관련 표준만 자동 선택 주입) |
| Implementation | 1 step = 1 PR + 자동 fix-loop (테스트 3회 / review 2회) | 명시적 단계 없음 (frontier model 에 위임) |
| 학습/회고 | `docs/learning/{N}_*.md` (트레이드오프 발생 시 즉시) + RESERVED 번호 정책 | 없음 |
| 트랙 시스템 | `docs/handover/track-{id}.md` + 병행 트랙 충돌 회피 (parallel-work.md) | 없음 |

**교집합**: Spec 작성 강화, 표준의 컨텍스트 주입.
**우리 우위**: 학습노트 / RESERVED / 트랙 / Comprehension Gate Tier / 자동 fix-loop / handover (Agent OS 에 전혀 없는 5개 차원).
**Agent OS 우위**: `/discover-standards` (코드에서 자동 발굴), `/inject-standards` (관련성 기반 선택 주입 with `index.yml`).

### B.4 도입 비용 vs 효과

**도입 비용**:
- CLI 설치 + 프로젝트 셋업 (낮음)
- 기존 `docs/conventions/*.md` 6개를 Agent OS 의 standards 포맷으로 마이그 (중간) — 또는 그대로 두고 `/inject-standards` 의 라우팅만 위에 얹기 (낮음)
- 슬래시 커맨드 충돌 (`/shape-spec` vs 우리 `/spec-new`) — 네이밍 정리 필요

**효과**:
- `/discover-standards` 가 우리에게 **새로움** — 신규 트랙에서 "이 도메인의 기존 패턴이 뭐냐" 자동 진단. 우리는 지금 사람이 코드 읽어서 판단.
- `/inject-standards` 의 index.yml 기반 자동 라우팅은 **유익** — 현재 CLAUDE.md §9 Document Routing 이 사람 라우팅임. 자동화 가능.

### B.5 우리 프로젝트 적용 매트릭스 — 섹션 B

| 기능 | 우리에게 새로움 | 도입 가치 | 충돌 위험 |
|-----|----------------|----------|----------|
| `/discover-standards` | ✅ 매우 새로움 | 높음 (legacy 도메인 진입 시) | 낮음 |
| `/inject-standards` (index.yml) | ✅ 새로움 | 중간 (수동 라우팅으로도 충분히 잘 돌아감) | 중간 — CLAUDE.md §9 와 중복 |
| `/shape-spec` | ❌ 우리 `/spec-new` 와 같음 | 낮음 | 높음 (네이밍 충돌) |
| Standards 마이그 (docs/conventions → AOS 포맷) | ❌ | 낮음 | 높음 (대규모 이동) |
| AOS Workflow 전체 채택 | ❌ 우리 Phase A/B/C 가 더 정교함 | 낮음 | 높음 |

**1차 판단: 조건부 도입** — 전체 채택 X, `/discover-standards` 만 차용 검토.

이유:
- 우리 spec-driven 4층 모델은 Agent OS 보다 **학습/트랙/병행/자동화** 차원에서 더 정교함 → 통째로 갈아탈 이유 없음
- 하지만 **`/discover-standards` 패턴은 우리에게 진짜 새로움**. 신규 도메인 트랙 시작 시 "이 도메인 기존 패턴 자동 진단" 슬래시 스킬을 우리 포맷으로 만드는 건 가치 있음 (Agent OS 패키지 그대로 깔지 말고 패턴만 차용)
- `/inject-standards` 는 우리 `docs/conventions/` 가 6개뿐이라 자동 라우팅의 ROI 가 낮음 — 보류

출처 (추가):
- [Tim Wang — Spec-kit, BMAD, Agent OS and Kiro 비교](https://medium.com/@tim_wang/spec-kit-bmad-and-agent-os-e8536f6bf8a4)
- [Jorge Herrera — Impressed with Agent OS efficacy](https://www.jorgeherrera.me/blog/impressed-with-agent-os-efficacy/)
- [Agent OS workflow 공식](https://buildermethods.com/agent-os/workflow)

---

## C. Anthropic Skills (SKILL.md) 의 2026 진화 상태

### C.1 SDK 리네이밍 — Claude Code SDK → **Claude Agent SDK**

Anthropic 이 SDK 를 리브랜드 (2026 초). 같이 추가된 것:
- **subagents** (default 지원, isolated context, parallelization)
- **lifecycle hooks** (session start / tool call / stop / subagent completion)
- **Agent Skills** (SKILL.md 포맷)

출처:
- [Anthropic — Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Anthropic — Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic — Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)

### C.2 SKILL.md 의 핵심 설계 패턴 — Progressive Disclosure

**Skill = 디렉토리** 안에 **SKILL.md** + (선택) 보조 파일들.
SKILL.md 는 YAML frontmatter 로 시작 (name + description 필수).

**Progressive Disclosure 3층**:
1. **L1 — 메타데이터만 system prompt 에 pre-load**: 모든 설치된 skill 의 name + description 만. 토큰 최소.
2. **L2 — SKILL.md 본문 로드**: Claude 가 "이 작업에 이 skill 관련 있다" 판단하면 full body 만 컨텍스트로.
3. **L3 — 참조 파일 로드**: SKILL.md 가 `reference.md` / `forms.md` 등을 가리키면, 실제로 그 기능 쓸 때만 추가 로드.

예: Anthropic 공식 PDF skill 은 SKILL.md 가 lean 하게 유지되고, form-filling 시에만 forms.md 가 로드됨.

출처:
- [SwirlAI — Agent Skills: Progressive Disclosure as a System Design Pattern](https://www.newsletter.swirlai.com/p/agent-skills-progressive-disclosure)
- [Phil Whittaker — Progressive Discovery: A Better Mental Model for Agent Skills](https://dev.to/phil-whittaker/progressive-discovery-a-better-mental-model-for-agent-skills-51bd)
- [Firecrawl — Agent Skills Explained: How SKILL.md Files Work](https://www.firecrawl.dev/blog/agent-skills)
- [Anthropic — Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

### C.3 Slash Commands ↔ Skills — **2026 에 합쳐졌다**

중요한 변화: 옛 `.claude/commands/*.md` 와 `.claude/skills/*/SKILL.md` 가 **merge** 됨.

- 둘 다 `/command-name` 으로 호출 가능
- 같은 이름이면 **skill 이 우선**
- Anthropic 의 권장은 **skill 쪽으로 마이그**

Skill 이 slash command 보다 가진 것:
- supporting files (보조 md, scripts, resources)
- frontmatter 제어 (allowed-tools, model, description 의 트리거 조건)
- dynamic context injection via shell command output
- 자연어 호출 (Claude 가 description 보고 자동 선택) + 명시적 `/name` 호출 둘 다 가능

출처:
- [Product Talk — How to Use Claude Code: Guide to Slash Commands, Agents, Skills, Plug-ins](https://www.producttalk.org/how-to-use-claude-code-features/)
- [BoringBot — Claude Code: Skills, Subagents, Hooks, Plugins, and Harnesses](https://boringbot.substack.com/p/claude-code-skills-subagents-hooks)
- [Awesome Claude Code — Curated list](https://github.com/hesreallyhim/awesome-claude-code)

### C.4 우리 7개 슬래시 스킬 vs 정식 Skill 포맷

우리 보유: `wiki-lint`, `학습노트`, `브랜치정리`, `spec-new`, `step-start`, `track-end`, `track-start`

**현재 포맷**: 이미 `.claude/skills/{name}/SKILL.md` 디렉토리 구조 — 정식 Skill 위치는 맞음. 다만 progressive disclosure (supporting files 분리) 적용 여부는 스킬별 점검 필요.

**정식 Skill 포맷으로 더 보강할 가치 있는가?**

| 스킬 | 보강 가치 | 이유 |
|------|----------|------|
| `track-start` | 높음 | 트랙 시작은 다단계 (issue 생성 / handover 파일 / RESERVED 예약 / 메인 갱신) — supporting files 로 분리 ROI ↑ |
| `track-end` | 높음 | 종료는 더 복잡 (PR 안에 docs 묶기 / handover INDEX 활성→완료 / 메인 §1·§2·§4 / RESERVED 정리) — 체크리스트를 별도 md 로 분리 가능 |
| `spec-new` | 중간 | `_template.md` 가 이미 있고 잘 작동 중. supporting file 로 더 깔끔해질 여지는 있음 |
| `step-start` | 중간 | Comprehension Gate Tier 분기 로직이 skill body 에 들어가면 좋음 |
| `학습노트` | 낮음 | 단순. 현재 포맷으로 충분 |
| `wiki-lint` | 낮음 | 단순 검증 |
| `브랜치정리` | 낮음 | 단순 git 작업 |

**1차 판단: 조건부 — 상위 4개 (track-start/end, spec-new, step-start) 의 supporting files 분리만 검토.**

기대 효과:
- Progressive disclosure 로 토큰 절약 (track-end 의 체크리스트가 매번 prompt 에 안 들어옴)
- 자연어 호출 가능 ("이 트랙 끝낼게" → Claude 가 track-end skill 자동 매칭)
- frontmatter 의 `allowed-tools` 로 보안 강화 가능

### C.5 우리 22개 서브 에이전트 vs Skill 의 분기

| 사용 케이스 | Skill 적합 | Subagent 적합 |
|------------|----------|--------------|
| 정형화된 워크플로우 (track-end, spec-new) | ✅ | ❌ |
| 독립된 컨텍스트 / 병렬 처리 (코드 리뷰, 리서치) | ❌ | ✅ |
| 동적 의사결정 + 외부 도구 호출 | △ | ✅ |
| 단순 명령 반복 | ✅ | ❌ |

→ 우리 슬래시 스킬은 **Skill 쪽**, 22개 서브 에이전트는 **그대로 subagent 유지** 가 맞다. 둘은 경쟁이 아니라 분업.

### C.6 우리 프로젝트 적용 매트릭스 — 섹션 C

| 항목 | 액션 | 우선순위 |
|------|------|---------|
| `track-start` supporting files 분리 (issue 템플릿 / handover 템플릿) | 검토 | 높음 |
| `track-end` supporting files 분리 (체크리스트 / wiki 영향 분석 / RESERVED 정리) | 검토 | 높음 |
| `spec-new` supporting files 분리 (`_template.md` 흡수) | 검토 | 중간 |
| `step-start` supporting files 분리 (Comprehension Gate Tier 표) | 검토 | 중간 |
| 나머지 3개 (`학습노트`, `wiki-lint`, `브랜치정리`) | 현 포맷 유지 | 낮음 |
| 22개 subagent | 그대로 유지 | — |

---

## D. 2026 Q1~Q2 Claude Code 신기능 / 패턴

### D.1 Claude Opus 4.7 — 1M Context 의 도래 (2026-04-16)

- 1M 토큰 컨텍스트 윈도우 (Sonnet 4.6 의 5배)
- 128k max output
- **Adaptive thinking** (extended thinking 의 진화)
- **Task budgets** — 에이전트 루프 전체에 토큰 예산 설정. 모델이 카운트다운 보면서 우선순위 조정.
- 새 tokenizer — 같은 입력에 **최대 35% 더 많은 토큰** 소비 (성능 개선의 대가)
- Claude Code 의 fast mode default 가 Opus 4.6 → 4.7 로 전환

새로운 워크플로우 베스트 프랙티스:
1. **Front-load intent** (앞단에 명령 집중)
2. **Effort levels 제어** (낮음/중간/높음)
3. **60% 시점 proactive compaction** — autocompact 기다리면 이미 quality 가 떨어진 상태. lost-in-the-middle 문제는 1M 에서도 발생.
4. **Isolate expensive exploration** (subagent 로 격리)
5. **Remove dead ends** (실패한 시도는 깨끗이 비우기)

출처:
- [Anthropic — What's new in Claude Opus 4.7](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7)
- [Damian Galarza — Claude Opus 4.7 + Claude Code: 7 Tips for Extended Context](https://www.damiangalarza.com/posts/2026-04-30-claude-opus-4-7-claude-code-tips-extended-context/)
- [Caylent — Claude Opus 4.7 Deep Dive: Capabilities, Migration, New Economics](https://caylent.com/blog/claude-opus-4-7-deep-dive-capabilities-migration-and-the-new-economics-of-long-running-agents)
- [BridgeMind — Claude Opus 4.7 Context Window: The 1M-Token Strategy](https://www.vibecademy.ai/blog/claude-opus-4-7-context-window-strategy)

### D.2 Plugin Marketplace + Hooks 진화 (2026-05)

**Plugin Marketplace** (May 2026):
- `/skills` / `/plugin` 프롬프트에서 real-time 필터링
- `--plugin-dir` 가 .zip 아카이브 지원
- `--plugin-url` 신설 — URL 에서 플러그인 직접 fetch (사내 artifact store 에서 시도용)
- 공식 마켓 [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)

**Hooks 강화**:
- `effort.level` JSON 인풋 필드 + `$CLAUDE_EFFORT` 환경변수 — 훅이 현재 effort 알 수 있음
- MCP stdio 서버가 `CLAUDE_PROJECT_DIR` 환경변수 받음 (훅과 일치)
- 훅이 터미널에 못 쓰도록 격리 (interactive prompt corruption 방지)
- MCP 서버 transient error 시 3회 auto-retry

출처:
- [Pasquale Pillitteri — Claude Code May 2026 Release Notes (Plugin Marketplace)](https://pasqualepillitteri.it/en/news/2223/claude-code-may-2026-release-notes-radio-plugin-marketplace)
- [Releasebot — Claude Code May 2026 updates](https://releasebot.io/updates/anthropic/claude-code)
- [Anthropic Claude Code Changelog](https://code.claude.com/docs/en/changelog)

### D.3 Memory Bank 패턴 — Cline → Claude Code 진화

Cline 의 Memory Bank 방법론이 Claude Code 용으로 적응. 현재 활발한 GitHub 레포:
- [russbeye/claude-memory-bank](https://github.com/russbeye/claude-memory-bank) — token-tuned, 자동 work tracking
- [hudrazine/claude-code-memory-bank](https://github.com/hudrazine/claude-code-memory-bank) — Cline 메소드 적응
- [centminmod/my-claude-code-setup](https://github.com/centminmod/my-claude-code-setup) — CLAUDE.md memory bank system

Claude Code 의 **이중 메모리 시스템** (Anthropic 공식):
1. **CLAUDE.md** — 사람이 쓴 persistent instructions
2. **Auto memory** — Claude 가 스스로 corrections / preferences 저장 (build commands, debugging insights, architecture notes, code style)

우리 `memory/MEMORY.md` 가 이미 두 번째 시스템 (Auto memory) 의 직접 구현. 그래서 메모리 베이스라인은 우리가 이미 업계 패턴과 일치.

추가 인사이트 from Bijit Ghosh 의 "Complete Guide to CLAUDE.md" (2026-05):
- **Memory loading order**: project CLAUDE.md → user CLAUDE.md → directory-specific CLAUDE.md (해당 디렉토리 작업 시)
- **Cross-tool compression** — 같은 메모리를 Cursor / Codex / Antigravity 와 공유하기 위한 패턴 (AGENTS.md 표준)

출처:
- [Anthropic — How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Bijit Ghosh — Complete Guide to CLAUDE.md (May 2026)](https://medium.com/@bijit211987/the-complete-guide-to-claude-md-memory-rules-loading-and-cross-tool-compression-97cc12ed037b)
- [Gul Jabeen — Claude Code Memory Management: The Complete Guide 2026](https://medium.com/data-science-collective/claude-code-memory-management-the-complete-guide-2026-b0df6300c4e8)
- [obviousworks — Designing CLAUDE.md correctly: 2026 Architecture](https://www.obviousworks.ch/en/designing-claude-md-right-the-2026-architecture-that-finally-makes-claude-code-work/)

### D.4 Codex / CodeRabbit / Claude Code Review — 코드 리뷰 봇 통합

**CodeRabbit ↔ Claude Code 통합 (2026-02 launch, 진화 중)**:
- Claude Code 에서 CodeRabbit review 를 직접 트리거
- "What's wrong with my changes?" → CodeRabbit 플러그인 자동 호출
- 자율 루프: Claude writes → CodeRabbit reviews → Claude fixes → 사람 승인까지 무인 진행
- CLI 무료 버전 [coderabbit.ai/cli](https://www.coderabbit.ai/cli)
- 2026-02 Issue Planner 베타 — 코드 작성 전 단계까지 확장 (Linear/Jira/GitHub Issues/GitLab)

**Anthropic Claude Code Review (2026-03-09 출시)**:
- Anthropic 의 자체 리뷰 시스템 — fleet of specialized agents 가 parallel 검사
- 각 에이전트가 다른 범주 담당: logic errors / security / edge cases / regressions
- 우리 22개 subagent 패턴과 같은 철학

출처:
- [CodeRabbit — Claude Code integration](https://docs.coderabbit.ai/cli/claude-code-integration)
- [Anthropic — CodeRabbit Plugin for Claude](https://claude.com/plugins/coderabbit)
- [Futurum Group — CodeRabbit's Codex Plugin: End of Context-Switching in Code Review?](https://futurumgroup.com/insights/does-coderabbits-codex-plugin-signal-the-end-of-context-switching-in-code-review/)
- [CallSphere — AI Code Review Tools Compared 2026](https://callsphere.ai/blog/ai-code-review-tools-comparison-coderabbit-graphite-claude-2026)

우리 현황 비교:
- 우리는 Codex CLI + CodeRabbit 둘 다 PR 봇으로 운영 중 (memory/reference_github_bots.md)
- Claude Code 안에서 직접 호출하는 통합은 **아직 미설치** — `coderabbit` Claude Code 플러그인 1줄 설치로 가능
- Anthropic 의 자체 review 시스템은 우리 review-agent subagent 와 거의 같은 디자인

### D.5 Spec-driven Development 도구 생태계 정리

2026-05 시점 주요 도구:

| 도구 | 라이선스 | 별 | 강점 | 약점 |
|------|---------|---|------|------|
| GitHub Spec-Kit | Open / Python CLI | 93k+ | 30+ AI agent 지원 / constitution 패턴 | 가장 일반적 |
| BMAD-METHOD | MIT | 46.7k | 12+ persona agent / 풀 SDLC | 작은 팀엔 오버킬 |
| Agent OS v3 | Open (Builder Methods) | — | Standards discovery / spec shaping | 자체 implementation 없음 |
| Kiro | 상용 IDE (Code OSS 기반) | — | 통합 IDE / spec → prod 자동화 | IDE 종속 |
| Tessl / OpenSpec / Spec Kitty | 다양 | — | 다양한 niche | 분산 |

출처:
- [Tim Wang — Spec-kit, BMAD, Agent OS and Kiro 비교](https://medium.com/@tim_wang/spec-kit-bmad-and-agent-os-e8536f6bf8a4)
- [MarkTechPost — 9 Best AI Tools for Spec-Driven Development 2026](https://www.marktechpost.com/2026/05/08/9-best-ai-tools-for-spec-driven-development-in-2026-kiro-bmad-gsd-and-more-compare/)
- [Cameron Sjo — spec-compare repo](https://github.com/cameronsjo/spec-compare)
- [Augment Code — 6 Best Spec-Driven Development Tools 2026](https://www.augmentcode.com/tools/best-spec-driven-development-tools)

**우리 spec-driven 4층 모델의 위치**: 별도 외부 도구를 안 쓰고 **자체 컨벤션 + Claude Code 슬래시 스킬 + handover 시스템**으로 구현. Spec-Kit / Agent OS 의 핵심 가치 (constitution / standards / spec shaping) 를 모두 자체 표현. 외부 도구를 굳이 가져올 필요는 없음 — 우리 시스템이 이미 그 위치에 있음.

### D.6 우리 프로젝트 적용 매트릭스 — 섹션 D

| 항목 | 적용 가능성 | 우선순위 |
|------|------------|---------|
| Opus 4.7 1M 컨텍스트 활용 (proactive compaction 60%) | 즉시 적용 가능 (모델 자동 사용) | 자동 |
| Task budgets 도입 (effort levels 명시) | 가능 — CLAUDE.md 에 "effort 정책" 추가 검토 | 중간 |
| Plugin Marketplace 의 CodeRabbit 플러그인 | 1줄 설치로 추가. 현재 PR 봇 외 Claude Code 안에서도 호출 가능 | 중간 |
| Hooks 의 `$CLAUDE_EFFORT` 활용 | 우리 훅이 effort 인지하면 좋음 | 낮음 |
| Memory Bank 패턴 (cross-tool compression) | 우리 `memory/MEMORY.md` 가 이미 구현. AGENTS.md 표준 추가는 검토 | 낮음 |
| Spec-Kit / BMAD / Kiro 채택 | 우리 자체 시스템이 동등 이상 | 보류 |

---

## 종합 — 도입 권고 / 조건부 / 보류 통합 표

### 도입 권고 (즉시 적용 가능 / ROI 명확)

| 항목 | 근거 섹션 | 액션 | 예상 비용 |
|------|---------|------|----------|
| Proactive compaction 60% 정책 명시 | D.1 | CLAUDE.md 에 "context 60% 시점 `/compact` 자동 발동 규칙" 추가 | 낮음 (1줄) |
| CodeRabbit Claude Code 플러그인 추가 | D.4 | `coderabbit` 플러그인 1줄 설치 + 사용 가이드 | 낮음 |
| CLAUDE.md Critical Rules 에 XML 태그 보강 | A.5 | `<rule id=1>...</rule>` 형태로 명령 강도 ↑ | 낮음 (스타일 조정) |

### 조건부 도입 (검증 / 부분 차용)

| 항목 | 근거 섹션 | 조건 | 비용 |
|------|---------|------|------|
| `track-start` / `track-end` supporting files 분리 | C.4 | 두 슬래시가 가장 복잡 → 가장 ROI | 중간 (반나절) |
| `spec-new` / `step-start` supporting files 분리 | C.4 | 위의 두 개 마이그 후 만족스러우면 확대 | 중간 |
| Agent OS 의 `/discover-standards` 패턴 차용 | B.5 | 새 도메인 트랙 시작 직전. 패키지 통째로 깔지 말고 패턴만 차용해 자체 스킬로 | 중간 (실험적) |
| Task budgets / effort levels 정책화 | D.6 | 비용 큰 트랙(예: 신규 도메인 풀 구축) 시작 시 시범 적용 | 낮음 |
| Memory cross-tool compression (AGENTS.md 표준) | D.3 | Codex / Cursor 같이 쓰는 일 늘면 검토 | 낮음 |

### 보류 (현 시점 ROI 낮음 / 우리가 이미 동등 이상)

| 항목 | 근거 섹션 | 사유 |
|------|---------|------|
| 전체 docs/ 를 HTML 로 마이그 | A.5 | agent input + 사람 편집 자리 → MD 가 정답. HTML 의 강점인 시각화 리포트는 우리 use case 아님 |
| Agent OS 전체 채택 (workflow / standards 전부 이관) | B.5 | 우리 spec-driven 4층이 학습/트랙/병행 차원에서 더 정교 |
| Agent OS `/inject-standards` (index.yml 자동 라우팅) | B.5 | conventions 가 6개뿐. 수동 라우팅으로 충분 |
| `/shape-spec` 채택 (`/spec-new` 와 중복) | B.5 | 네이밍 충돌. 우리 것 유지 |
| 정식 Skill 포맷 마이그 — 나머지 3개 (`학습노트`, `wiki-lint`, `브랜치정리`) | C.6 | 단순한 스킬 — 현 포맷으로 충분 |
| Spec-Kit / BMAD / Kiro 채택 | D.5 | 우리 자체 시스템이 동등 이상 |
| Thariq HTML 권장 패턴 — plan 산출물 HTML 화 | A.5 | 우리는 plan 산출물을 HTML 시각화로 사용하지 않음 |

### 검증 필요 (확신 못 함)

- "Anthropic 공식이 HTML 로 가고 있다" 는 SNS 주장 — **Anthropic 공식 docs 에서 확인 안 됨.** Thariq 개인 글의 과대 해석. 추적 계속.
- Opus 4.7 의 35% 토큰 증가 — 우리 일상 작업에서 체감 비용이 실제로 늘었는지 측정 필요.
- CodeRabbit Claude Code 플러그인의 자율 루프 — 우리 자동 fix-loop 와 협력 가능한지 vs 충돌하는지 1주 시범 후 판단.

---

## 메타 — 이 문서 자체에 대한 메모

- 본 문서는 4-30 (Karpathy Skills) 이후 16일 공백 종합 점검. 다음 정기 스위프는 6월 중순 예상.
- 즉시 가져올 액션 3개 (도입 권고 첫 표) 외에는 **트랙 단위로 검증 후 진행**. CLAUDE.md §5 워크플로우 준수.
- "HTML 로 가자" / "Agent OS 가져오자" 같은 광범위 변화는 **트랙으로 분리해 spec → step 거쳐서만** 도입. 직접 CLAUDE.md 를 흔드는 게 아니라 학습노트 / 실험 트랙을 거친다.
