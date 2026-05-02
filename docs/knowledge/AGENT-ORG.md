# 에이전트 조직도 — 마음의 고향

> 마지막 업데이트: 2026-04-30

---

## 조직 구조

```text
사용자 (방향 설정 + 최종 승인)
        ↓
┌──────────────────────────────────────────────────┐
│                   HQ (hq-agent)                  │
│  - 현재 상태 파악 (복원 프로토콜)                  │
│  - 요청 분석 → 적절한 팀에 위임                   │
│  - 결과 종합 → 사용자 보고                        │
│  - 재활용 가능: 파일에서 상태 복원                 │
└──────┬───────────────────────┬───────────────────┘
       ↓                       ↓
┌──────────────┐   ┌───────────────────────────────┐
│  리서치 본부  │   │          개발 본부             │
│              │   │                               │
│ [기술 리서치] │   │  [개발팀]        [품질팀]      │
│ research-    │   │  domain-agent   review-agent  │
│ agent        │   │  adapter-agent  docs-agent    │
│              │   │  test-agent                   │
│ [시장 리서치] │   │                               │
│ market-      │   └───────────────────────────────┘
│ research-    │
│ agent        │
│ competitor-  │
│ agent        │
│ user-        │
│ research-    │
│ agent        │
└──────────────┘
```

---

## HQ 에이전트

### hq-agent

- **역할**: 전체 조직 오케스트레이션. 요청 분석 → 에이전트 위임 → 결과 종합
- **재활용 핵심**: 매 세션 시작 시 5개 파일 읽어 상태 복원
  - `docs/handover.md`
  - `docs/handover/INDEX.md`
  - `docs/learning/RESERVED.md`
  - `docs/knowledge/INDEX.md`
  - `docs/knowledge/AGENT-ORG.md`
- **자동 진입**: `session-start-snapshot.js` hook 이 위 5개 파일을 캡처·요약해 stdout 출력 (`.claude/settings.json` 등록 완료, 트랙 `harness-spec-driven` C4, 2026-04-30). Claude 가 첫 답변에서 현재 위치 자동 인지
- **파일**: `.claude/agents/hq-agent.md`

---

## 리서치 본부

### research-agent (기술 리서치)

- **역할**: AI Native 개발, Claude Code, Anthropic 연구 동향 추적
- **출력**: `docs/knowledge/ai-native/` 누적
- **자율성**: 높음 (스케줄 자동 실행 가능)
- **파일**: `.claude/agents/research-agent.md`

### market-research-agent (시장 리서치)

- **역할**: 마음의 고향 서비스의 소셜/감성케어/버추얼 월드 시장 규모·트렌드 분석
- **출력**: `docs/knowledge/market/market-trends.md` 누적
- **자율성**: 높음 (스케줄 자동 실행 가능)
- **파일**: `.claude/agents/market-research-agent.md`

### competitor-agent (경쟁사 분석)

- **역할**: Replika, Character.ai, Gather.town, ZEPETO 등 경쟁/유사 서비스 심층 분석 (마음의 고향 차별화 인사이트 도출)
- **출력**: `docs/knowledge/market/competitors/[서비스명].md` 누적
- **자율성**: 중간 (분석 대상 지정 필요)
- **파일**: `.claude/agents/competitor-agent.md`

### user-research-agent (유저 리서치)

- **역할**: 마음의 고향 타겟 유저 페르소나, 유저 니즈, 행동 패턴 분석 (외로움·1인가구·디지털 네이티브)
- **출력**: `docs/knowledge/market/user-personas.md`, `user-insights.md` 누적
- **자율성**: 중간
- **파일**: `.claude/agents/user-research-agent.md`

### job-market-agent (JD 인텔리전스)

- **역할**: 마플코퍼레이션/SOOP/치지직 채용 공고 분석, 요구 기술 트렌드 추적, 액션 아이템 도출
- **출력**: `~/IdeaProjects/marpple-prep/research/` (외부 작업 디렉토리 — 회사 분석 자료 공개 노출 회피)
- **자율성**: 높음 (주간 크론 등록 가능)
- **파일**: `.claude/agents/job-market-agent.md`
- **격리 정책**: 본 에이전트 정의는 레포 내부, 출력물은 레포 외부 (2026-04-27)

### context-health-agent (AI Native 컨텍스트 건강 검사)

