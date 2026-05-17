---
feature: ai-native-2026-05-upgrade
track: ai-native-2026-05-upgrade
issue: "#93 (트랙 시작 시 gh issue create)"
status: complete
created: 2026-05-17
last-updated: 2026-05-17
---

# AI Native 2026-05 진화 반영 — CLAUDE.md + Skills + CodeRabbit + Sweep v2

> 트랙 `ai-native-2026-05-upgrade` 의 요구사항 진실. 트랙 `ctx-refresh-post-village-3d` (#90, PR #91) 의 sweep v1 (`docs/knowledge/ai-native/2026-05-ai-native-sweep.md`) "도입 권고 + 조건부 도입" 매트릭스 적용 + sweep v2 (MCP / AI Eval / AGENTS.md) sub-research.
> Pre-scaffolded — 다음 세션이 spec 읽고 즉시 Step 0 (sweep v2 research) 진입 가능.

---

## 1. Outcomes

- **Opus 4.7 1M 컨텍스트 시대 베스트 프랙티스 코드화** — CLAUDE.md 에 "context 60% 시점 `/compact` 발동" 룰 + Critical Rules XML 태그 보강
- **CodeRabbit Claude Code 안 직접 호출** — 자동 fix-loop 와 협력 검증 (1주 시범 후 판단)
- **sweep v2 산출물** — MCP 서버 생태계 / AI Agent Evaluation 도구 / AGENTS.md v1.1 표준 / Karpathy 5월 후속 / 경쟁 환경 비교 종합 노트
- (조건부) Skills 정식 포맷 마이그 — `track-start` / `track-end` 의 supporting files 분리
- (조건부) Agent OS `/discover-standards` 패턴 차용 — 신규 도메인 트랙 시작용 자체 슬래시 스킬

## 2. Scope

### 2.1 In

**즉시 도입 (sweep v1 §종합 — 도입 권고)**:

- CLAUDE.md "context 60% 시점 `/compact` 자동 발동" 룰 (§5 또는 §0 결박 결박 결박)
- CLAUDE.md Critical Rules 10개 룰 `<rule id=N>...</rule>` XML 태그 보강 (Anthropic 공식 prompt engineering 패턴 = XML 태그 권장)
- CodeRabbit Claude Code 플러그인 설치 + 사용 가이드 (`.claude/plugins/coderabbit` 또는 `/plugin install coderabbit`) + 1주 시범 후 협력 vs 충돌 판단

**sweep v2 sub-research (Step 0)**:

- `research-agent` 호출 결박 MCP / AI Eval / AGENTS.md / Karpathy 후속 / k6 LMOps / 경쟁 도구 종합
- 산출물: `docs/knowledge/ai-native/2026-05-ai-native-sweep-v2.md`
- v2 의 도입 권고 항목을 본 트랙 후속 step 결박 결박

**조건부 도입 (sweep v1 §조건부 — 검증 / 부분 차용)**:

- `track-start` / `track-end` 정식 SKILL.md 포맷 마이그 (progressive disclosure — supporting files 분리)
- Agent OS `/discover-standards` 패턴 차용 — 자체 슬래시 스킬 신규 작성 (Agent OS 패키지 통째로 설치 X)
- (sweep v2 결과 결박 결박 결박 결박 결박 결박 결박)

### 2.2 Out

- Task budgets / effort levels 정책화 — 큰 트랙 시범 적용 후 별도 정책 트랙
- `spec-new` / `step-start` SKILL.md 마이그 — track-start/end 만족스러우면 후속 트랙 결박 확대
- Memory cross-tool compression (AGENTS.md 표준) — sweep v2 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박
- 전체 docs/ HTML 마이그 — 보류 (sweep v1 결정)
- Agent OS 전체 채택 — 보류 (sweep v1 결정)
- Spec-Kit / BMAD / Kiro 채택 — 보류 (사용자 시스템이 동등 이상)

## 3. Constraints

| 차원 | 제약 |
|------|------|
| 성능 | 영향 X (docs / config + slash skill 변경) |
| 비용 | CodeRabbit 플러그인 — 기존 PR 봇 구독 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 |
| 시간 | 3~5일 (5~7 step) |
| 인프라 | 영향 X |
| 정책/규제 | 본 트랙은 CLAUDE.md 수정 — 다른 트랙과 충돌 우선 처치 |

## 4. Decisions

### D1. [AI Native 진화] CLAUDE.md compaction 60% 룰 — `/compact` 자동 vs 수동

- **왜**: Opus 4.7 1M 컨텍스트 시대에도 lost-in-the-middle 발생. autocompact 기다리면 이미 quality 하락. 60% 시점 proactive compaction 이 sweep v1 §D.1 의 가장 ROI 큰 즉시 도입 액션.
- **대안**:
  - 수동만 — 누락 위험.
  - 50% 또는 70% — 50% 너무 이른 정리, 70% 이미 lost-in-the-middle.
- **빈틈**: `/compact` 후에도 핵심 컨텍스트 (CLAUDE.md / handover) 는 다시 로드. 단 도구 호출 결과 / 백그라운드 에이전트 결과는 손실.
- **재검토 트리거**: Anthropic 공식 가이드라인 갱신 / 1M 컨텍스트 quality drop 측정 결과.

### D2. [AI Native 진화] Critical Rules XML 태그 — `<rule>` vs `<critical>` vs `<must>`

- **왜**: `<rule id=N>` 가 Anthropic 공식 docs 의 prompt engineering 권장 패턴. Claude 가 학습된 형식. 명령 강도 ↑.
- **대안**:
  - `<critical>` — 의미 통하지만 Anthropic 공식 예제 적음.
  - `<must>` — 검증 안 됨.
- **빈틈**: XML 태그가 markdown 가독성 ↓. 사람 검토 시 잡음.
- **재검토 트리거**: Anthropic 공식 prompt engineering 가이드라인 메이저 갱신.

### D3. [실험] CodeRabbit Claude Code 플러그인 — 자동 fix-loop 와 협력 vs 충돌

- **왜**: PR 봇만 쓰던 CodeRabbit 을 Claude Code 안에서 직접 호출. 자율 루프 (Claude writes → CodeRabbit reviews → Claude fixes) 가능.
- **대안**:
  - 기존 PR 봇만 — 자율 루프 X, 사용자 개입 필요.
  - Codex CLI 만 — 우리가 이미 사용. 보강 가치 적음.
- **빈틈**: 자동 fix-loop 와 CodeRabbit 자율 루프가 중복 검토 → 토큰 낭비 / 충돌 가능. 1주 시범 후 정책 결정.
- **재검토 트리거**: 시범 1주 후 — 협력 OK 면 정착, 충돌이면 PR 봇만 유지.

### D4. [학습 진화] Skills 정식 포맷 마이그 — 7개 중 어느 것부터

- **왜**: sweep v1 §C.4 분석 — `track-start` / `track-end` 가 가장 복잡 + supporting files 분리 ROI 큼. progressive disclosure 로 토큰 절약.
- **대안**:
  - 7개 전부 마이그 — 단순 스킬 (`학습노트` / `wiki-lint` / `브랜치정리`) 은 ROI 낮음.
  - 0개 — 현 포맷 유지. 자연어 호출 / supporting files 이득 X.
- **빈틈**: SKILL.md 포맷 진화 가능 (Anthropic 공식 표준 미정착). 마이그 후 표준 변경 시 재작업.
- **재검토 트리거**: Anthropic SKILL.md 공식 표준 메이저 갱신.

## 5. Tasks (= Steps)

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| 0 | sweep v2 sub-research — MCP / AI Eval / AGENTS.md / Karpathy 후속 / 경쟁 환경 (research-agent 위임) | — | `docs/knowledge/ai-native/2026-05-ai-native-sweep-v2.md` (신규) | #93 | TBD |
| 1 | CLAUDE.md compaction 60% 룰 추가 (1줄) + Critical Rules XML 태그 (`<rule id=N>`) 보강 | step0 | `CLAUDE.md` | #93 | TBD |
| 2 | CodeRabbit Claude Code 플러그인 설치 + 사용 가이드 + 1주 시범 시작 | step1 | `.claude/plugins/` 또는 `.claude/settings.json` + 가이드 문서 | #93 | TBD |
| 3 | (시범 1주 후) CodeRabbit 협력 vs 충돌 판단 + 정책 정착 결정 | step2 + 1주 | learning 노트 (결정 기록) | #93 | TBD |
| 4 | `track-start` / `track-end` SKILL.md supporting files 분리 (체크리스트 / wiki 영향 분석 / RESERVED 정리 별도 md) | step1 | `.claude/skills/track-start/`, `.claude/skills/track-end/` | #93 | TBD |
| 5 | Agent OS `/discover-standards` 패턴 차용 — 자체 슬래시 스킬 `/discover-domain-patterns` 신규 작성 | step1 | `.claude/skills/discover-domain-patterns/SKILL.md` (신규) | #93 | TBD |
| 6 | (sweep v2 결과 결박 결박 결박 결박 결박 결박) | step0 | TBD | #93 | TBD |

## 6. Verification

- [ ] CLAUDE.md 에 "context 60% 시점 `/compact` 발동" 룰 명시
- [ ] Critical Rules 10개 모두 `<rule id=N>` XML 태그 박힘
- [ ] CodeRabbit Claude Code 플러그인 설치 + 1회 이상 자율 루프 (Claude writes → CodeRabbit reviews → Claude fixes) 시범 실행
- [ ] sweep v2 노트 작성 + INDEX 등록
- [ ] (조건부) `track-start` / `track-end` SKILL.md 정식 포맷 마이그 + supporting files 1개 이상 분리
- [ ] (조건부) `/discover-domain-patterns` 슬래시 스킬 신규 작성 + 1회 이상 dry-run

## 7. References

- 트랙 파일: [track-ai-native-2026-05-upgrade.md](../../handover/track-ai-native-2026-05-upgrade.md)
- 1차 출처: [sweep v1 (2026-05)](../../knowledge/ai-native/2026-05-ai-native-sweep.md) — 4섹션 + 통합 매트릭스
- 관련 learning: 작성 예정 (트랙 종료 시 — sweep v1 + v2 종합 + 도입 결정 + 시범 결과)
- 외부 자료: sweep v1 의 §A·§B·§C·§D 출처 + sweep v2 의 추가 출처 (research-agent Step 0 산출)

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-17 | Pre-scaffold (트랙 `ctx-refresh-post-village-3d` PR #91 동봉) — 다음 세션 진입용 |
