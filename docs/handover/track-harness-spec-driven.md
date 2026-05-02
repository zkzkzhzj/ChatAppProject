# Track: harness-spec-driven

> ✅ 종료 (2026-04-30, 1세션)
> 작업 영역: AI Native 하네스 (`.claude/`) + docs 컨벤션 + dependency 정리
> 시작일: 2026-04-30
> 종료일: 2026-04-30
> Issue: #46 / PR: #47
> 브랜치: `infra/harness-spec-driven` (1 PR · N 커밋 — 메타·도구 트랙 예외)
> Spec: 없음 (메타·도구 트랙 — `feature` spec 파일 대신 본 파일 §0.5 Acceptance Criteria 가 spec.verification 자리)
> 트랙 종류: **메타·도구 트랙** — `step-driven.md` §2.2 / `git.md` §4 의 1 step = 1 PR 엄격 룰의 명시적 예외. 본 트랙 step 표는 v2 표준(`Step \| 내용 \| 의존 \| 상태 \| 이슈 \| PR`) 대신 phase·커밋 표 사용 — phase 간 의존이 강하고 phase별 PR 분리 시 도입 효과가 머지 후로 늦춰지는 닭과 달걀 문제 회피용. 후속 서비스 트랙은 v2 step 표 따름.

---

## 0. 한 줄 요약

GH 이슈 → 채팅 → 코드 흐름의 휘발성을 **spec-driven 4층 분리**(Issue/Spec/Track/Step)로 잡고, 검증 사이의 사용자 개입을 **자동 fix-loop + Comprehension Gate**(13 카테고리/Tier A·B·C)로 압축한다.

## 0.5 Acceptance Criteria (이게 통과하면 트랙 종료)

> 본 트랙은 메타·도구 트랙이라 spec 파일 없이 본 §0.5 가 spec.verification 의 자리. 후속 트랙은 spec 파일 §6 과 1:1 매핑.

- [x] **정책 문서**: `spec-driven.md` · `wiki-policy.md` · `comprehension-gate.md` 3종 작성 + CLAUDE.md / parallel-work.md / git.md 정합 갱신 (C1·C2·C3)
- [x] **Spec 디렉토리**: `docs/specs/features/_template.md` 신설 + `docs/specs/README.md` 로 산출물 명세와 분리 명시 (C2)
- [x] **슬래시 스킬 4종**: `/spec-new` · `/track-start` · `/step-start` (fix-loop + Comprehension Gate) · `/track-end` 동작 가능 (C3)
- [x] **hook 강화 3종**: SessionStart 활성 트랙·spec·wiki 가시화 / stop-handover-check 트랙 분리 정합 / keyword-router 키워드 (spec/step/트랙) (C4)
- [x] **Dependabot**: `.github/dependabot.yml` 활성. dependency-tracker-agent archive 완료 (C1)
- [ ] **dry-run**: 후속 트랙 (`token-auto-renewal` / `npc-evaluator-lmops` / `ws-redis` Step 3) 의 spec 작성 시점에 새 흐름 통과 — **본 PR 머지 후 별도 트랙에서 검증**
- [x] **learning 노트**: `#66`·`#67`·`#68` 작성 완료 (RESERVED 사용 완료 표시) (C5)
- [x] **handover 정합**: 메인 `handover.md` §1·§2·§4 갱신 + INDEX 활성→완료 (C5)
- [ ] **wiki-lint 주간 cron 등록**: Claude Code routine 시스템 (`schedule` skill) 으로 사용자 직접 등록 — settings.json 외부 (PR 머지 후 사용자 작업)

## 1. 배경 / 왜

- 26개 서브에이전트·5 hook·트리플 handover는 갖춰졌으나, **요구사항 정착지 부재 + 진행 상태의 단일 진실 위치 모호 + 1커맨드 절차 부재**로 사용자가 매 단계 끼어들어야 함
- 외부 트렌드(BMAD-METHOD / GitHub Spec Kit / AB Method / SuperClaude / awesome-claude-code) 분석에서 추출한 핵심 패턴을 마플 커피챗 인사이트(트레이드오프 토론·시스템적 빈틈 방어·본인 말로 풀게)와 정합화
- 풀세트 도입 결정 (사용자 승인 2026-04-30): 단일 트랙으로 묶어 1 PR · 5 커밋 진행
- 후속 트랙(`npc-evaluator-lmops`, `ai-observability`)은 본 트랙이 만든 `/spec-new`를 첫 사용자로 dry-run

## 2. 전체 로드맵

