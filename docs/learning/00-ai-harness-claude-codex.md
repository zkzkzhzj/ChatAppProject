# AI 하네스 구축 — Claude Code · Codex 잘 쓰기

> Claude Code / Codex를 활용한 자동화 하네스 구축에 필요한
> 용어, 개념, 구성 요소, 흐름 패턴 정리.
> 프로젝트 기술 노트가 아닌 "도구 사용법" 학습 기록이라 00번으로 분리.

---

## 1. 핵심 용어

### Claude Code
Anthropic의 터미널 기반 AI 코딩 에이전트.
파일 읽기/쓰기, 터미널 실행, 검색 등 모든 도구를 직접 사용하며 코드베이스 전체를 맥락으로 다룬다.
"AI가 IDE 안에 들어온 것"이 아니라 "AI가 개발자처럼 터미널을 쓰는 것".

### Codex
OpenAI의 오픈소스 CLI 코드 리뷰 에이전트.
`AGENTS.md`를 시스템 설정 파일로 자동 인식한다 (CLAUDE.md와 동일 역할).

```bash
codex review                  # 전체 프로젝트 리뷰
codex review --uncommitted    # 변경사항만 리뷰
codex review "프롬프트"        # 프롬프트 포함 전체 리뷰
# 주의: --uncommitted와 프롬프트는 동시에 쓸 수 없음 (0.118.0 기준)
```

### 하네스 (Harness)
AI 도구들을 조합해 자동화된 개발 워크플로우를 구성한 시스템.
"이 프로젝트에서 AI를 어떻게 쓸 것인가"의 설계도.

```
하네스 = CLAUDE.md + AGENTS.md + Skills + Hooks + Memory + MCP + (서브에이전트)
```

### 컨텍스트 윈도우 (Context Window)
AI가 한 번에 볼 수 있는 텍스트 양.
컨텍스트가 꽉 차면 오래된 내용부터 잊는다.
→ 서브에이전트를 쓰는 이유 중 하나: 메인 컨텍스트 보호.

### 콜드 스타트 (Cold Start)
서브에이전트가 생성될 때마다 컨텍스트가 비어있는 상태로 시작하는 것.
이전 대화를 기억하지 못한다. 서브에이전트는 "전담 직원"이 아니라 "일회성 심부름꾼".

---

## 2. 구성 요소별 역할

### CLAUDE.md / AGENTS.md
```
CLAUDE.md  →  Claude Code가 자동으로 읽음  →  "구현할 때 이렇게 해라"
AGENTS.md  →  Codex가 자동으로 읽음       →  "리뷰할 때 이걸 봐라"
```
두 파일 모두 해당 도구가 프로젝트 진입 시 별도 명시 없이 자동 인식하는 설정 파일.

### 스킬 (Skill)
`.claude/skills/[이름]/SKILL.md`에 저장된 재사용 가능한 워크플로우 프롬프트.
`/스킬이름`으로 호출하면 SKILL.md 내용이 Claude에게 주입된다.
스킬이 직접 코드를 실행하는 게 아니라, Claude가 스킬을 읽고 실행한다.

### 훅 (Hook)
이벤트 발생 시 자동으로 실행되는 셸 명령. `settings.json`에 정의.
AI 판단에 맡기는 게 아니라 **반드시 실행되는 결정론적 자동화**.

| 이벤트 | 시점 |
|--------|------|
| `PreToolUse` | Claude가 도구를 쓰기 직전 (차단/수정 가능) |
| `PostToolUse` | Claude가 도구를 쓴 직후 |
| `Stop` | Claude 응답 완료 후 |
| `Notification` | 알림 발생 시 |

> 2026년 4월 업데이트: `PreToolUse`에 "defer" 옵션 추가 —
> 위험한 작업 전에 실행을 일시 중지하고 외부 시스템 승인 후 재개 가능.

### MCP (Model Context Protocol)
Claude에게 외부 시스템 연결 능력을 부여하는 프로토콜.
MCP 서버를 설치하면 Claude가 해당 시스템을 도구처럼 쓸 수 있다.

