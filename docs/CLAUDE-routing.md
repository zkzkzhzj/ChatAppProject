# Document Routing — 마음의 고향

> CLAUDE.md §9에서 분리. 작업 유형에 따라 어느 문서를 봐야 하는지 매핑.
>
> CLAUDE.md는 *행동 강령*만 담고, 본 문서는 *어디서 정보를 찾는가*만 담는다.

---

## 기획 / 비즈니스 맥락이 필요할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 프로젝트 개요 | `/docs/planning/project-overview.md` | 서비스 목표, 핵심 기능, 서비스 흐름 |
| 타겟 유저 | `/docs/planning/target-user.md` | 유저 페르소나, 유입 전략 |
| 윤리 정책 | `/docs/planning/ethics.md` | 대화 퀄리티 관리, 비난 방지 정책 |

## 설계 / 구조를 확인해야 할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 아키텍처 | `/docs/architecture/architecture.md` | 아키텍처 원칙, 계층 간 의존 방향 |
| 도메인 경계 | `/docs/architecture/domain-boundary.md` | 도메인 분류, 통신 규칙, 이벤트 흐름 |
| 패키지 구조 | `/docs/architecture/package-structure.md` | 패키지 레이아웃, 각 패키지의 책임 |
| ERD | `/docs/architecture/erd.md` | 물리 ERD, 테이블 명세, 설계 결정 기록 |
| 의사결정 기록 | `/docs/architecture/decisions/` | 기술 선택의 이유와 트레이드오프 (ADR) |

## 코드를 작성할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 코딩 컨벤션 | `/docs/conventions/coding.md` | 명명 규칙, Lombok, DTO, 예외 처리 |
| 테스팅 전략 | `/docs/conventions/testing.md` | 테스트 종류별 가이드, BDD 작성법 |
| Git 전략 | `/docs/conventions/git.md` | 브랜치 전략, 커밋 메시지, PR 규칙 |
| 병행 작업 | `/docs/conventions/parallel-work.md` | 충돌 회피 정책, 트랙 분리, Tier 0/1/2 분류 |

## API / 프로토콜을 다룰 때

| 문서 | 경로 | 내용 |
|------|------|------|
| REST API | `/docs/specs/api.md` (인덱스) / `/docs/specs/api/` (도메인별 상세) | 엔드포인트 정의, 요청/응답 형식 |
| WebSocket | `/docs/specs/websocket.md` | STOMP 프로토콜, 메시지 형식 |
| Kafka 이벤트 | `/docs/specs/event.md` | 토픽 정의, 이벤트 페이로드 |

## 프론트엔드 공간을 다룰 때

| 문서 | 경로 | 내용 |
|------|------|------|
| Phaser + Next.js | `/docs/wiki/frontend/phaser-setup.md` | Phaser 설정, Next.js 통합, 현재 구조 |
| 에셋 가이드 | `/docs/wiki/frontend/asset-guide.md` | 에셋 소스, 규격, Tiled 워크플로우, 스타일 방향 |
| WebSocket 클라이언트 | `/docs/wiki/frontend/websocket-client.md` | STOMP 연결, 메시지 송수신 |

## 시스템 동작 원리를 빠르게 파악할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| Wiki 인덱스 | `/docs/wiki/INDEX.md` | 토픽별 정규 지식. "이 시스템은 어떻게 동작하지?" |

## 작업 이력 / 현재 상태를 파악할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 현재 상태 | `/docs/handover.md` | 지금 어디까지 왔는가. 새 세션 시작 시 먼저 읽는 것 |
| 활성 트랙 인덱스 | `/docs/handover/INDEX.md` | 현재 진행 중인 작업 트랙. 병행 작업 시 첫 번째로 봐야 할 곳 |
| 트랙별 인수인계 | `/docs/handover/track-{id}.md` | 각 트랙의 진행 상태·결정·인수인계 |
| 구현 로드맵 | `/docs/planning/phases.md` | Phase별 구현 순서와 이유. 현재 Phase 체크 |
| 작업 히스토리 | `/docs/history/YYYY-MM-DD.md` | 날짜별 결정 맥락. 왜 이렇게 됐는가 |

## 학습 / 기술 기록이 필요할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 기술 노트 | `/docs/learning/` | 구현 과정의 학습 내용, 시행착오, 핵심 개념 정리 |
| 학습 노트 인덱스 | `/docs/learning/INDEX.md` | 카테고리별 학습 노트 색인 |
| 번호 예약 | `/docs/learning/RESERVED.md` | 트랙별 학습 노트 번호 예약 (충돌 방지) |

## AI Native 개발 환경 / 에이전트 운영이 필요할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 지식 베이스 인덱스 | `/docs/knowledge/INDEX.md` | AI Native 개발, Claude Code 실천법, Anthropic 연구 동향 |
| 소프트웨어 패러다임 | `/docs/knowledge/ai-native/software-paradigm.md` | Karpathy Software 3.0, LLM OS, Agentic Engineering |
| Anthropic 연구 동향 | `/docs/knowledge/ai-native/anthropic-research.md` | Managed Agents, Trustworthy Agents, 모델 업데이트 |
| Claude Code 실천법 | `/docs/knowledge/ai-native/claude-code-practices.md` | 파워유저 패턴, Hooks, Subagents, Skills |
| 에이전트 조직도 | `/docs/knowledge/AGENT-ORG.md` | 에이전트 역할, 셀프러닝 루프, 설정 현황 |
| JD 인텔리전스 (외부) | `~/IdeaProjects/marpple-prep/research/` (외부 작업 디렉토리, 본 레포 외부) | 취업 타겟 회사 JD 분석, 요구 기술 트렌드. 에이전트 정의는 `.claude/agents/job-market-agent.md`, 출력물은 레포 외부에 격리 |

## 회고 / 자기 설명 연습이 필요할 때

| 문서 | 경로 | 내용 |
|------|------|------|
| 트레이드오프 리허설 출력 | `/docs/learning/rehearsal/` | tradeoff-rehearsal-agent가 만든 자기 답변 연습용 노트 (사용자가 직접 채움) |
| 학습 전략 (메모리) | `memory/user_career_goal.md` | 본인 약점·강점·학습 전략 |