| Phase | 커밋 | 내용 | 상태 |
|-------|------|------|------|
| P1 | C1 | 정리 + 정책 (dependency-tracker→Dependabot, spec-driven.md, wiki-policy.md, dependabot.yml, AGENT-ORG/INDEX 갱신, CLAUDE.md §1 링크) | 🔧 진행 중 |
| P2 | C2 | docs 골격 (`docs/specs/features/` 디렉토리·README·_template.md, 트랙 템플릿 v2 — Acceptance Criteria + spec 링크 + 1step=1PR, CLAUDE.md §5 v2, parallel-work.md / git.md 정합 갱신) | 대기 |
| P3 | C3 | 슬래시 스킬 4종 (`/spec-new` · `/track-start` · `/step-start` + fix-loop + Comprehension Gate · `/track-end`) + `docs/conventions/comprehension-gate.md` (13 카테고리·Tier A/B/C·자동 식별 룰·금지 예시) | 대기 |
| P4 | C4 | hook 강화 (SessionStart 복원 프로토콜 — 활성 트랙·spec·wiki last-modified grep / stop-handover-check 트랙·spec 반영 / keyword-router 키워드 추가 — spec/step/트랙 / wiki-lint 주간 cron — 회수된 dependency 슬롯) | 대기 |
| P5 | C5 | 검증 (다음 트랙 dry-run) + learning **#66·#67·#68** + handover.md / INDEX 정합 갱신 + CLAUDE.md "500→1200" 회고 메모 | 대기 |
| P6 | C6 | Codex 리뷰 P2 3건 (keyword-router 숫자 매칭 / wiki 노화 git 기반 / stop hook 자기 트랙 식별) | ✅ |
| P7 | C7 | CodeRabbit 리뷰 23건 (B1~B8 + #18 PR 번호 치환) — 정합/슬래시매칭/SKILL 보강/AGENT-ORG stale 갱신. B9 (wiki 페이지별 enumerate) 거부 — wiki-lint 영역 + AC 후속 분리 | ✅ |

## 3. 현재 단계 상세 (P7 = C7 — post-review)

### C7 적용 batch (CodeRabbit 23건)

| Batch | 변경 파일 | 핵심 |
|-------|----------|------|
| B1 | `RESERVED.md` 헤더 / `INDEX.md` 완료 표 / `handover.md` §1·§2 | 마지막 사용 번호 65→68, PR 번호 #43·#47 치환 |
| B2 | `.claude/hooks/keyword-router.js` | 슬래시 형식 (`^/?\s*spec[-\s]?new` 등) 직접 매칭 추가 |
| B3 | `.claude/hooks/stop-handover-check.js` | `getCurrentBranchTrackId(cwd, activeTrackIds)` longest-prefix 매칭 (`fix/{id}-{specifics}` → `{id}` 자동 매핑) |
| B4 | `comprehension-gate.md` / `CLAUDE.md` / `spec-driven.md` | 복수 카테고리 매칭 시 최종 Tier = max / "이미 답했음" 자동 통과 매칭 룰 (§7.1) / Phase B 요약 Tier 표 / Step↔Issue 매핑 통일 |
| B5 | SKILL.md 4종 | spec-new wiki 비우면 "해당 없음" 자동 / step-start 활성 트랙 1개→현재 브랜치 트랙 ID + STEP_START_COMMIT placeholder / **track-end head -50 제거 (Critical)** / track-start 번호 사용 시점 안내 |
| B6 | `AGENT-ORG.md` | hook 자동 진입 / 셀프러닝 루프 / wiki-lint 수동 / 11개 키워드 / 11개 hook 표 갱신 (P4 예정 → 현재 시제) |
| B7 | learning #66·#67 | `./gradlew test` → 예시 한 단어 / Tier A 정의 명시 / "(이전 프로세스에서는)" 시간축 |
| B8 | wiki-policy.md / parallel-work cross-ref / _template.md | learning/67 직접 link / INDEX.md 트랙 시작 절차 0번 step / frontmatter ↔ 파일명·track 일치 의무 |

### B9 거부 회신 (별도 PR 코멘트)

`wiki-policy.md` §2.4 SessionStart hook 의 페이지별 enumerate 권고 → `/wiki-lint` 스킬 영역 + 본 트랙 AC 후속 작업 (`wiki-lint 주간 cron 등록` — track 파일 §0.5 미체크 항목)으로 분리. 매 세션 시작 시 14페이지 enumerate 는 hook 원칙 (마찰 최소) 와 충돌.

## 3.A 이전 단계 상세 (P1 = C1)

### 변경 파일

| 분류 | 파일 | 변경 |
|------|------|------|
| 신설 | `.github/dependabot.yml` | gradle / npm / docker / github-actions 주간 추적 |
| 신설 | `docs/conventions/spec-driven.md` | 4층 분리 모델 (Issue/Spec/Track/Step) 정책 |
| 신설 | `docs/conventions/wiki-policy.md` | 카파시 LLM Wiki 활용 강화 (4종 갱신 자동화) |
| 이동 | `.claude/agents/dependency-tracker-agent.md` → `.claude/agents/_archive/` | 아카이브 |
| 삭제 | `docs/knowledge/dependencies/` (4 파일) | 정리 |
| 갱신 | `docs/knowledge/AGENT-ORG.md` | dependency 항목 제거, 셀프러닝 루프 다이어그램 정리, hq 자동 진입 메모 (P4 연결) |
| 갱신 | `docs/knowledge/INDEX.md` | dependencies 행 제거 |
| 갱신 | `CLAUDE.md` | §1에 spec-driven / wiki-policy 정책 링크 추가 (큰 §5 v2는 P2) |
| 갱신 | `docs/learning/RESERVED.md` (P0.3 완료) | #66·#67·#68 예약 |
| 갱신 | `docs/handover/INDEX.md` (P0.4 완료) | 활성 표 1행 |
| 신설 | `docs/handover/track-harness-spec-driven.md` (P0.5 완료) | 본 파일 |

### 완료 조건 (P1 검증)

- [ ] dependency-tracker-agent 흔적 0 (AGENT-ORG, knowledge/INDEX, dependencies 디렉토리)
- [ ] Dependabot 설정 유효 (gh / GitHub UI 검증)
- [ ] spec-driven.md / wiki-policy.md 골격 채워짐 (4층 정의, 4종 자동화)
- [ ] CLAUDE.md §1에 정책 링크 추가, 큰 §5는 미변경
- [ ] RESERVED #66·#67·#68 트랙 표기 정확
- [ ] handover/INDEX 활성 표에 본 트랙 등재
- [ ] SessionStart hook 정상 (dependency 부재로 인한 에러 없음)

## 4. 충돌 위험 파일

> 다른 활성 트랙: 없음 (`infra-tls-hardening` 종료, `token-auto-renewal` 보류). 충돌 가능성 0.

| 파일 | Tier | 본 트랙에서의 변경 |
|------|------|------------------|
| `CLAUDE.md` | 1 | P1 §1 작은 추가, P2 §5 큰 변경 |
| `docs/conventions/parallel-work.md` | 1 | P2 spec-driven 정합 갱신 |
| `docs/conventions/git.md` | 1 | P2 1step=1PR 정책 추가 |
| `docs/handover/INDEX.md` | 0 | P0~P5에서 본 트랙 행만 갱신 |
| `docs/handover.md` (메인) | 0 | **머지 PR 안에서만** 갱신 (parallel-work §4.2) |
| `docs/learning/RESERVED.md` | 0 | P0 예약 + P5 사용 완료 표시 |
| `.claude/agents/`, `.claude/hooks/`, `.claude/skills/` | 2 | 본 트랙 자기 영역 |
| `.github/dependabot.yml` | 신설 | 신규 |
| 서비스 코드 (`src/main/java/**`) | — | **0 변경** (메타 트랙) |

## 5. 다음 세션 착수 전 확인 사항

- `git pull --ff-only origin main` → 본 브랜치 rebase
- `gh issue view 46` 으로 트랙 의도 확인
- 본 §3에서 현재 진행 phase 확인
- 본 PR(미머지) commit log 로 어디까지 끝났는지 검증
- `CLAUDE.md` §5 워크플로가 P2 후 v2 형식인지 확인 (구 v1 따라가면 안 됨)

## 6. 후속 트랙 후보 (본 트랙 머지 후)

- **`npc-evaluator-lmops`** — NPC 응답 evaluator + prompt 버전 관리 + LLM 비용 추적 + 회귀 detector. 본 트랙이 만든 `/spec-new` 첫 사용자로 dry-run 겸용
- **`ai-observability`** — 분산 trace + LLM 메트릭 (응답시간/토큰/비용) Grafana dashboard. 위와 병행 가능

## 7. 보류 메모

- **CLAUDE.md "500 → 1200" 의미 미확정** (사용자 본인도 의도 불명, 2026-04-30 대화). P5 dry-run에서 활용 패턴 관찰 후 재정의 — `토큰 정책` / `분량 확장` / `다른 의미` 중 무엇이었는지 합의
- **comprehension-gate 카테고리 #13 (새 기술/의존성) 자동 식별 정확도** — P5 dry-run에서 false positive / negative 측정 후 P3 룰 튜닝 가능성 (회귀 PR로 분리 가능)
- **wiki-lint cron 슬롯** — Claude Code 플랜 트리거 한도 3개 중 회수된 dependency 슬롯 사용 (P4). 한도 변경되면 dependency-tracker 부활 가능 (현재 archive 보존)