```
GitHub MCP   → PR 생성, 이슈 조회, 코멘트 작성
Slack MCP    → 메시지 전송, 채널 읽기
텔레그램 MCP → 메시지 수신/발신 (명령 트리거로 활용)
DB MCP       → 쿼리 실행, 스키마 조회
벡터 DB MCP  → 임베딩 기반 유사도 검색 (RAG 구성 시)
```

### 메모리 (Memory)
`~/.claude/projects/.../memory/`에 저장되는 세션 간 지속 정보.
`MEMORY.md`(인덱스) + 개별 `.md` 파일로 구성.

| 타입 | 내용 |
|------|------|
| `user` | 사용자 역할, 선호, 지식 수준 |
| `feedback` | 행동 교정 / 검증된 접근법 |
| `project` | 진행 중인 작업, 결정 맥락 |
| `reference` | 외부 시스템 위치 |

### 서브에이전트 (Subagent)
메인 Claude가 Agent 도구로 생성하는 독립 Claude 인스턴스.
콜드 스타트로 시작하며, 작업 완료 후 결과를 메인에 반환하고 소멸한다.

**자주 하는 오해:**

| 오해 | 실제 |
|------|------|
| "프론트 에이전트를 만들어두면 계속 담당" | 매번 콜드 스타트, 기억 없음 |
| "에이전트가 백그라운드에서 계속 실행됨" | 작업 끝나면 소멸 |
| "서브에이전트로 Codex 감싸면 더 좋아짐" | 래퍼만 추가됨, 이점 없음 |

**에이전트 타입:**
| 타입 | 특기 |
|------|------|
| `Explore` | 코드베이스 탐색, 파일 검색, 패턴 분석 |
| `Plan` | 구현 설계, 아키텍처 검토 |
| `general-purpose` | 복잡한 멀티스텝 작업 |

### 에이전트 팀 (Agent Team)
Claude Code에서 공식 "팀" 개념은 없다.
한 메시지에 Agent 도구를 여러 개 동시에 보내는 것이 팀 패턴.
독립적인 여러 작업을 병렬로 실행할 때 사용.

```
메인 Claude ──┬→ Subagent A (Identity 도메인 분석)
              ├→ Subagent B (Village 도메인 분석)   → 결과 종합
              └→ Subagent C (레퍼런스 조사)
```

CrewAI, AutoGen, LangGraph 같은 전용 프레임워크는 이 팀 구조를 더 정교하게 정의할 수 있지만, Claude Code 내에서는 위 패턴으로 충분히 구현 가능하다.

---

## 3. Wiki / RAG

### Wiki (지식 저장소)
에이전트들이 공통으로 참조하는 문서 집합.
이 프로젝트에서는 `docs/`가 사실상 위키 역할을 하고, `CLAUDE.md`의 "Document Routing" 섹션이 라우팅 역할을 한다.

```
docs/
├── architecture/   ← 설계 위키
├── specs/          ← API/이벤트 명세 위키
├── conventions/    ← 컨벤션 위키
└── learning/       ← 학습 기록 위키
```

### RAG (Retrieval Augmented Generation)
에이전트가 응답 전에 관련 문서를 검색해서 컨텍스트로 주입하는 패턴.

**기본 RAG (지금 하고 있는 것):**
Claude가 Grep/Glob으로 `docs/`를 검색 → 관련 내용을 읽어서 참조.
문서가 수십 개 수준일 때는 이것으로 충분하다.

**고급 RAG (문서가 수천 페이지 이상일 때):**
```
질문 → 임베딩 → 벡터 DB 유사도 검색 → 관련 청크 추출 → LLM 컨텍스트 주입
```
MCP + 벡터 DB (Pinecone, Qdrant, Chroma 등)를 연결하면 Claude Code에서도 구현 가능.
현재 프로젝트 규모에서는 불필요.

---

## 4. 흐름 패턴

### 패턴 A — 단순 실행 (스킬)
```
사용자 → /스킬 호출 → Claude가 SKILL.md 읽고 실행 → 결과 반환
```

### 패턴 B — 위임 (서브에이전트)
```
사용자 → Claude(메인) → Subagent(탐색) → 결과 반환 → Claude(메인) 활용
```
메인 컨텍스트를 오염시키지 않고 대량 탐색이 필요할 때.