- **역할**: CLAUDE.md 토큰 수, handover.md 최신성, 에이전트 프롬프트 품질, 지식 베이스 노화 감지
- **자율성**: 중간 (주간 실행 권장)
- **파일**: `.claude/agents/context-health-agent.md`

### realtime-tech-agent (실시간 기술 리서치 + 어드바이저)

- **역할**: 채팅·음성·라이브스트리밍·화면공유 기술 동향 수집 및 구현 어드바이저
- **모드 1 (수집)**: WebSocket/Kafka/WebRTC/HLS 등 최신 기술 동향 수집
- **모드 2 (어드바이저)**: 구현 중 기술 선택, 아키텍처 결정, 트레이드오프 조언
- **출력**: `docs/knowledge/realtime/` (chat.md / webrtc.md / streaming.md) 누적
- **자율성**: 중간 (수집은 자율, 어드바이저는 요청 기반)
- **파일**: `.claude/agents/realtime-tech-agent.md`

> **아카이브**: `dependency-tracker-agent` 는 트랙 `harness-spec-driven` (2026-04-30) 에서 `.claude/agents/_archive/` 로 이동. 사유: Claude Code 플랜 트리거 슬롯 한도(3) 초과로 4-13 이후 0건 방치. 동일 역할은 GitHub Dependabot 으로 대체 (`.github/dependabot.yml`). 슬롯 여유 시 부활 가능 (archive 보존).

---

## 개발 본부

### domain-agent

- **역할**: Domain Entity, VO, Port(in/out) 설계
- **파일**: `.claude/agents/domain-agent.md`

### adapter-agent

- **역할**: Controller, JPA Adapter, Kafka Adapter 구현
- **파일**: `.claude/agents/adapter-agent.md`

### test-agent

- **역할**: Cucumber BDD 시나리오 작성
- **파일**: `.claude/agents/test-agent.md`

### test-quality-agent

- **역할**: 테스트 품질 검증. BDD 형식, 성공/실패 케이스, 독립성, 의미 없는 테스트 탐지
- **파일**: `.claude/agents/test-quality-agent.md`

### review-agent

- **역할**: uncommitted 변경사항 Codex 리뷰. git commit PostToolUse 훅으로 자동 트리거
- **파일**: `.claude/agents/review-agent.md`

### full-review-agent

- **역할**: 전체 프로젝트 Codex 전수 점검 (커밋 무관)
- **파일**: `.claude/agents/full-review-agent.md`

### docs-agent

- **역할**: 문서↔코드 정합성 Codex 검증. API명세, ERD, 이벤트 명세 교차검증
- **파일**: `.claude/agents/docs-agent.md`

### concurrency-review-agent

- **역할**: 동시성·성능 전문 검증. check-then-act, 락 전략, Kafka 멱등성, N+1
- **파일**: `.claude/agents/concurrency-review-agent.md`

### security-review-agent

- **역할**: 보안 전문 검증. 인증/인가 누락, 민감 정보 노출, OWASP Top 10
- **파일**: `.claude/agents/security-review-agent.md`

### learning-agent

- **역할**: 기술 학습 노트 작성. 트레이드오프 비교, 선택지 분석, 시야 확장 정보 포함. 사람이 공부하기 좋은 포맷
- **출력**: `docs/learning/NN-주제.md` 또는 `docs/architecture/decisions/NNN-제목.md`
- **트리거**: `/학습노트` 스킬 또는 Stop Hook 리마인드
- **파일**: `.claude/agents/learning-agent.md`

### blog-writer-agent

- **역할**: 학습 노트를 외부 블로그(zlog) 글로 변환. 제목 후킹·서사 구조 강화·읽기 흐름 다듬기
- **출력**: `~/IdeaProjects/zlog/` (외부 레포)
- **트리거**: 사용자 명시 요청 시 (`feedback_service_perspective` 메모리 — 자동 활성 X)
- **파일**: `.claude/agents/blog-writer-agent.md`

### pr-agent

- **역할**: PR 생성 전담. 브랜치 생성·커밋 정리·푸시·`gh pr create`. git.md 규칙 준수. 6개 Codex 리뷰 게이트 (review/full-review/concurrency/security/test-quality/docs)
- **트리거**: "PR 날려", "PR 생성", "PR 올려", "푸시해줘", "올려줘"
- **파일**: `.claude/agents/pr-agent.md`

