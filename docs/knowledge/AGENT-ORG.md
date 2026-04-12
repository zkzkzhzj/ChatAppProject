# 에이전트 조직도 — 마음의 고향

> 마지막 업데이트: 2026-04-13

---

## 조직 구조

```
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
- **재활용 핵심**: 매 세션 시작 시 4개 파일 읽어 상태 복원
  - `docs/handover.md`
  - `docs/knowledge/INDEX.md`
  - `docs/knowledge/AGENT-ORG.md`
  - `docs/knowledge/market/INDEX.md`
- **파일**: `.claude/agents/hq-agent.md`

---

## 리서치 본부

### research-agent (기술 리서치)
- **역할**: AI Native 개발, Claude Code, Anthropic 연구 동향 추적
- **출력**: `docs/knowledge/ai-native/` 누적
- **자율성**: 높음 (스케줄 자동 실행 가능)
- **파일**: `.claude/agents/research-agent.md`

### market-research-agent (시장 리서치)
- **역할**: 소셜/감성케어/버추얼 시장 규모, 트렌드 분석
- **출력**: `docs/knowledge/market/market-trends.md` 누적
- **자율성**: 높음 (스케줄 자동 실행 가능)
- **파일**: `.claude/agents/market-research-agent.md`

### competitor-agent (경쟁사 분석)
- **역할**: Replika, Character.ai, Gather.town 등 경쟁/유사 서비스 심층 분석
- **출력**: `docs/knowledge/market/competitors/[서비스명].md` 누적
- **자율성**: 중간 (분석 대상 지정 필요)
- **파일**: `.claude/agents/competitor-agent.md`

### user-research-agent (유저 리서치)
- **역할**: 타겟 유저 페르소나, 유저 니즈, 행동 패턴 분석
- **출력**: `docs/knowledge/market/user-personas.md`, `user-insights.md` 누적
- **자율성**: 중간
- **파일**: `.claude/agents/user-research-agent.md`

### job-market-agent (JD 인텔리전스)
- **역할**: 마플코퍼레이션/SOOP/치지직 채용 공고 분석, 요구 기술 트렌드 추적, 액션 아이템 도출
- **출력**: `docs/knowledge/job-market/` 누적
- **자율성**: 높음 (주간 크론 등록 예정)
- **파일**: `.claude/agents/job-market-agent.md`

### dependency-tracker-agent (의존성 버전 추적)
- **역할**: Spring Boot/Java/Kafka/Next.js 최신 릴리즈 및 CVE 보안 패치 추적
- **출력**: `docs/knowledge/dependencies/` 누적
- **자율성**: 높음 (격주 크론 등록 예정)
- **파일**: `.claude/agents/dependency-tracker-agent.md`
- **상태**: 🔒 잠금 — 플랜 트리거 한도(3개) 초과로 크론 미등록. 슬롯 여유 생기면 재등록 예정.

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

```
[리서치 본부 — 자동]
research-agent (매주) → docs/knowledge/ai-native/ 업데이트
market-research-agent (격주) → docs/knowledge/market/ 업데이트
        ↓
[HQ — 세션 시작 시]
handover.md + knowledge/INDEX.md + AGENT-ORG.md + market/INDEX.md 읽기
→ 현재 상태 복원 → 사용자 요청 처리
        ↓
[개발 본부 — 요청 시]
domain → adapter → test → review 순차 실행
        ↓
[품질 보증 — 자동/요청]
review-agent (PostToolUse Hook 예정)
docs-agent (주간 스케줄 예정)
        ↓
[세션 종료]
Stop Hook → memory/ 자동 저장 (예정)
```

---

## 설정 현황 (2026-04-13)

| 항목 | 상태 | 파일 |
|------|------|------|
| 에이전트 파일 19개 | ✅ | `.claude/agents/` |
| 스킬 8종 | ✅ | `.claude/skills/` — 코드/전체/MD/동시성/보안/테스트 리뷰 + wiki-lint + 학습노트 |
| 실험적 팀 기능 | ✅ | `.claude/settings.json` |
| 지식 베이스 (AI Native) | ✅ | `docs/knowledge/ai-native/` |
| 지식 베이스 (시장조사) | ✅ 구조만 | `docs/knowledge/market/` |
| 지식 베이스 (실시간 기술) | ✅ | `docs/knowledge/realtime/` |
| 지식 베이스 (JD 인텔리전스) | ✅ | `docs/knowledge/job-market/` |
| 지식 베이스 (의존성 추적) | ✅ | `docs/knowledge/dependencies/` |
| CLAUDE.md 연결 | ✅ | `CLAUDE.md` |
| research-agent 주간 크론 | ✅ | 매주 월요일 09:00 KST |
| realtime-tech-agent 주간 크론 | ✅ | 매주 월요일 09:00 KST |
| job-market-agent 주간 크론 | ✅ | 매주 월요일 10:00 KST |
| PostToolUse Hook (git commit) | ✅ | `settings.json` — commit 성공 시 review-agent 리뷰 지시 |
| Stop Hook 세션 캡처 | ✅ | `settings.local.json` — 비프음 + memory 저장/handover 확인 |
| Notification Hook | ✅ | `settings.local.json` — 비프음 |
| Wiki (LLM Wiki 패턴) | ✅ | `docs/wiki/` — 11페이지 + INDEX + log.md + Lint 스킬 |
| dependency-tracker-agent 격주 크론 | 🔒 | 플랜 트리거 한도(3개) 초과 — 잠금. 슬롯 여유 시 재등록 |
| MCP PostgreSQL/Redis 연결 | ❌ | MCP 서버 설정 필요 |
