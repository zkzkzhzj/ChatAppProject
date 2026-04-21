# 학습 노트 인덱스

> 이 프로젝트를 만들면서 부딪친 기술 문제, 설계 결정, 트레이드오프를 **사람이 다시 읽을 때 맥락이 바로 잡히도록** 기록한 노트 모음.
>
> 규칙이 필요하면 `docs/conventions/`, 현재 상태가 필요하면 `docs/handover.md`, 왜 그렇게 됐는지가 필요하면 여기.
>
> 번호는 작성 시간 순서. 빈 번호(09, 10, 11, 14, 19)는 2026-04-21 병합 리팩토링으로 사라진 번호이며, 재사용하지 않는다.

---

## AI 네이티브 개발 환경

| # | 제목 | 한 줄 |
|---|------|------|
| [00](./00-ai-harness-claude-codex.md) | AI 하네스 — Claude Code · Codex | 에이전트·스킬·훅·MCP·CLAUDE.md·AGENTS.md 용어와 하네스 구성 흐름 |

## 인프라·빌드 초기 셋업

| # | 제목 | 한 줄 |
|---|------|------|
| [01](./01-docker-compose-full-stack.md) | docker-compose 전체 스택 기동 | Kafka `ADVERTISED_LISTENERS`·기동 순서·네트워크 통신 삽질기 |
| [02](./02-testcontainers-wsl2-issue.md) | Testcontainers + WSL2 Docker 연결 문제 | `Could not find a valid Docker environment` 원인과 해결 |
| [03](./03-cucumber-bdd-setup.md) | Cucumber BDD + Spring Boot 통합 | JUnit Platform에서의 Cucumber 7.x·TestAdapter 패턴 |
| [04](./04-gradle-java-toolchain.md) | Gradle Java Toolchain · Foojay Resolver | 팀 로컬 JDK 달라도 Java 21로 빌드 강제 |
| [05](./05-supply-chain-attack-axios.md) | npm 공급망 공격 (axios 1.14.1) | `^` 범위 지정의 위험·대응 정책 |
| [06](./06-spring-boot-profile-strategy.md) | Spring Boot 프로파일 전략 | local / docker / test 분기 구성 |
| [07](./07-spring-boot-4-upgrade.md) | Spring Boot 3.5 → 4.0 업그레이드 | Testcontainers 2.x·TestAdapter HTTP 클라이언트 교체 |

## 헥사고날·레이어 패턴

| # | 제목 | 한 줄 |
|---|------|------|
| [08](./08-phase1-layer-patterns.md) | Phase 1 계층 설계 패턴 (Domain · JPA · Security) | 정적 팩토리·`@Builder` 금지·yml 프로퍼티 분리 등 한 묶음 (구 08+10+11 병합) |
| [16](./16-hexagonal-refactoring-responsibility.md) | 헥사고날 리팩토링 — 책임 경계 | 중간 DTO 함정·IdempotencyGuard 공통화 |

## Spring Boot 4.x 함정

| # | 제목 | 한 줄 |
|---|------|------|
| [12](./12-spring-boot-4x-traps.md) | Spring Boot 4.x 자동구성·설정 함정 모음 | 모듈 분리(Flyway), 프로퍼티 네임스페이스(Cassandra·Kafka), keyspace 수동 생성 등 (구 12+14 병합) |

## 도메인 설계 결정

| # | 제목 | 한 줄 |
|---|------|------|
| [13](./13-global-alert-port-pattern.md) | 전역 AlertPort 패턴 | 운영 알람 vs 유저 알림 분리 |
| [17](./17-cassandra-schema-management.md) | Cassandra 스키마 관리 전략 | PostgreSQL과 왜 다른가·schema-action 전환 |
| [23](./23-chatroom-structure-space-equals-room.md) | 채팅방 구조 설계 | "공간이 곧 채팅방"인가 분리인가 |

## 정적 분석·프론트 컨벤션

| # | 제목 | 한 줄 |
|---|------|------|
| [18](./18-java-static-analysis-stack.md) | Java 정적 분석 스택 | Error Prone+NullAway 선정 + 한글 BDD 억제 전략 (구 18+19 병합) |
| [20](./20-frontend-eslint-convention.md) | 프론트엔드 ESLint 컨벤션 | Airbnb 사망 이후 strictTypeChecked + Prettier |

## 실시간 채팅·WebSocket

