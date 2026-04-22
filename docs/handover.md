# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
> **상세 맥락과 왜 그런 결정을 했는지는 `docs/learning/INDEX.md`에서 주제별로 찾는다.**
> 이 문서는 "지금 어디까지 왔고 다음에 뭘 해야 하는가"만 담는다.

---

## 현재 상태 (2026-04-22 기준, 24차 업데이트)

### ✅ 전체 완료 요약

Phase 0·1·2·3·5 구현 → AWS 배포 (ghworld.co) → CD 자동화 → 학습노트 정리까지 완료. (Phase 4 — Economy는 의도적으로 미착수.)

| 구분 | 범위 | 주요 PR | 상세 (learning) |
|------|------|---------|-----------------|
| Phase 0 | Foundation (Flyway, DDL 전략) | — | — |
| Phase 1 | Identity (회원가입, 로그인, GUEST 토큰) | PR #1 | [08](./learning/08-phase1-layer-patterns.md) |
| Phase 2 | Village (캐릭터, 공간, Outbox→Kafka) | PR #7 | [13](./learning/13-global-alert-port-pattern.md) |
| Phase 3 | Communication (마을 공개 채팅) | PR #7 | [15](./learning/15-websocket-stomp-deep-dive.md) · [21](./learning/21-village-public-chat-architecture.md) · [23](./learning/23-chatroom-structure-space-equals-room.md) · [24](./learning/24-stomp-websocket-jwt-channel-interceptor.md) · [25](./learning/25-batch-broadcast-multiuser-message-attribution.md) |
| Phase 5 | AI NPC (OpenAI GPT-4o-mini + pgvector 시맨틱) | PR #8 · #13 | [22](./learning/22-ollama-local-llm-spring-integration.md) · [28](./learning/28-llm-model-selection-and-production-strategy.md) · [29](./learning/29-vector-embedding-pgvector-semantic-search.md) · [30](./learning/30-jpa-pgvector-type-mapping.md) · [31](./learning/31-kafka-idempotency-key-design.md) · [33](./learning/33-ai-agent-evaluation-methodology.md) · [36](./learning/36-npc-conversation-engineering-patterns.md) |
| 실시간 공유 | 위치·타이핑·@멘션 NPC | PR #11 | [26](./learning/26-phaser-html-keyboard-focus-conflict.md) |
| 프론트 UI | Tailwind v4 디자인 시스템 + Phaser 월드 | PR #9 | [32](./learning/32-web-2d-game-engine-comparison.md) · [34](./learning/34-react-nextjs-production-code-patterns.md) |
| AWS 배포 | EC2 서울, nginx + Cloudflare, ghworld.co | — | [35](./learning/35-aws-ec2-first-deployment.md) |
| CI/DX | Checkstyle + Error Prone + ArchUnit + CodeRabbit | — | [18](./learning/18-java-static-analysis-stack.md) · [20](./learning/20-frontend-eslint-convention.md) · ADR [008](./architecture/decisions/008-ci-dx-tool-stack.md) |
| CD 자동화 | GHCR + SSM + OIDC (PR #15~#19) | PR #15~#19 | [37](./learning/37-cd-pipeline-design.md) · [38](./learning/38-env-var-config-migration.md) · [39](./learning/39-nextjs-docker-healthcheck-ipv6-trap.md) |
| 관측성 스택 | Prometheus + Grafana (monitor EC2), Micrometer histogram, k6 RW | PR #21~#23 | [40](./learning/40-observability-stack-decisions.md) · [42](./learning/42-grafana-jvm-dashboard-reading.md) |
| 부하 테스트 | k6 WebSocket+STOMP, Plateau Sweep, Breaking Point VU ~200 확정 | PR #23 | [41](./learning/41-k6-load-testing-setup.md) + `docs/reports/load-test-2026-04-22.md` |

> 학습 노트 전체 색인: [docs/learning/INDEX.md](./learning/INDEX.md)

---

## 최근 주요 변경사항 (현재 컨텍스트)

### 4/20 — CD 파이프라인 설계·구현 (Week 7 Step A) ✅ (PR #15)

| 항목 | 내용 |
|------|------|
| 옵션 선정 | 8개 옵션 → **B(GHCR) + E(SSM) + paths-filter + OIDC** 채택 |
| 인증 전환 | Access Key → GitHub Actions OIDC Federation. 장기 시크릿 제거 |
| 태깅 전략 | sha + latest 이중 태그. 롤백은 sha 재지정 |
| 조건부 빌드 | dorny/paths-filter — backend/frontend 변경 감지, docs만 바뀌면 전체 스킵 |
| 롤백 | 헬스체크 실패 시 이전 sha 태그로 자동 복구 |
| 학습 노트 | [37](./learning/37-cd-pipeline-design.md) — 15개 섹션, 설계+구현 통합 |

### 4/21 — 12-factor Config 이관 + deploy/ 디렉토리 분리 ✅ (PR #16)

CD 첫 실전 배포에서 "이미지 안에 application-prod.yml 없음" 문제 발견. 모든 설정을 env var로 이관하고 `deploy/` 디렉토리를 분리했다.

- application.yml 단일 통합 (모든 값이 `${ENV_VAR:기본값}`)
- 삭제: application-prod.yml, application-local.yml
- docker-compose.yml / scripts/deploy.sh → `deploy/` 하위로 이동
- 학습 노트: [38](./learning/38-env-var-config-migration.md)

### 4/21 — CD 첫 실전 배포 ✅ (PR #17~#19)

| PR | 내용 | 결과 |
|----|------|------|
| #17 | 프로젝트명 고정(`name: chatappproject`) + frontend healthcheck wget 교체 | 실패 |
| #18 | frontend healthcheck TCP(`nc -z`) 전환 | 실패 |
| #19 | frontend `HEALTHCHECK NONE` 임시 비활성화 | ✅ CD 통과 |

- GHCR + SSM + OIDC 자동 배포 루프 정상 순환 확인
- 6개 컨테이너 전부 Up, 서비스 정상 (ghworld.co)

### 4/21 — Frontend Docker healthcheck IPv6 교착 해결 ✅ (PR #20)

| 항목 | 내용 |
|------|------|
| 문제 | PR #19에서 `HEALTHCHECK NONE`으로 덮어둔 기술 부채. busybox wget/nc 전부 unhealthy |
| 근본 원인 | Next.js standalone 기본 `localhost` + Node 17+ IPv6 우선 DNS + Alpine BusyBox IPv6 미지원 **3중 교착** |
| 해결 | `deploy/docker-compose.yml` frontend에 `HOSTNAME: 0.0.0.0` env + Dockerfile `HEALTHCHECK wget -qO- http://127.0.0.1:3000/` 복원 |
| 검증 | 로컬 `docker compose up -d --build frontend` → Health=healthy, ExitCode=0 2회 연속 |
| 표준성 | Vercel 공식 with-docker 예제 + Self-Hosting 가이드와 동일 패턴 |
| 리서치 | [docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md](./knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md) |
| 학습 노트 | [39](./learning/39-nextjs-docker-healthcheck-ipv6-trap.md) |

### 4/21 — 학습노트 + handover 리팩토링 ✅ (이번 세션)

- learning/ 병합: 08+10+11 → 08 · 12+14 → 12 · 18+19 → 18 (39개 → 35개)
- `docs/learning/INDEX.md` 신설 (카테고리별 색인)
- handover 슬림화 (866줄 → 약 400줄, 완료된 상세는 learning/으로 이관)

### 4/22 — Week 7 Step B·C 완료 ✅ (관측성 + 부하 테스트)

**Step B — 관측성 스택** (PR #21~#23 머지 완료):

- `gohyang-monitor` EC2 (t3.small) 구축 — Prometheus + Grafana (SG로 인터넷 노출 차단)
- 운영 EC2 `/actuator/prometheus` 노출 + histogram bucket 활성화 (`management.metrics.distribution.percentiles-histogram`)
- Prometheus `--web.enable-remote-write-receiver` 활성화 — k6 메트릭 직송
- Grafana 대시보드: JVM 4701 + 자체 구성 `Load Test Live` (8패널) + k6 공식 19665
- 학습노트: [40](./learning/40-observability-stack-decisions.md) · [42](./learning/42-grafana-jvm-dashboard-reading.md)

**Step C — 부하 테스트** (상세는 `docs/reports/load-test-2026-04-22.md`):

- k6 + WebSocket/STOMP 직접 조립 시나리오 (`loadtest/village-mixed.js`) — position 500ms + chat 15~30s
- 토큰 풀 1000개 (`loadtest/prepare-tokens.js` login-first 멱등, `LOADTEST_PASSWORD` env 오버라이드)
- **3차에 걸친 Sweep**:
  - Sweep 1 (VU 10~100, 256MB heap): VU 80에서 latency 튐 시작
  - Sweep 2 (VU 100~200, 256MB heap): **Hard Breaking VU ~50** — Heap 87% + Major GC 1.65s STW + 504 Timeout
  - Sweep 3 (VU 100~200, **1 GB heap + Tomcat 400**): **Soft Breaking VU ~200** — stomp_connect_latency p99 **13.9s**, errors 1/1430
- **Breaking Point 확정**: VU ~200 (인프라 여유 있으나 Simple Broker single-threaded dispatch가 병목 — 80k dispatch/s queue에 CONNECT 프레임까지 밀림)
- 학습노트: [41](./learning/41-k6-load-testing-setup.md)
- 증거: `loadtest/screenshots/sweep3-{01~10}.png` (gitignored)

**Step D — Task 3 제출**: 작성 중 (Notion). 본 handover는 리포트·스크린샷 경로만 명시, 상세는 리포트 참조.

---

## 핵심 설계 결정 요약 (현재 활용 중 — 유지)

### 이벤트 흐름

```text
RegisterUserService
  → outbox_event 테이블 저장 (같은 트랜잭션)
  → OutboxKafkaRelay (@Scheduled 1s) → Kafka "user.registered" 토픽
  → UserRegisteredEventConsumer → InitializeUserVillageService
  → character + space 테이블 저장
```

### 게스트 정책

- `GET /api/v1/village/characters/me`: 게스트 → `Character.defaultGuest()` 반환 (DB 저장 없음)
- `GET /api/v1/village/spaces/me`: 게스트 → `GuestNoPersonalSpaceException` (403)
- `POST /api/v1/chat/messages`: 게스트 → `GuestChatNotAllowedException` (403)
- STOMP `/app/chat/village`: 게스트 → `GuestChatNotAllowedException` (ChatMessageHandler에서 Principal 검사)
- STOMP CONNECT: 토큰 없이 연결 허용 (구독은 가능, 메시지 전송 시 403)

### 채팅 흐름 (마을 공개 채팅)

```text
[초기 상태]
V3 마이그레이션 → 마을 공개 채팅방 (id=1, type=PUBLIC) + NPC 참여자 고정 생성

[STOMP 경로 — 주 경로]
클라이언트 STOMP CONNECT (Authorization: Bearer {token})
  → StompAuthChannelInterceptor → JWT 파싱 → Principal 설정
클라이언트 → /app/chat/village (body만 전송)
  → ChatMessageHandler → SendMessageUseCase.Command(userId, publicChatRoomId, body)
  → getOrCreateParticipant() (첫 메시지 시 자동 참여, V4 UNIQUE 보호)
  → Message(유저) → Cassandra 저장 (message + user_message dual-write)
  → /topic/chat/village broadcast: MessageResponse(user) — 즉시 반환
  → [비동기] NpcReplyService.replyAsync()
    → 유저 메시지 임베딩 → pgvector 유사도 검색 → 맥락 주입
    → LLM 응답 생성 → Cassandra 저장
    → /topic/chat/village broadcast: MessageResponse(npc)
  → [3회 누적 시] Outbox → Kafka → 대화 요약 → pgvector 저장

[REST 경로 — fallback]
POST /api/v1/chat/messages {body: "..."}
  → 동일 UseCase 실행
  → SimpMessagingTemplate으로 /topic/chat/village broadcast (유저 메시지만)
  → REST 응답: {userMessage} (NPC 응답은 비동기 WebSocket)
```

### WebSocket 구조

- STOMP 엔드포인트: `/ws` (SockJS fallback)
- STOMP 인증: `StompAuthChannelInterceptor` — CONNECT 프레임 `Authorization` 헤더에서 JWT 추출
- 클라이언트 → 서버: `/app/chat/village` (고정)
- 서버 → 클라이언트: `/topic/chat/village` (Simple Broker, 고정)
- Phase 3: 인메모리 브로커. 스케일아웃 시 Redis Pub/Sub으로 교체 예정
- 설정 키: `village.public-chat-room-id`

### Spring Boot 4.x 주의사항
>
> 상세는 [learning/12](./learning/12-spring-boot-4x-traps.md) 참조.

- Kafka / Cassandra 자동구성: 스타터 없이 코어만 추가 시 `spring-boot-<기술>` 모듈도 함께 필요
- Cassandra 프로퍼티: `spring.cassandra.*` (3.x의 `spring.data.cassandra` 아님)
- Cassandra Testcontainers 모듈: `org.testcontainers:testcontainers-cassandra`
- Cassandra: keyspace는 앱이 만들지 않음. `CqlSession`으로 별도 생성 (테스트 static block)
- Jackson: `tools.jackson.*` 패키지 (3.x)
- JSONB 매핑: `@JdbcTypeCode(SqlTypes.JSON)` 필요

---

## 다음 할 것 — 프로덕션 로드맵

### 🔥 Week 7 스프린트 — Assetization (2026-04-20 ~ 04-26)

> **원칙: "솔루션이 아니라 증거로 말한다."**
> Week 7 블로그·README·영상은 부하 테스트 데이터가 전제다. 관측 → 부하 → 증거 → 블로그 순서.

**Week 7 과제**

- Task 0: 『일의 감각』 에세이 1,000자
- Task 1: 데이터 기반 기술 블로그 — 문제 → 증거(그래프/로그) → 대안 비교 → Before/After 4단 구조
- Task 2: README 리브랜딩 — 배너, 인프라 도식, 3분 데모 영상, 성능 그래프
- Task 3: 이력서 초안 (Problem-Action-Result)
- Task 4 (선택): Post-Mortem 리포트

**실행 순서**

| Step | 목표 | 산출물 | 상태 |
|------|------|--------|------|
| **A. CD 자동화** | main push → EC2 자동 반영 | `deploy/` + GHA workflow | ✅ 완료 (PR #15~#19) |
| **B. 관측 가능성** | Actuator + Micrometer → Prometheus → Grafana | 대시보드 (JVM·HTTP·GC·Threads·k6 메트릭) | ✅ 완료 (PR #21~#23) |
| **C. 부하 테스트 + 병목 식별** | k6 WebSocket VU 10~200 sweep | k6 summary + Grafana 10장 + Bottleneck 분석 | ✅ 완료 (`docs/reports/load-test-2026-04-22.md`) |
| **D. Task 3 제출 (Performance Report)** | Notion 페이지 | 표 + 증거 10장 + Bottleneck Analysis + Recommendations | 🔧 **작성 중** |
| **E. Task 1 기술 블로그** | Step C 서사 (Before/After 256MB→1GB) | Velog/Tistory | D 후속 |
| **F. Task 2·4 README + 영상 + 에세이 + 이력서** | Week 7 나머지 산출물 | — | E 후속 |
| (선택) G. Post-Mortem | Sweep 2의 GC Death Spiral을 독립 리포트로 | — | 자료 확보됨 |

#### 유력 병목 후보 (블로그 소재)

1. **NPC 응답 파이프라인** — 임베딩 → pgvector 검색 → LLM → broadcast (외부 호출 직렬화)
2. **WebSocket Simple Broker** — 단일 서버·인메모리, 동접 증가 시 1차 병목
3. **Cassandra dual-write** (message + user_message) — 쓰기 증폭
4. **Outbox @Scheduled 1s polling** — 요약 이벤트 지연 + DB 부하
5. **메시지 카운터 `ConcurrentHashMap`** — 서버 재시작 시 초기화

#### Step B·C·D 착수 전 결정 현황

- [x] 모니터링 스택 호스팅 위치 — **Dedicated Monitor EC2 (t3.small `gohyang-monitor`)** 확정 (2026-04-22). 근거는 [learning/40 §2](./learning/40-observability-stack-decisions.md#2-결정-1--모니터링-스택을-어디에-띄울까)
- [x] 부하 테스트 도구 — **k6** 확정 (2026-04-22). 근거는 [learning/40 §3](./learning/40-observability-stack-decisions.md#3-결정-2--부하-테스트-도구는-뭘로) + [learning/41](./learning/41-k6-load-testing-setup.md)
- [x] 부하 테스트 타겟 — **마을 공개 채팅 (NPC hardcoded로 일시 전환, OpenAI 호출 제외)** 확정 (2026-04-22)
- [x] 블로그 플랫폼 — **개인 블로그** 확정
- [ ] Post-Mortem 수행 여부 — 미정 (Step C 실행 후 장애 재현 가능 여부 보고 판단)

### 병행 가능한 짜투리 작업

| 작업 | 우선순위 |
|------|--------|
| hook `.claude/hooks/stop-handover-check.js` 개선 (커밋 단위로 검사 · 특정 경로 제외 · 세션당 1회) | 중 |
| learning/42 §6 PromQL 블록 갱신 — Heap `sum()` 합산, `bytes(IEC)` unit, `k6_*_p99` 실제 메트릭 이름, Row 3그룹 레이아웃 추가 | 중 |
| 포트 22 Security Group 제거 (SSM 전용) — AWS Console 직접 | 낮음 |
| learning/37 CD 구축기 실측치 업데이트 | 낮음 |
| EC2 잔존 파일 정리 (application-prod.yml 혹시 남으면) | 낮음 |
| ParseTokenPort 위치 이동 (global/security → port) | 별도 PR |
| Next PR (선택): `WebSocketConfig` broker channel pool `corePoolSize=16 maxPoolSize=32` 명시 — VU 300+ 까지 latency 유지 | 중 |
| Next PR (선택): STOMP Simple Broker → Redis Pub/Sub 전환 — VU 1000+ + 멀티 인스턴스 대비 | 낮음 (Post-Week 7) |

### 번외 — MVP 피드백 대응 (부하 테스트와 별개)

> 상세: `docs/feedback/README.md`

- [ ] F-1: 모바일 터치 이동 지원
- [ ] F-2: 채팅 포커스 이탈 시 UI 버그
- [ ] F-3: 맥북 IME 마지막 단어 반복 입력
- [ ] F-5: 회원가입 고도화 (닉네임 + 이름)

### Phase 4 — Economy (미착수)

포인트 획득 → 아이템 구매 → 인벤토리. 낙관적 락·멱등성 직접 설계 연습.
취업 준비 코드 분석·Phase 4 구현은 Week 7 종료 후 고려.

---

## 현재 기술 스택 버전

| 항목 | 버전 |
|------|------|
| Spring Boot | 4.0.3 |
| Java | 21 |
| spring-kafka | 4.0.3 |
| Testcontainers | 2.x (Spring BOM 관리) |
| Cucumber | 7.34.2 |
| JJWT | 0.12.6 |
| Flyway | Spring BOM 관리 |
| Node.js | v24.12.0 |
| Next.js | 16.2.2 |
| React | 19.2.4 |
| Phaser | 3.90.0 |

---

## 패키지 구조 현황

```text
com.maeum.gohyang/
├── global/
│   ├── alert/
│   ├── config/
│   │   ├── WebSocketConfig.java
│   │   └── StompAuthChannelInterceptor.java  ← STOMP CONNECT JWT 인증
│   ├── error/
│   ├── infra/
│   │   ├── outbox/
│   │   └── idempotency/
│   └── security/
├── identity/
│   ├── domain/          ← User, LocalAuthCredentials (순수 도메인만)
│   ├── error/           ← IdentityErrorCode, DuplicateEmailException
│   ├── application/
│   └── adapter/
├── village/
│   ├── domain/          ← Character, Space, SpaceTheme (순수 도메인만)
│   ├── error/           ← VillageErrorCode, *Exception 3종
│   ├── application/
│   └── adapter/
│       └── in/websocket/ ← PositionHandler, PositionDisconnectListener, PresenceNotifier, TypingHandler
└── communication/
    ├── domain/          ← ChatRoom, Participant, Message, MentionParser, enum 5종
    ├── error/           ← CommunicationErrorCode, *Exception 4종
    ├── application/
    │   ├── port/in/ (UseCase 4종 — SendMessageUseCase, LoadChatHistoryUseCase, LoadMentionablesUseCase + 레거시 CreateChatRoomUseCase)
    │   ├── port/out/ (12종: Save/Load/Generate + Broadcast/Publish/Summarize)
    │   └── service/ (SendMessageService, NpcReplyService, LoadChatHistoryService, LoadMentionablesService)
    └── adapter/
        ├── in/
        │   ├── web/ (ChatRoomController POST /api/v1/chat/messages)
        │   ├── websocket/ (ChatMessageHandler /app/chat/village)
        │   └── messaging/ (ConversationSummaryEventConsumer)
        └── out/
            ├── persistence/ (JPA 4종 + Cassandra 6종 + ConversationMemory/ConversationSummaryOutbox)
            └── npc/ (Openai/Ollama/Hardcoded Adapter 3x3 + OpenAiProperties/OllamaProperties)
```

---

## TestAdapter 구조

```text
HealthCheckSteps / IdentitySteps / VillageSteps / CommunicationSteps  ← 비즈니스 언어만 안다
    ↓
ActuatorTestAdapter / AuthTestAdapter / VillageTestAdapter / ChatTestAdapter  ← URL, 폴링 로직
    ↓
TestAdapter              ← RestClient GET/POST, 인증 헤더
    ↓
ScenarioContext          ← lastResponse, currentAccessToken, currentEmail, currentChatRoomId
```

---

## 참고 문서 위치

| 필요할 때 | 파일 |
|-----------|------|
| **왜 그런 결정을 했는지 (학습 노트 전체)** | [docs/learning/INDEX.md](./learning/INDEX.md) |
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 패키지 구조 상세 | `docs/architecture/package-structure.md` |
| ERD | `docs/architecture/erd.md` |
| 의사결정 기록 (ADR) | `docs/architecture/decisions/` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| Git 전략 | `docs/conventions/git.md` |
| REST API 명세 | `docs/specs/api.md` + `docs/specs/api/` |
| WebSocket 명세 | `docs/specs/websocket.md` |
| Kafka 이벤트 명세 | `docs/specs/event.md` |
| AI Native 개발 지식 베이스 | `docs/knowledge/INDEX.md` |
| 인프라 트러블슈팅 | `docs/knowledge/infra/` |
| Wiki (정규 지식) | `docs/wiki/INDEX.md` |
| MVP 피드백 목록 | `docs/feedback/README.md` |