### 패턴 C — 병렬 처리 (에이전트 팀)
```
                  ┌→ Subagent A
사용자 → Claude ──┼→ Subagent B  → 결과 종합 → 응답
                  └→ Subagent C
```

### 패턴 D — 이벤트 기반 (훅)
```
git commit 발생 → Hook 트리거 → 셸 명령 실행 → (자동 코드리뷰 등)
```

### 패턴 E — 시간 기반 (스케줄)
```
크론 시간 도달 → /schedule 트리거 → Claude 실행 → 결과 저장
```

### 패턴 F — 외부 트리거 파이프라인
```
텔레그램 메시지
  → MCP(텔레그램) 수신
  → Claude Code 실행
  → MCP(웹 검색) 정보 수집
  → 결과 작성
  → PostToolUse Hook 포맷 체크
  → MCP(GitHub) 저장소 푸시
  → MCP(텔레그램) 완료 알림 전송
```
Hook이 내부 규율을 담당하고, MCP가 외부 연결을 담당한다.
둘 중 하나만 있으면 절반짜리 시스템.

---

## 5. OpenClaw 비교 참고

OpenClaw(openclaw.ai)는 로컬 컴퓨터에서 돌아가는 AI 에이전트 게이트웨이.
텔레그램/디스코드 같은 메신저와 LLM 사이에서 세션과 권한을 통제하는 로컬 런타임.
PC 화면 인식, 파일 조작, 웹 탐색, 스크립트 실행을 LLM이 판단해서 실행한다.

```
OpenClaw 동작 구조:
텔레그램 명령 → OpenClaw 런타임(로컬) → LLM 판단 → PC 직접 조작
```

**Claude Code 자동화와의 차이:**

| 항목 | OpenClaw | Claude Code + Hook + MCP |
|------|----------|--------------------------|
| 접근 방식 | PC 화면/마우스/키보드 직접 조작 | CLI + API 직접 연결 |
| 대상 | 범용 (어떤 앱이든) | 코드베이스 + 연결된 외부 서비스 |
| 정밀도 | 화면 기반이라 불안정할 수 있음 | 결정론적 (훅은 반드시 실행) |
| 보안 | 전체 PC 권한 → 리스크 높음 | 제한된 도구 범위 |
| 비용 | API 종량제 (24시간 운영 시 고비용) | 사용한 만큼 |
| 개발자 친화성 | 낮음 (GUI 기반) | 높음 (CLI/코드 기반) |

> **비용 참고:** Anthropic이 2026년 4월부로 OpenClaw 등 24시간 자율 에이전트의
> Claude Pro/Max 구독 사용을 차단하고 API 종량제로 전환했다.
> 극단적인 경우 하루 1,000~5,000달러 비용이 발생할 수 있다.

---

## 6. 이 프로젝트 하네스 현황

```
구축 완료:
├── CLAUDE.md              ← 프로젝트 헌법
├── AGENTS.md              ← Codex 리뷰어 설정
├── .claude/skills/
│   ├── 코드리뷰/          ← Codex --uncommitted 리뷰
│   ├── 전체리뷰/          ← Codex 전체 스캔 리뷰
│   └── MD리뷰/            ← Codex 문서 정합성 리뷰
├── docs/reviews/          ← 리뷰 결과 자동 저장
└── memory/                ← 세션 간 컨텍스트 유지

도입 검토 가능:
├── Hook                   ← commit 시 자동 리뷰, handover.md 자동 업데이트
├── Schedule               ← 주간 전체리뷰 자동 실행
├── GitHub MCP             ← PR 자동 생성/코멘트
└── 서브에이전트 팀        ← Phase 구현 전 병렬 도메인 분석
```

---

## 7. 학습 로드맵

```
1단계 ✅  스킬 + 메모리 + CLAUDE.md/AGENTS.md
2단계     Hook 하나 붙여보기 (commit 후 코드리뷰 자동 실행 추천)
3단계     MCP 하나 붙여보기 (GitHub MCP 추천)
4단계     서브에이전트 패턴 실전 투입 (Phase 4 구현 시 병렬 탐색)
5단계     파이프라인 조합 (Schedule + MCP + 서브에이전트)
```