| # | 제목 | 한 줄 |
|---|------|------|
| [15](./15-websocket-stomp-deep-dive.md) | WebSocket + STOMP 동작 원리 | 프로토콜 딥다이브 + 프로젝트 구현 매핑 |
| [21](./21-village-public-chat-architecture.md) | 마을 공개 채팅 아키텍처 | ZEP/Gather.town에서 배운 설계 패턴 |
| [24](./24-stomp-websocket-jwt-channel-interceptor.md) | STOMP JWT 인증 | ChannelInterceptor로 CONNECT 프레임 인증 |
| [25](./25-batch-broadcast-multiuser-message-attribution.md) | 배치 브로드캐스트 + 멀티유저 메시지 귀속 | 인터리빙 방지와 "내 메시지" 판별 |
| [27](./27-realtime-chat-code-review-patterns.md) | 실시간 채팅 종합 리뷰 이슈 | 4개 전문 에이전트 리뷰에서 뽑은 패턴 |

## UI · 프론트엔드

| # | 제목 | 한 줄 |
|---|------|------|
| [26](./26-phaser-html-keyboard-focus-conflict.md) | Phaser vs HTML UI 키보드 포커스 충돌 | 게임 엔진 + 웹 UI 오버레이에서 필연적으로 만나는 문제 |
| [32](./32-web-2d-game-engine-comparison.md) | 웹 2D 게임 엔진 비교 | Phaser가 2D 인터랙티브 마을에 가장 적합한 이유 |
| [34](./34-react-nextjs-production-code-patterns.md) | React + Next.js 프로덕션 코드 패턴 | 백엔드 개발자가 프론트를 제대로 쓰기 |

## LLM · NPC 시리즈

| # | 제목 | 한 줄 |
|---|------|------|
| [22](./22-ollama-local-llm-spring-integration.md) | Ollama + 로컬 LLM NPC 연동 | Spring Boot 연동 설계 |
| [28](./28-llm-model-selection-and-production-strategy.md) | LLM 모델 선택 + 프로덕션 전략 | 6개 모델 비교 후 이중 전략 결정 |
| [29](./29-vector-embedding-pgvector-semantic-search.md) | pgvector 시맨틱 검색 도입기 | 최근순 → 의미 기반 검색 전환 |
| [30](./30-jpa-pgvector-type-mapping.md) | JPA + pgvector 타입 매핑 | Hibernate 네이티브 벡터까지의 4가지 삽질 |
| [31](./31-kafka-idempotency-key-design.md) | Kafka 멱등성 키 설계 | offset에 의존하면 안 되는 이유 |
| [33](./33-ai-agent-evaluation-methodology.md) | AI 에이전트 평가 방법론 | 감이 아닌 데이터로 품질 관리 |
| [36](./36-npc-conversation-engineering-patterns.md) | NPC 대화 엔지니어링 패턴 | "중간 서버가 있는 이유"를 증명하는 4개 축 |

## 배포·CD 시리즈

| # | 제목 | 한 줄 |
|---|------|------|
| [35](./35-aws-ec2-first-deployment.md) | AWS EC2 첫 배포 전체 기록 | Docker Compose + nginx + Cloudflare로 서비스 올리기 |
| [37](./37-cd-pipeline-design.md) | CD 파이프라인 구축기 | 수동 SSH에서 GHCR + SSM + OIDC로 |
| [38](./38-env-var-config-migration.md) | 12-factor Config 이관 | application-prod.yml 없애기 |
| [39](./39-nextjs-docker-healthcheck-ipv6-trap.md) | Next.js Docker healthcheck IPv6 교착 | Next.js · Node 17 · Alpine BusyBox 삼중 교집합 |

---

## 빈 번호 (병합으로 사라진)

| 번호 | 이동처 |
|------|--------|
| 09 | 원래 빈 번호 |
| 10 (구 JPA Entity Patterns) | → 08 |
| 11 (구 Security Config Patterns) | → 08 |
| 14 (구 Cassandra Spring Boot 4.x) | → 12 |
| 19 (구 Checkstyle 억제) | → 18 |

재사용 금지. git 히스토리에 원본 보존.

---

## 읽는 순서 추천

**처음 이 프로젝트에 합류했다면:**
1. `docs/handover.md` (현재 상태)
2. `docs/architecture/architecture.md` (아키텍처 원칙)
3. [00 AI 하네스](./00-ai-harness-claude-codex.md) — 개발 방식 이해
4. [08 Phase 1 계층 설계](./08-phase1-layer-patterns.md) — 우리가 어떤 패턴을 쓰는가
5. [21 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md) — 도메인 이해

**배포/운영이 궁금하면:**
35 → 37 → 38 → 39 순서 (시간순이기도 함)

**LLM/NPC가 궁금하면:**
22 → 28 → 29 → 30 → 31 → 33 → 36 순서
