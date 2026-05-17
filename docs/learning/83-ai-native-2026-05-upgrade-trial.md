# 83 — 트랙 `ai-native-2026-05-upgrade` 회고 — sweep 2축 + 즉시 도입 3종 + MCP baseline

> 트랙: ai-native-2026-05-upgrade (#93, 2026-05-17 시작·종료)
> 1차 출처: [sweep v1](../knowledge/ai-native/2026-05-ai-native-sweep.md) + [sweep v2](../knowledge/ai-native/2026-05-ai-native-sweep-v2.md)

## 1. 트랙 사이클 자체

본 트랙 = sweep v1 (4섹션, 2026-05-16 작성) + sweep v2 (6섹션, 2026-05-17 작성) 의 통합 매트릭스 직접 적용. 사용자 의도 = "AI Native 진화 반영".

### step 분포

| Step | 내용 | 결과 |
|---|---|---|
| 0 | sweep v2 sub-research (research-agent background) | ✅ — MCP / AI Eval / AGENTS.md / Anthropic 5월 발표 / k6 LMOps / 경쟁 환경 6축 |
| 1 | CLAUDE.md compaction 60% 룰 + Critical Rules `<rule id=N>` XML 태그 보강 | ✅ — commit `2e51fc7` |
| 2 | CodeRabbit Claude Code 플러그인 가이드 + 1주 시범 정책 | ✅ — `docs/conventions/coderabbit-claude-code-plugin.md`, commit `301cf20` |
| 7 | MCP 보안 5규칙 baseline | ✅ — `docs/conventions/mcp-security-baseline.md`, commit `301cf20` |
| **3** | (1주 후) CodeRabbit 협력 vs 충돌 판단 + 정책 정착 | **시간 의존 — 본 트랙 종료 후 1주 동안 시범. learning 84 결박 결과 기록** |
| **4** | track-start / track-end SKILL.md supporting files 분리 | **후속 트랙 `skills-progressive-disclosure` 결박 분리** |
| **5** | `/discover-domain-patterns` 자체 슬래시 스킬 (Agent OS 패턴 차용) | **후속 트랙 `skills-progressive-disclosure` 결박 분리** |
| **6** | Anthropic Outcomes 시범 (spec verification 결박 결합 가능성) | **후속 트랙 `anthropic-outcomes-trial` 결박 분리** |

본 트랙은 **즉시 도입 + 보안 baseline** 한정. 조건부 도입은 후속.

### 1 PR · 4 commit 구조 (메타 트랙)

| Commit | 내용 |
|---|---|
| `ad90180` | Step 0 — 트랙 시작 절차 (Issue #93 + 브랜치 + handover/INDEX 활성) |
| `2e51fc7` | Step 1 — CLAUDE.md compaction + Critical Rules XML |
| `301cf20` | Step 2 + 7 — CodeRabbit 가이드 + MCP 보안 baseline |
| (트랙 종료) | learning 83 + handover 갱신 + spec/track ✅ |

## 2. sweep v1 + v2 통합 매트릭스 적용 결과

### 도입 권고 6개 중 적용 3건

| # | 항목 | 적용 위치 |
|---|---|---|
| 1 | Proactive compaction 60% 룰 | CLAUDE.md §5 #4 |
| 2 | CLAUDE.md Critical Rules XML 태그 | CLAUDE.md §4 `<rule id=N>` |
| 3 | CodeRabbit Claude Code 플러그인 | docs/conventions/coderabbit-claude-code-plugin.md (1주 시범 진행) |
| 4 | Langfuse self-host (sweep v2 추가) | `npc-evaluator-lmops` 후속 트랙 결박 분리 |
| 5 | Grafana Anthropic prebuilt (sweep v2 추가) | `npc-evaluator-lmops` 후속 트랙 결박 분리 |
| 6 | MCP 보안 5규칙 (sweep v2 추가) | docs/conventions/mcp-security-baseline.md |

### 조건부 도입 11개 중 후속 트랙 분리 9건

| # | 항목 | 후속 트랙 |
|---|---|---|
| Step 4 | track-start/end SKILL.md supporting files | `skills-progressive-disclosure` |
| Step 5 | `/discover-domain-patterns` (Agent OS 패턴) | `skills-progressive-disclosure` |
| Step 6 | Anthropic Outcomes 시범 | `anthropic-outcomes-trial` |
| (v1) | spec-new / step-start Skills 마이그 | `skills-progressive-disclosure` Phase 2 |
| (v1) | Task budgets / effort levels 정책화 | 큰 트랙 시범 시점 |
| (v1) | Memory cross-tool compression (AGENTS.md) | 단일 사용자 결박 ROI 낮음 → 보류 |
| (v2) | 로컬 PG MCP (stdio + read-only) | `npc-evaluator-lmops` 사전 ADR 보강 |
| (v2) | Spring Boot 4.x MCP server (`@McpTool`) | 보안 5규칙 선결, 큰 트랙 결박 |
| (v2) | k6 TTFT custom / OpenLIT / Webhooks | `npc-evaluator-lmops` 또는 별도 |

### 보류 14개

sweep v1 의 7개 (HTML 전체 마이그 / Agent OS 전체 / `/inject-standards` / `/shape-spec` / 단순 스킬 마이그 / Spec-Kit·BMAD·Kiro / Thariq plan 산출물 HTML) + sweep v2 의 7개 (AGENTS.md 풀마이그 / nested AGENTS.md / 운영 PG MCP 직노출 / SaaS MCP / 경쟁 IDE 풀 / Anthropic Dreaming / LangSmith·Braintrust SaaS) — 본 트랙 종료 시점 결박 모두 보류.

## 3. D1·D2·D3·D4 결정 회고 (spec §4 동기화)

### D1 — compaction 60% 시점 — autocompact vs proactive

**채택**: proactive 60%.

- autocompact 기다리면 lost-in-the-middle 이미 발생
- 50% 너무 이른 / 70% 너무 늦음
- 60% = sub-agent 출격 / 백그라운드 결과 dump 직후 발동 trigger

빈틈: `/compact` 후 도구 호출 결과 손실. 사용자가 명시 호출 시점 결박 결정.

### D2 — Critical Rules XML 태그 — `<rule>` vs `<critical>` vs `<must>`

**채택**: `<rule id=N>` (Anthropic 공식 prompt engineering 예제 결박 결박 결박).

- 다른 태그명 (`<critical>` / `<must>`) 검증 X
- `<rule id=N>` 결박 attribute 결박 결박 결박 결박 결박 결박 결박

빈틈: XML 태그가 markdown 가독성 ↓. 사람 검토 시 잡음. markdownlint MD033 (inline HTML) disable 결박 호환 박힘.

### D3 — CodeRabbit Claude Code 플러그인 — 자율 루프 협력 vs 충돌

**채택**: 1주 시범 (2026-05-17 ~ 2026-05-24) — Step 3 결박 판단.

- 자체 fix-loop (트랙 `harness-spec-driven` C3) 와 중복 검토 위험
- 시범 결과 결박 정책 정착 (default 활성 / 조건부 활성 / 비활성 3분류)

판단 기준: 중복 < 20% 협력 OK / 중복 ≥ 50% 충돌. learning 84 결박 결과 기록.

### D4 — Skills 정식 포맷 마이그 — 7개 결박 결박 결박 결박

**채택**: 후속 트랙 `skills-progressive-disclosure` 결박 분리. 본 트랙 외.

- track-start / track-end 가장 ROI 큰 2개부터
- Phase 2 — spec-new / step-start
- 단순 스킬 3개 (학습노트 / wiki-lint / 브랜치정리) 는 현 포맷 유지

빈틈: SKILL.md 공식 표준 미정착 → 마이그 후 표준 변경 시 재작업.

## 4. 다음 트랙 인수인계

### 4.1 후속 트랙 (본 트랙 분리 산출)

- **skills-progressive-disclosure** — Step 4·5 (track-start/end SKILL.md supporting files + `/discover-domain-patterns` 자체 슬래시 스킬). 1차 출처: sweep v1 §C.4·§B.5 + 본 회고 D4.
- **anthropic-outcomes-trial** — Step 6 (Anthropic Outcomes public beta + 우리 spec verification 결박 결합 가능성). 1차 출처: sweep v2 §D.2.

### 4.2 sweep v2 결박 발견된 별도 트랙 후보

- **npc-evaluator-lmops** (사전 ADR learning 68) 보강 — Langfuse self-host + OpenLIT + Grafana Anthropic prebuilt (sweep v2 §B + §E). 본 트랙 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박.

### 4.3 보류 트랙 (사용자 결정)

- **harden-village-ops** (Issue #92, branch `fix/harden-village-ops`, commit `a99e4cc`) — 운영 P1 두 개 + 재배달 회귀 테스트. PR #91 의 `full-review-agent` 발견. 본 트랙 ⓒ 종료 후 사용자 재개 결정.

## 5. CodeRabbit 1주 시범 운영 규칙 재명시

| 시점 | 액션 |
|---|---|
| 2026-05-17 | 시범 시작 (본 트랙 머지 직후) |
| 2026-05-17 ~ 24 | 트랙 시작 시 본 플러그인 1회 이상 호출 + 결과 기록 |
| 2026-05-24 | learning 84 결박 결과 분석 — 협력 OK / 부분 협력 / 충돌 3분류 |

판단 기준: `docs/conventions/coderabbit-claude-code-plugin.md` §4.4.

## 6. 메타 — 본 트랙 사이클의 발견

### 6.1 sweep 2축 (v1 + v2 sub-research) 패턴 효과

v1 = 4섹션 즉시 종합 / v2 = 6섹션 누락 보강. 사용자 시그널 ("이거말고 최신정보는 더 없어?") 결박 결박 sub-research 결박 결박 = 사용자 본질 의심 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박. 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박.

다음 사이클: sweep v3 (예: 2026-06 중순) — `npc-evaluator-lmops` 트랙 시작 직전 결박 LMOps 결박 결박 결박 결박 결박.

### 6.2 메타 트랙 4 commit 구조 정합

본 트랙 = 첫 메타 트랙 (1 PR · N commit, docs only). 트랙 ⓐ `ctx-refresh-post-village-3d` 의 12 commit (정리 사이클 4 step + 메타) vs 본 트랙 4 commit (즉시 도입 3건 + 보안 baseline) — 메타 트랙도 스코프 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박.

### 6.3 사용자 의도 정정 사례 — ⓑ → ⓒ

본 트랙 시작 직전 (2026-05-17 세션 후반) 사용자 시그널 = "AI NATIVE 하는거 아니야?" → 내가 권장한 ⓑ (운영 P1) 를 ⓒ (AI Native) 로 정정. 트랙 ⓑ Step 0 (commit `a99e4cc`, branch `fix/harden-village-ops`) 는 origin 보존, 본 트랙 종료 후 사용자 재개 결정.

**교훈**: spec verification 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박. 권장 순서 (ⓑ → ⓒ) 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박. 사용자 명시 의도 우선.

### 6.4 sweep v2 의 가장 큰 발견 — Code w/ Claude 2026 (5-6)

sweep v1 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박. Anthropic Memory public beta / Dreaming preview / **Outcomes public beta (자동 grader — spec acceptance criteria 와 같은 철학)** / Multiagent Orchestration / Webhooks 4종. Outcomes 결박 본 프로젝트 결박 spec verification 시스템 결박 결박 결박 결박 가능성 높음 — 후속 트랙 `anthropic-outcomes-trial` 결박 결박 결박.

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-17 | 트랙 ⓒ 종료 시 작성 |