### review-respond-agent

- **역할**: PR 리뷰 코멘트 분석 및 수정안 제시. CodeRabbit·Codex AI 봇 리뷰 읽고 타당성 판단 → 코드 수정
- **트리거**: "리뷰 대응", "리뷰 반영", "코멘트 대응"
- **파일**: `.claude/agents/review-respond-agent.md`

### tradeoff-rehearsal-agent (트레이드오프 회고)

- **역할**: learning 노트 1개를 받아 *따져 묻는 5질문 + 본인 답안 슬롯* 자동 생성. 사용자가 자기 말로 트레이드오프를 다시 풀어보는 회고 연습 도구
- **출력**: `docs/learning/rehearsal/{learning번호}-rehearsal.md`
- **트리거**: "리허설", "회고 연습", "트레이드오프 시연"
- **파일**: `.claude/agents/tradeoff-rehearsal-agent.md`

---

## 재활용 원칙

> 에이전트는 특정 태스크가 아니라 **역할**로 정의된다.

| 원칙 | 구현 방법 |
|------|---------|
| 상태 무관 재사용 | 에이전트가 항상 파일에서 현재 상태를 읽어 복원 |
| 지식 누적 | 결과는 항상 `docs/knowledge/`에 append (삭제 금지) |
| 역할 명확화 | 에이전트 description에 매칭 조건 명시 |
| HQ 재활용 | 복원 프로토콜로 어느 세션에서나 동일 역할 수행 |

---

## 셀프러닝 루프

```text
[세션 시작]
SessionStart Hook (session-start-snapshot.js)
  → cwd · 워크트리 · 브랜치 · porcelain hash 캡처
  → 활성 트랙·spec·wiki last-modified 요약 + 5개 파일 가시화 (HQ 자동 진입)
  → (트랙 `harness-spec-driven` C4, 2026-04-30 — `.claude/settings.json` 등록 완료)
        ↓
[복원 프로토콜 — HQ]
hq-agent 세션 시작 시 5개 파일 읽기
  → handover.md + handover/INDEX.md + knowledge/INDEX.md
  → AGENT-ORG.md + learning/RESERVED.md
        ↓
[리서치 본부 — 자동]
research-agent (매주) → docs/knowledge/ai-native/ 업데이트
realtime-tech-agent (매주) → docs/knowledge/realtime/ 업데이트
market-research-agent → docs/knowledge/market/ (서비스 시장 조사)
competitor-agent → docs/knowledge/market/competitors/ (경쟁 서비스 분석)
user-research-agent → docs/knowledge/market/user-personas.md (서비스 타겟 유저)
job-market-agent → marpple-prep/research/ (외부 — 회사 분석 자료 격리)
wiki-lint — 수동/필요 시 실행 (`/wiki-lint` 슬래시 스킬). 주간 cron 등록은 후속 운영 작업 (트랙 `harness-spec-driven` AC 후속, 회수된 dependency-tracker 슬롯 사용 예정)
        ↓
[개발 본부 — 요청 시]
domain → adapter → test 순차 실행
        ↓
[품질 보증 — Bash 가드]
PreToolUse(Bash) Hook (pre-bash-guard.js)
  → 브랜치 prefix 6종 검증
  → 중복 PR 차단
  → ERD/API/event 누락 advisory
        ↓
[품질 보증 — 자동 리뷰]
PostToolUse Hook (post-commit-review.js)
  → git commit 성공 시 review-agent 자동 트리거
PR 생성 시 pr-agent §5
  → 6개 Codex 리뷰 (review/full-review/concurrency/security/test-quality/docs) CRITICAL 0건 통과
        ↓
[세션 종료]
Stop Hook (stop-handover-check.js)
  → 활성 트랙 있음: 자기 트랙 (브랜치명 longest-prefix 매칭) 의 `track-{id}.md` 갱신 검사
  → 활성 트랙 없음: 메인 `handover.md` 갱신 검사
  → 델타 산정: porcelain 상태 변화 + 시작 시 dirty 였던 파일의 hash 변화 + 세션 중 commit 된 파일
keyword-router.js (UserPromptSubmit) — 11개 키워드 라우팅 (트랙 `harness-spec-driven` C4 — spec/track-start/step-start/track-end 추가)
  → blog-writer / learning / pr / research / concurrency / security / review-respond / spec-new / track-start / step-start / track-end
```

