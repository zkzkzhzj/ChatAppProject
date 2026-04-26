# 공유 메타 파일 충돌 관리 + Agent Teams 실전 디테일

> 마지막 업데이트: 2026-04-24
> 직전 노트와의 관계: [`multi-agent-workflows.md`](./multi-agent-workflows.md)가 "Stage 0~3 사다리, 4계층 충돌 처치, 9개 프레임워크 비교"라는 큰 그림을 다뤘다면, 이 노트는 **"내일 당장 적용할 실전 디테일"**에 초점을 맞춘다.
>
> 답하려는 사용자 우려: *"내가 뭘 선택했고 왜 선택했는지가 다음 세션에서 안 남는다. 워크트리 + 멀티 세션 환경에서 handover 같은 공유 메타 파일이 계속 충돌한다. 다른 사람들은 이걸 어떻게 관리하나?"*

---

## 0. 이 노트의 5가지 핵심 결론 (TL;DR)

1. **handover.md를 "단일 파일 단일 진실"로 두는 패턴은 Stage 2 이상에서 깨진다.** 업계는 "memory bank" (Cline / Roo Code) 또는 "session log + handoff" (rjmurillo/ai-agents) 같은 **다층 분리 패턴**으로 이동 중. 우리의 트랙별 sub-handover는 정확히 이 방향이다.
2. **CLAUDE.md의 worktree 경계 처리는 Anthropic이 아직 해결 못 한 미해결 문제**다 (Issue #16600). worktree에서 부모 레포의 CLAUDE.md가 함께 로드되면서 보안 경고가 뜨고, drift가 발생한다. 워크트리 측에 별도 `CLAUDE.md` 두지 말고 **단일 SSOT + import 패턴**으로 우회하는 게 현재 최선.
3. **Stop hook으로 handover 갱신을 강제하는 패턴은 "옳지만 위험"하다.** Issue #46808 / #49989에서 확인되듯 worktree 환경에서 hook이 침묵하거나 잘못된 디렉토리에 쓸 수 있다. 우리 `stop-handover-check.js`는 **워크트리 인지 (branch-aware) 분기**를 추가해야 한다.
4. **Agent Team의 sweet spot은 3~5명, 책임 분할은 "도메인별"보다 "관심사별"이 안정적이다.** Frontend/Backend/QA 식의 cross-layer 분할이 production에서 가장 많이 보고됨. 헥사고날 + 도메인 격리 프로젝트에 도메인별 에이전트(identity/village/communication)를 도입하는 건 매력적이지만, **에이전트 간 통신 지연이 도메인 격리 이득을 상쇄**한다.
5. **Auto-commit + WIP checkpoint 패턴 (`git-stint`, `claude-git`)이 handover 자동화의 다음 표준**이다. 우리가 사람 손으로 갱신하는 handover.md를 **shadow worktree + 자동 commit 메시지 추출**로 대체할 수 있다.

---

## 1. handover 충돌 — 다른 사람들의 실전 관리 방법

### 1.1 패턴 분류 5종

| 패턴 | 대표 도구 | 핵심 아이디어 | 트레이드오프 |
|------|---------|------------|------------|
| **Single SSOT 파일** (전통) | 우리 직전 셋업, Karpathy 초기 | `handover.md` 한 파일에 모든 트랙 상태 | Stage 2 이상에서 머지 충돌 폭증 |
| **Memory Bank (계층화)** | Cline, Roo Code | `projectbrief.md` / `activeContext.md` / `progress.md` / `systemPatterns.md` 분리 | 파일 수 증가, 어느 파일을 보면 되는지 라우팅 필요 |
| **Session Log + Handoff** | rjmurillo/ai-agents | 세션 로그(JSON, append-only) + handoff(read-only context doc) 분리 | 로그 파일이 커짐, 검색 도구 필요 |
| **Branch-scoped 메타** | 우리 트랙별 sub-handover, GitButler virtual branch metadata | 트랙/브랜치 단위로 메타 파일 분리 → 메인은 인덱스만 | 트랙 시작/종료 시 sync 필요 |
| **외부 메모리 레이어** | Mem0, LangMem, Zep | 파일 대신 벡터 DB / 그래프 DB에 저장, API로 접근 | 인프라 도입 비용, 동기 retrieval은 latency (LangMem p95 59초) |

### 1.2 Cline Memory Bank의 구체 구조 — 우리가 베껴야 할 것

Cline 공식 문서가 권장하는 표준 6개 파일:

```text
memory-bank/
├── projectbrief.md       # 변하지 않는 프로젝트 정체성 (우리 CLAUDE.md §2와 등가)
├── productContext.md     # 왜 이 프로젝트가 존재하는가, 누구를 위한 것인가
├── activeContext.md      # ★ 지금 무엇을 작업 중인가 (우리 handover.md의 "현재" 부분)
├── systemPatterns.md     # 아키텍처 결정, 사용 패턴 (우리 architecture.md + ADR)
├── techContext.md        # 기술 스택, 의존성 (우리 CLAUDE.md §3)
└── progress.md           # ★ 무엇이 끝났고 무엇이 남았나 (우리 handover.md의 "다음 할 일" 부분)
```

핵심 통찰: **Cline은 "변하지 않는 컨텍스트"와 "매 세션 변하는 컨텍스트"를 파일 수준에서 분리**한다. 우리 `handover.md` 한 파일에 두 가지가 섞여 있어서 머지 충돌이 잦다. activeContext / progress만 트랙별 분리하고, 나머지는 SSOT로 두는 게 정답.

### 1.3 Spring AI Session API 패턴 (2026-04 발표) — 가장 정교한 모델

`Spring AI Session API`는 multi-agent hierarchy에서 각 에이전트가 자기 위치를 추적하도록 **branch label** (점-구분 경로, 예: `root.frontend.styling`)을 모든 SessionEvent에 박는다. orchestrator가 fan-out하면 각 sub-agent는 같은 Session을 공유하지만 자기 ancestry만 본다.

우리 프로젝트에 적용하면:

- 메인 세션 = `root`
- ws-redis 트랙 = `root.ws-redis`
- ws-redis 안에서 도메인 작업 시 = `root.ws-redis.communication`

이걸 파일 시스템으로 구현하면 우리의 `docs/handover/track-{id}.md` 패턴과 정확히 일치한다. 즉 **우리 패턴은 "발명"이 아니라 업계 표준의 파일 시스템 버전**이다.

### 1.4 AGENTS.md 표준의 staleness 문제 — 우리도 곧 마주칠 함정

AGENTS.md 운영 가이드들이 일관되게 경고:

> "The hardest part of AGENTS.md isn't writing it; it's keeping it accurate as the underlying codebase changes. **Stale documentation actively poisons the context** for AI agents that read documentation on every request." — Augment Code

업계 권장:

1. **PR마다 AGENTS.md 변경분을 함께 review** (코드 리뷰 시 별도 항목)
2. **분기마다 audit** — 만료된 instruction은 삭제 (없는 것보다 나쁨)
3. **150~200 lines 초과하면 nested 분할** — root는 조직 전체, subdir은 컨텍스트별
4. **YAML frontmatter (description, tags)** 로 progressive disclosure — 에이전트가 필요할 때만 full content 로드

우리 CLAUDE.md는 현재 이미 200줄을 넘는다. **"§8 Document Routing 테이블이 비대해지면 잘라야 한다"**는 신호.

### 1.5 GitButler의 메타 자동화 — 가장 야심찬 접근

GitButler는 메타 파일을 **사람이 쓰지 않는다**. 대신:

- Agent가 작업할 때 자동으로 virtual branch 생성
- 변경마다 commit이 자동으로 attribution됨 (어느 에이전트가 어느 파일을 만졌는지)
- "handover" 개념 자체가 GUI에서 시각적으로 표현됨 — 따로 .md를 안 씀

trade-off: git의 멘탈 모델과 충돌. 그리고 GitButler가 죽으면 메타가 다 사라짐. 우리는 git-native라서 GitButler 채택 시 마이그레이션 비용 큼.

---

## 2. 자동 handover 갱신 패턴 5가지 비교

| 패턴 | 트리거 | 갱신 주체 | 안정성 | 우리 시스템 적합성 |
|------|------|---------|--------|--------------|
| **수동 갱신** (전통) | 사람의 양심 | 사람 | 낮음 (잊어버림) | 현재 상태 |
| **Stop hook 강제** (현재 우리) | 세션 종료 | 사람 (hook이 차단만 함) | 중간 (worktree에서 침묵 위험) | 보강 필요 |
| **PostToolUse + Stop 자동 commit** (`git-stint`) | 매 Write/Edit + 세션 종료 | hook 자동 | 높음 (file lock, session 격리) | **★ 도입 권장** |
| **Shadow worktree 자동 기록** (`claude-git`) | SessionStart + PostToolUse | hook 자동 | 높음 (메인 git history 보호) | 검토 가치 |
| **CI 통합 자동 PR** (Anthropic Managed Agents Issue→PR Pipeline) | git push | CI 에이전트 | 가장 높음 | 멀티 트랙 머지 시점에 시범 |

### 2.1 git-stint 동작 분석 — 우리 hook의 직계 진화형

`rchaz/git-stint`는 우리 `stop-handover-check.js`와 거의 같은 자리에서 더 멀리 간 도구다.

핵심 차이:

- 우리: Stop hook에서 변경 감지 → handover.md 갱신 안 됐으면 **차단** (exit 2)
- git-stint: PreToolUse에서 변경을 자동으로 session worktree에 격리 → Stop hook에서 자동 WIP commit (차단 없음)

git-stint가 우리보다 우수한 점:

1. **세션마다 격리 branch** (process ID 기반) — 3개 worktree 세션이 서로 안 부딪힘
2. **시간 손실 0** (timeout, 창 닫힘에도 work 보존)
3. **사람이 잊어도 자동** — 양심에 의존하지 않음

git-stint가 약한 점:

1. WIP commit이 무의미한 "체크포인트"여서 git history가 노이즈로 가득 참
2. 우리가 원하는 **"의도가 드러나는 handover"**가 아님 — 자동 메시지가 인간이 쓴 회고를 대체 못 함

**우리 결론**: git-stint를 그대로 쓰지 말고, 패턴만 차용 — Stop hook이 차단하기 전에 git diff를 LLM에 던져서 **handover 초안을 자동 생성**하고, 사람이 confirm/edit하는 흐름이 더 우리답다.

### 2.2 claude-git의 shadow repository 패턴 — Issue #16600 회피책

`listfold/claude-git`은 메인 .git을 건드리지 않고 **shadow worktree**에 모든 AI 변경을 commit한다.

```text
project/
├── .git/                    # 메인 - 사람의 commit만
├── .gitignore               # claude-git/ 무시
└── claude-git/              # shadow - AI의 모든 turn별 commit
    └── .git/
```

이걸 우리 셋업에 적용하면 매력적인 효과:

- ws-redis worktree에서 Claude가 만진 모든 파일이 shadow에 자동 기록
- handover.md를 사람이 안 써도, `git -C claude-git log --since=1.hour --name-only` 만으로 "지난 세션에서 뭘 만졌나" 자동 추출
- Issue #16600 (worktree CLAUDE.md 보안 경고) 우회 — shadow는 .git 파일이 아닌 디렉토리라 traversal 경계가 명확

검토 가치 매우 높음. 단, **shadow가 commit 폭증으로 디스크를 잡아먹는 함정** 주의.

### 2.3 CI 통합 패턴 — Anthropic Managed Agents의 Issue→PR Pipeline

가장 야심찬 자동화. 사이클:

1. GitHub Issue 작성 → 에이전트가 자동으로 fix branch 생성
2. 작성 + 테스트 + CI 모니터링 + PR review 응답 자동
3. 머지 직전에 **`requires_action` 게이트** — 사람이 최종 confirm

우리 프로젝트가 곧장 적용하기엔 과잉이지만, **"최종 머지 게이트만 사람"** 패턴은 우리가 이미 하는 일과 같다. 차이는 그 사이의 모든 단계가 사람 손에 있느냐 vs 에이전트 손에 있느냐.

---

## 3. Claude Code Hook의 워크트리 인지 패턴

### 3.1 Anthropic이 아직 못 푼 worktree-hook 문제들

확인된 미해결 이슈:

| Issue | 증상 | 우리 영향 |
|-------|------|---------|
| **#16600** CLAUDE.md traversal worktree 경계 무시 | worktree에서 부모 레포 CLAUDE.md가 함께 로드, 보안 경고 | 우리 메인 CLAUDE.md가 트랙 worktree에서 의도와 다르게 로드될 수 있음 |
| **#28041** `--worktree` 시 `.claude/` 서브디렉토리 미복사 | skills/agents/docs/rules가 worktree에 안 따라감 | 우리 `.claude/agents/`가 트랙 세션에서 안 보일 수 있음 |
| **#46808** Hooks not triggered in worktree | `.claude/settings.json`이 worktree에서 무시됨 | **우리 `stop-handover-check.js`가 트랙 세션에서 침묵할 가능성** ★ |
| **#49989** UserPromptSubmit hooks silently not firing in worktree | hook이 에러 없이 사라짐 | 디버깅 매우 어려움 |
| **#34437** Worktree가 메인 레포와 같은 project directory를 공유해야 한다 | 설계 의도는 git common dir 기반 공유지만 버전/설정에 따라 worktree 별 분리, read/write 경로 불일치 버그 보고됨 (Issues #24382, #39920, #28037, #44130 open 상태) | 트랙별 자동 메모리가 메인과 단절될 위험 — `autoMemoryDirectory` 설정으로 명시적 공유 강제 가능 |

**우리 행동 권장**: hook 정의를 settings.json이 아니라 **`$CLAUDE_PROJECT_DIR/scripts/`로 옮기고, hook 안에서 `git rev-parse --git-common-dir`로 메인 레포를 명시적으로 찾는 패턴**. (mattbrailsford.dev가 git-worktree-skill을 hook으로 옮긴 사례 참조)

### 3.2 워크트리 인지 hook 작성법 — 권장 코드 패턴

(코드는 작성 안 하고 패턴만 명시)

핵심 4가지 정보를 hook 시작에서 추출:

1. `git rev-parse --git-dir` → 현재 세션의 git directory (메인이면 `.git`, worktree면 `.git/worktrees/{name}`)
2. `git rev-parse --git-common-dir` → 메인 레포의 공통 git directory (모든 worktree가 공유)
3. `git rev-parse --show-toplevel` → 현재 working tree root (보고용 / 트랙 파일 경로 계산용)
4. `git rev-parse --abbrev-ref HEAD` → 현재 브랜치명 → 트랙 ID 추출

이후 분기 (반드시 `git-dir` ↔ `git-common-dir` 비교 — `show-toplevel` 과 `git-common-dir` 은 의미·형식이 달라 직접 비교하면 항상 false):

- **메인 세션** (`git-dir == git-common-dir` — 두 경로를 정규화 후 비교): 메인 `handover.md` 갱신 강제
- **워크트리 세션** (`git-dir != git-common-dir`): 트랙별 `docs/handover/track-{branch}.md`만 갱신 강제, 메인 handover.md는 면제

### 3.3 우리 `stop-handover-check.js`에 대한 구체 개선 제안

현재 동작:

- snapshot 비교로 델타 추출 → handover.md가 델타에 없으면 차단
- 모든 세션에서 동일 동작

문제:

1. worktree 세션에서 hook이 침묵할 수 있음 (Issue #46808)
2. worktree 세션이 메인 handover.md를 갱신하라고 강요받음 → 충돌 폭증
3. 트랙 ID를 모르므로 "어느 트랙의 변경인지" 컨텍스트 없음

권장 개선:

| 개선 항목 | 변경 내용 |
|---------|---------|
| **세션 종류 판별** | hook 시작에서 `git-common-dir` vs `show-toplevel` 비교, 메인/워크트리 분기 |
| **갱신 대상 파일 라우팅** | 메인 → `docs/handover.md`, 워크트리 → `docs/handover/track-{branchSlug}.md` |
| **트랙 ID 추출** | `git symbolic-ref --short HEAD` → slugify(`feature/ws-redis` → `ws-redis`) |
| **hook 위치 안전화** | `.claude/settings.json` 의존 줄이고 `$CLAUDE_PROJECT_DIR/scripts/`에서 호출되도록 (Issue #46808 회피) |
| **차단보다 자동 초안** | 차단(exit 2) 대신, git diff를 stdin으로 받아 handover 초안을 임시 파일로 생성 → 사람이 confirm 후 commit |
| **fallback log** | hook이 침묵해도 추적 가능하도록 `.claude/cache/hook-trace.log`에 매번 timestamp + 결정 기록 |

이 개선은 **별도 학습노트(`docs/learning/`)로 정리할 가치가 있는 트레이드오프** — 작업 시 함께 작성 권장.

### 3.4 Boris Cherny (Claude Code 창시자) 권장 패턴 — 검증

Boris의 공개 best practice 10개 중 우리 셋업과 직결된 항목:

- "**3-5 worktrees parallel = single biggest productivity unlock**" — 우리 방향이 정확
- "Set up shell aliases (za, zb, zc) to hop between worktrees" — 우리도 트랙별 alias 도입 가치
- "Use `/btw` command for side questions" — 메인 세션에서 트랙 세션 컨텍스트 깨지 않고 질문하는 패턴
- "**Number tabs 1-5, use system notifications**" — 어느 세션이 attention 필요한지 비주얼 신호

Boris도 **CLAUDE.md를 SSOT로 유지**하고, worktree마다 별도 CLAUDE.md를 두지 않는다. 우리 방향과 일치.

---

## 4. Agent Teams 실전 사용 — 도구별 + 팀 구성 패턴

### 4.1 Claude Code Agent Teams 실전 보고

| 보고 출처 | 팀 구성 | 결과 |
|---------|--------|------|
| **incident.io** | 4~5 parallel sessions, 각자 독립 plan | merge conflict 걱정 없이 작업, "감을 잃지 않음" |
| **Sanjoy Kumar Malik (Spring Boot)** | 3 teammate (frontend / backend / qa) + 1 lead | "2시간에 microservice 1개 — 도메인 모델링, 상태 머신, 헥사고날, Testcontainers, JWT, 관측성, k8s manifest" |
| **Anthropic 내부 (Boris)** | 10~15 sessions | 가장 높은 productivity multiplier |
| **Sigrid Jin (한국, claw-code 사례)** | 다중 Codex + Claude | 25B token/year (단일 개발자 최고 기록), 2시간 만에 50K star repo 달성 |

핵심 관찰: **production 보고에서 가장 자주 보이는 분할은 "도메인별"이 아니라 "관심사별 (frontend/backend/qa)"**. 이유는 §4.3에서.

### 4.2 awesome-claude-code-subagents (VoltAgent, 100+ agents) 분석

100+ subagent 카테고리 분포:

1. Language specialists (spring-boot-engineer, react-developer, ...)
2. Layer specialists (database-architect, api-designer, ...)
3. Quality specialists (test-engineer, code-reviewer, security-auditor, ...)
4. Infrastructure (docker, k8s, ci-cd)
5. Domain specialists (이커머스, 결제, 채팅 등)

업계가 베끼는 표준은 **1+2+3 (언어 + 레이어 + 품질)**이고, **5 (도메인)**는 매우 드물다. 헥사고날의 도메인 격리 이득이 에이전트 분할까지 안 내려간다는 신호.

### 4.3 도메인별 vs 레이어별 — 우리 의사결정

우리 프로젝트는 헥사고날 + 도메인 분리(identity, village, communication, ...)이 강한 구조. 두 옵션이 있다:

**옵션 A — 도메인별 에이전트** (identity-agent, village-agent, communication-agent)

- 장점: 도메인 경계가 강하므로 에이전트 간 file overlap 거의 없음
- 단점: **한 기능이 여러 도메인에 걸칠 때** (예: village 입장 시 identity 검증 + communication 알림) 에이전트 간 통신이 폭증. routing accuracy가 8~12 round trip 후 무너진다는 한계와 정면충돌.
- 단점: 에이전트별 컨텍스트가 도메인 전체를 알아야 해서 token 비용 큼

**옵션 B — 레이어별 에이전트** (현재 우리 `.claude/agents/`: domain-agent, adapter-agent, test-agent, review-agent, docs-agent)

- 장점: 한 기능 작업 시 모든 에이전트가 동시에 자기 레이어를 작업 → 시간 단축
- 장점: 컨텍스트가 작음 (도메인 전체가 아니라 한 기능의 한 레이어만)
- 단점: 같은 도메인을 여러 에이전트가 동시에 만져서 파일 충돌 위험. **하지만 헥사고날이라 레이어별로 파일이 다른 디렉토리에 있어서 실제 충돌은 거의 없음**.

**결론**: 우리는 이미 옵션 B가 정답이다. 옵션 A 도입은 **각 도메인이 충분히 커진 후** (예: identity 도메인 코드가 5,000 LOC 넘었을 때) 도메인 내부에서 다시 레이어별 분할하는 식으로 hierarchical하게 가는 게 자연스러움.

### 4.4 CrewAI / LangGraph supervisor — 우리 셋업에 맞는가?

| 프레임워크 | 우리에게 의미 |
|----------|------------|
| **CrewAI** | 코딩 워크플로우용으로는 부담스러움. **NPC role(주민/안내자/이웃) 모델링에는 직관적** — 마음의 고향 NPC 백엔드의 1차 후보 |
| **LangGraph supervisor** | 코딩 워크플로우용으로 production grade. Klarna/Uber/LinkedIn 1년+ 운영 검증. **하지만 Claude Code Agent Teams가 코딩 워크플로우는 더 잘 맞음** — LangGraph는 NPC 대화 상태 머신 후보로 보류 |
| **AutoGen → MS Agent Framework** | maintenance mode. 신규 도입 비추 |

직전 노트(§5)와 동일한 결론. 추가된 정보는 **"prototype-then-migrate" 패턴** — CrewAI로 NPC 프로토타입 → production 가까워지면 LangGraph로 이전. Markaicode 비교 분석에서 일관되게 등장하는 권장 흐름.

---

## 5. AI Native 동시 작업 — 실전 워크플로우

### 5.1 attention 분배 — desktop / monitor 분할

업계 권장 (jshah.dev, fazm.ai, dev.to/johannesjo):

| Desktop / Monitor | 용도 |
|------------------|------|
| **#1 (메인 attention)** | 가장 복잡한 트랙, 사람이 결정해야 할 일 |
| **#2 (background)** | 자동화 가능한 트랙 (test 작성, 문서, 리팩토링) |
| **#3 (review/communication)** | PR 리뷰, Slack, email — 컨텍스트 단절 영역 |

**핵심 통찰**: 컨텍스트 스위치 비용이 15~20분/번. 4번 스위치하면 1~1.5시간 손실. **데스크탑 분할 = 시각적 컨텍스트 단절 비용 절감**.

### 5.2 우리 사용자 패턴 추정 — 단일 모니터 가정

사용자가 단일 모니터·데스크탑을 쓴다면, desktop 분할 대신 **terminal tab + Boris 권장 alias 패턴**으로 등가 효과:

```text
za = cd ~/work/main-claude && claude          # 메인 세션
zb = cd ~/work/wt-ws-redis && claude          # ws-redis 트랙
zc = cd ~/work/wt-ui && claude                # ui 트랙
zr = cd ~/work/main && codex review           # 리뷰 (Codex)
```

핵심 통찰: **alias로 "어디로 점프할지"를 근육 기억에 박는 것**이 attention 관리의 1차 도구. 매번 디렉토리 cd하면 cognitive load 누적.

### 5.3 인터럽트 처리 — A 트랙 작업 중 B 트랙 긴급 상황

업계 권장 (Boris Cherny, Augment Code):

1. **A 트랙에 "지금까지 한 일 요약 후 stop" 명령** → handover.md (또는 sub-handover) 자동 갱신 트리거
2. B 트랙으로 점프 → SessionStart hook이 마지막 sub-handover 읽어서 컨텍스트 복원
3. B 처리 후 A로 복귀 → 같은 SessionStart 메커니즘

**필수 조건**: SessionStart hook이 sub-handover를 읽도록 셋업. 우리는 `stop-handover-check.js`만 있고 SessionStart는 없음 → **`session-start-handover-load.js` 추가 권장**.

### 5.4 세션 간 컨텍스트 전달 — 다른 트랙 진행 빠르게 따라잡기

직전 노트의 §6 "Spec-driven development"가 답. 추가로:

- **Augment Code 권장**: "AI가 다 기억하니, 인간은 desktop 점프할 때 'briefing 한 줄' 요청하면 됨." → 사람이 기억에 의존하지 않고 에이전트에게 매번 묻는 패턴
- **Mem0 / LangMem** 같은 memory layer는 이런 briefing의 vector retrieval 버전 — 우리 규모(1인 개발)에선 과잉
- **Auto memory** (Claude Code 내장, `.claude/projects/<project>/memory/`) — **설계 의도는 git common dir 기반 공유**지만 버전/구성에 따라 worktree 별 분리·read/write 경로 불일치 버그가 다수 보고됨 (§3.1 표의 #34437 참조). 공유를 명시적으로 강제하려면 `settings.json` 의 `autoMemoryDirectory` 옵션 사용. 우리(1인 + 1 PC) 규모에서는 공유가 자연스러우므로 현재 동작 점검 + 필요 시 옵션 명시 권장

---

## 6. 마음의 고향 프로젝트 적용 권장안

### 6.1 즉시 (이번 주)

| 액션 | 이유 | 구현 위치 |
|------|------|----------|
| 1. **`git config rerere.enabled true`** 활성화 | 직전 노트에서도 권장. 비용 0, 머지 충돌 자동 재적용. | 로컬 git config |
| 2. **CLAUDE.md를 200줄 이내로 다이어트 (또는 nested AGENTS.md 도입)** | 현재 CLAUDE.md §8 routing 테이블이 비대. AGENTS.md 표준의 staleness 경고 직격. | 루트 + `/docs/`, `/src/` 하위 |
| 3. **Stop hook에 워크트리 인지 분기 추가** | Issue #46808 회피 + 트랙별 sub-handover 라우팅. 차단 대신 자동 초안 생성으로 발전. | `.claude/hooks/stop-handover-check.js` |
| 4. **SessionStart hook 신규 추가 — sub-handover 자동 로드** | 인터럽트 처리·세션 간 컨텍스트 전달의 1차 도구 | `.claude/hooks/session-start-handover-load.js` |

### 6.2 중기 (한 달 내)

| 액션 | 이유 |
|------|------|
| 5. **handover 구조를 Cline Memory Bank 패턴으로 재편** | `activeContext.md` (변하는) + `progress.md` (누적) + 트랙별 sub-handover. 머지 충돌 면적 축소 |
| 6. **WorktreeCreate hook 도입** — env 파일·dependency·port 자동화 | tfriedel/claude-worktree-hooks 차용. 트랙 추가 시 셋업 비용 0 |
| 7. **`clash-sh` 시범 도입** | 직전 노트에서도 권장. 잠재 충돌 PR 전 탐지 |
| 8. **Codex 리뷰 에이전트의 PR 자동 review 흐름 정립** | review-agent에 위임된 작업의 흐름이 모호. memory에 남길 만한 히스토리 부재 |

### 6.3 장기 (분기 단위)

| 액션 | 이유 |
|------|------|
| 9. **claude-git shadow worktree 시범 평가** | 사람 손 없는 handover 자동화의 가장 깔끔한 방향. 단 디스크 비용 모니터링 |
| 10. **Mem0 / LangMem 도입 검토** (NPC 메모리에 한정) | 코딩 워크플로우는 과잉이지만, NPC가 유저를 "기억"하는 데는 직접 후보 |
| 11. **GitButler 평가** (디스크 부담 임계 도달 시) | worktree 디렉토리·node_modules·.gradle 폭증이 한계 도달하면 transition 옵션 |
| 12. **CrewAI로 NPC 대화 프로토타입** | 코딩이 아닌 NPC 백엔드 영역. prototype-then-migrate 패턴 |

---

## 7. 후속 액션 — 사용자가 내일 적용 가능한 것 7개

(우선순위 순)

1. **`git config rerere.enabled true`** — 1초 작업, 효과 영구
2. **`stop-handover-check.js`에 워크트리 인지 분기 추가** — 한 PR로 끝남, 트랙 운영 안정성 직접 개선
3. **`session-start-handover-load.js` 신규 작성** — 인터럽트 회복력 즉시 향상
4. **트랙별 alias 셋업** (`za`/`zb`/`zc`/`zr`) — 5분, attention 비용 절감 즉시 체감
5. **CLAUDE.md를 200줄 이내로 다이어트** + `/docs/`에 nested AGENTS.md 시범 1개 — staleness 위험 차단 시작
6. **handover.md를 `activeContext.md` + `progress.md` + 트랙별 sub-handover로 분리하는 ADR 작성** — 다음 주 작업 기반
7. **위 변경 사항을 학습노트 `docs/learning/{현재 트랙 예약 번호}-handover-collision-management.md`로 정리** (예약 번호는 `docs/learning/RESERVED.md` 의 자기 트랙 대역 사용 — 다른 트랙 점유 번호 임의 사용 금지) — 이 리서치의 결정·트레이드오프가 코드에 반영될 때 함께 박제

---

## 8. 주요 출처 (분류)

### 1차 출처 — Anthropic 공식 / Issues

- Claude Code 공식 — Memory: <https://code.claude.com/docs/en/memory>
- Claude Code 공식 — Hooks reference: <https://code.claude.com/docs/en/hooks>
- Claude Code 공식 — Sub-agents: <https://code.claude.com/docs/en/sub-agents>
- Claude Code 공식 — Agent Teams: <https://code.claude.com/docs/en/agent-teams>
- Claude Code 공식 — Code Review: <https://code.claude.com/docs/en/code-review>
- Issue #16600 — CLAUDE.md traversal worktree boundary: <https://github.com/anthropics/claude-code/issues/16600>
- Issue #46808 — Hooks not triggered in git worktree: <https://github.com/anthropics/claude-code/issues/46808>
- Issue #49989 — UserPromptSubmit hooks silently not firing: <https://github.com/anthropics/claude-code/issues/49989>
- Issue #28041 — `--worktree` not copying `.claude/` subdirs: <https://github.com/anthropics/claude-code/issues/28041>
- Issue #34437 — Worktrees should share project directory: <https://github.com/anthropics/claude-code/issues/34437>
- Issue #20875 — Share sessions across git worktrees (FR): <https://github.com/anthropics/claude-code/issues/20875>
- Issue #31872 — Model behavior degradation in worktree sessions: <https://github.com/anthropics/claude-code/issues/31872>
- Anthropic Managed Agents (Issue→PR pipeline): <https://www.anthropic.com/engineering/managed-agents>
- Anthropic — Building a C compiler with parallel Claudes: <https://www.anthropic.com/engineering/building-c-compiler>

### Boris Cherny / Anthropic 팀 best practice

- Boris Cherny X — 3-5 worktrees parallel: <https://x.com/bcherny/status/2017742743125299476>
- Boris Cherny tips collected (Mar 2026): <https://github.com/shanraisshan/claude-code-best-practice/blob/main/tips/claude-boris-15-tips-30-mar-26.md>
- Boris Cherny tips collected (Apr 2026): <https://github.com/shanraisshan/claude-code-best-practice/blob/main/tips/claude-boris-6-tips-16-apr-26.md>
- howborisusesclaudecode.com: <https://howborisusesclaudecode.com/>

### Memory bank / handover 패턴

- Cline Memory Bank 공식: <https://docs.cline.bot/features/memory-bank>
- Cline Memory Bank 블로그: <https://cline.bot/blog/memory-bank-how-to-make-cline-an-ai-agent-that-never-forgets>
- Roo Code Memory Bank: <https://github.com/GreatScottyMac/roo-code-memory-bank>
- Spring AI Session API (event-sourced, branch-aware): <https://spring.io/blog/2026/04/15/spring-ai-session-management/>
- rjmurillo/ai-agents — Session Logs and HANDOFF.md: <https://deepwiki.com/rjmurillo/ai-agents/4.6-context-optimization-(passive-context-vs-skills)>
- Agent-Handover-Demo: <https://github.com/danielrosehill/Agent-Handover-Demo>
- Mem0 State of AI Agent Memory 2026: <https://mem0.ai/blog/state-of-ai-agent-memory-2026>
- Mem0 GitHub: <https://github.com/mem0ai/mem0>

### AGENTS.md 운영 / staleness

- AGENTS.md 공식: <https://agents.md/>
- AGENTS.md v1.1 progressive disclosure proposal: <https://github.com/agentsmd/agents.md/issues/135>
- Augment Code — How to Build AGENTS.md (2026): <https://www.augmentcode.com/guides/how-to-build-agents-md>
- aihero.dev — Complete Guide to AGENTS.md: <https://www.aihero.dev/a-complete-guide-to-agents-md>
- agentsmd.io — Best Practices: <https://agentsmd.io/agents-md-best-practices>

### 자동 handover / commit 도구

- git-stint (session-scoped change tracking): <https://github.com/rchaz/git-stint>
- claude-git (shadow worktree): <https://github.com/listfold/claude-git>
- Nimbalyst (visual workspace): <https://www.sitepoint.com/nimbalyst-the-visual-workspace-for-building-with-claude-code-and-codex/>
- Autosys (agent reasoning governance, git diff for thinking): <https://www.ischool.berkeley.edu/projects/2026/autosys-git-diff-ai-agent-reasoning>
- Changeish (AI changelog from git diff): <https://dev.to/itlackey/changeish-automate-your-changelog-with-ai-45kj>
- AI-Changelog-Generator: <https://github.com/entro314-labs/AI-Changelog-Generator>

### Worktree hook 실전

- mattbrailsford.dev — Replacing custom worktree skill with hooks: <https://mattbrailsford.dev/replacing-my-custom-git-worktree-skill-with-claude-code-hooks>
- tfriedel/claude-worktree-hooks (env, deps, deterministic ports): <https://github.com/tfriedel/claude-worktree-hooks>
- Damian Galarza — Extending Claude Code Worktrees for true DB isolation: <https://www.damiangalarza.com/posts/2026-03-10-extending-claude-code-worktrees-for-true-database-isolation/>
- Buttondown — Extending Claude Code's native worktree support: <https://buttondown.com/dgalarza/archive/extending-claude-codes-native-worktree-support/>
- direnv .envrc in worktrees gist: <https://gist.github.com/eshaham/8e3b63fb077530dffc2964b648145ec9>

### Agent Teams 실전 사례

- Spring Boot 2시간 마이크로서비스 (Sanjoy Kumar Malik): <https://medium.com/@sanjoykumarmalik/claude-code-playbook-for-spring-boot-microservice-development-879a508cc190>
- piomin/claude-ai-spring-boot 템플릿: <https://github.com/piomin/claude-ai-spring-boot>
- Piotr Minkowski — Claude Code Template for Spring Boot: <https://piotrminkowski.com/2026/03/24/claude-code-template-for-spring-boot/>
- VoltAgent/awesome-claude-code-subagents (100+ subagents): <https://github.com/VoltAgent/awesome-claude-code-subagents>
- VoltAgent Spring Boot engineer 템플릿: <https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/02-language-specialists/spring-boot-engineer.md>
- wshobson/agents (Claude Code multi-agent collection): <https://github.com/wshobson/agents>
- Sigrid Jin (한국, claw-code 사례): Anthropic Code Leak coverage — <https://layer5.io/blog/engineering/the-claude-code-source-leak-512000-lines-a-missing-npmignore-and-the-fastest-growing-repo-in-github-history/>
- Spring AI Bench Claude Code Agent: <https://spring-ai-community.github.io/spring-ai-bench/agents/claude-code.html>

### CrewAI / LangGraph production

- LangGraph vs CrewAI (Markaicode 2026): <https://markaicode.com/vs/langgraph-vs-crewai-multi-agent-production/>
- LangGraph vs CrewAI (Redwerk): <https://redwerk.com/blog/langgraph-vs-crewai/>
- LangGraph + Mem0 long-term memory: <https://medium.com/@sahin.samia/building-long-term-agent-memory-with-mem0-langgraph-308ef4970699>

### attention / context switching

- jshah.dev — My AI Dev Workflow: <https://www.jshah.dev/ai/developer-tools/workflow/2026/04/07/my-ai-dev-workflow/>
- fazm.ai — AI Agents Context Switching: <https://fazm.ai/blog/ai-agents-context-switching-parallel-workstreams>
- dev.to/johannesjo — Why Multitasking with AI Coding Agents Breaks Down: <https://dev.to/johannesjo/why-multitasking-with-ai-coding-agents-breaks-down-and-how-i-fixed-it-2lm0>
- Augment Code — Debug Parallel AI Agents: <https://www.augmentcode.com/guides/debug-parallel-ai-agents>
- AI.cc — Claude Code Desktop Redesign 2026 (multi-session sidebar): <https://www.ai.cc/blogs/claude-code-desktop-redesign-2026-multi-session-routines-automation/>

### Hexagonal + AI agent 적합성

- Bardia Khosravi — Backend AI Coding Rules: DDD + Hexagonal: <https://medium.com/@bardia.khosravi/backend-coding-rules-for-ai-coding-agents-ddd-and-hexagonal-architecture-ecafe91c753f>
- Marta Fernández García — Hexagonal in AI Agent Development: <https://medium.com/@martia_es/applying-hexagonal-architecture-in-ai-agent-development-44199f6136d3>
- HexDDD AGENTS.md 사례: <https://github.com/GodSpeedAI/HexDDD/blob/main/AGENTS.md>

---

## 9. 후속 리서치 권장 토픽

직전 노트(§9)에 아래 토픽 추가 권장:

1. **Cline Memory Bank를 Claude Code에서 모방한 사례** — 6개 표준 파일 패턴이 실제로 적용된 OSS 셋업 찾기
2. **SessionStart hook으로 sub-handover 자동 로드한 OSS 예제** — 우리 신규 hook 설계 시 참조
3. **Sigrid Jin (한국 25B token 개발자)의 실제 워크플로우 디테일** — 한국 사용자 사례라 흡수 비용 낮음
4. **Spring AI Session API의 branch label 패턴을 파일 시스템에 1:1 매핑한 사례** — 우리 트랙별 sub-handover의 이론적 정당화
5. **claude-git shadow worktree와 git-stint 동시 운용 가능성** — 두 도구가 자리 충돌하는지 / 보완 관계인지