---

## 설정 현황 (2026-04-30)

| 항목 | 상태 | 파일 |
|------|------|------|
| 에이전트 파일 23개 (운영) + 1개 (archive) | ✅ | `.claude/agents/` (운영 23: 4-13 19개 → 4-27 23개. dependency-tracker는 4-30 archive 로 이동) |
| 스킬 (프로젝트 + 글로벌) | ✅ | `.claude/skills/` 코드/전체/MD/동시성/보안/테스트 리뷰 + wiki-lint + 학습노트 + 브랜치정리 + spec-new/track-start/step-start/track-end (트랙 `harness-spec-driven` C3 신설, 2026-04-30) |
| 실험적 팀 기능 | ✅ | `.claude/settings.json` |
| 지식 베이스 (AI Native) | ✅ | `docs/knowledge/ai-native/` — handover-collision-management 등 활발 |
| 지식 베이스 (실시간 기술) | ✅ | `docs/knowledge/realtime/` — chat.md 30KB 본격 |
| 지식 베이스 (JD 인텔리전스) | ✅ 외부 출력 | 출력 위치: `marpple-prep/research/` (외부). 에이전트 정의는 레포 내, 출력물만 격리 |
| 지식 베이스 (시장조사) | ✅ | `docs/knowledge/market/` — 마음의 고향 서비스의 시장·경쟁사·유저 리서치 (서비스 운영 시작 시 본격 활용) |
| 의존성 자동 추적 | ✅ Dependabot | `.github/dependabot.yml` — gradle/npm/docker/actions 주간 (구 dependency-tracker-agent 대체, 트랙 `harness-spec-driven` C1, 2026-04-30) |
| 학습/회고 리허설 출력 | ✅ NEW | `docs/learning/rehearsal/` — tradeoff-rehearsal-agent 출력물 |
| CLAUDE.md 연결 | ✅ | `CLAUDE.md` — §9는 docs/CLAUDE-routing.md로 분리 (트랙 `harness-spec-driven` C1 에서 spec-driven/wiki-policy 정책 link 추가) |
| research-agent 주간 크론 | ✅ | 매주 월요일 09:00 KST |
| realtime-tech-agent 주간 크론 | ✅ | 매주 월요일 09:00 KST |
| job-market-agent 주간 크론 | ✅ | 매주 월요일 10:00 KST |
| SessionStart Hook | ✅ | `settings.json` `session-start-snapshot.js` — cwd / branch / porcelain hash + 활성 트랙·spec·wiki 가시화 (트랙 `harness-spec-driven` C4) |
| PreToolUse(Bash) Hook | ✅ | `settings.json` `pre-bash-guard.js` — 브랜치/PR/문서 누락 가드 |
| PostToolUse Hook (git commit) | ✅ | `settings.json` `post-commit-review.js` — commit 성공 시 review-agent 자동 트리거 |
| UserPromptSubmit Hook | ✅ | `settings.json` `keyword-router.js` — 11개 키워드 자동 라우팅 (트랙 `harness-spec-driven` C4 — spec/track-start/step-start/track-end 추가) |
| Stop Hook | ✅ | `settings.json` `stop-handover-check.js` — 활성 트랙 있음 → 자기 트랙 `track-{id}.md` (브랜치 longest-prefix 매칭) / 없음 → `handover.md` 갱신 검사 (트랙 `harness-spec-driven` C4·C7) |
| Notification Hook | ✅ | `settings.local.json` — 비프음 |
| Wiki (LLM Wiki 패턴) | ✅ | `docs/wiki/` — 14페이지 + INDEX + log.md + Lint 스킬. 트랙 `harness-spec-driven` 에서 활용 강화 정책 도입 (`docs/conventions/wiki-policy.md`, 2026-04-30) |
| 병행 트랙 + 워크트리 분리 | ✅ | `docs/conventions/parallel-work.md` + `docs/handover/INDEX.md` + `docs/learning/RESERVED.md` |
| Spec-Driven 4층 분리 모델 | ✅ NEW | `docs/conventions/spec-driven.md` — Issue/Spec/Track/Step (트랙 `harness-spec-driven` C1, 2026-04-30) |
| MCP PostgreSQL/Redis 연결 | ❌ | MCP 서버 설정 필요 |
