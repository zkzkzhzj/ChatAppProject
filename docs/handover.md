# 작업 인수인계 — 마음의 고향

> 새 Claude 세션을 열었을 때 이 파일을 먼저 읽어라.
>
> **이 문서는 전체 완료 상태와 핵심 설계 결정만 담는다.**
> **현재 진행 중인 작업 트랙은 `docs/handover/INDEX.md`에서 자기 트랙을 찾아 그 sub 파일을 읽는다.**
>
> - 상세 맥락·결정 이유: `docs/learning/INDEX.md` (주제별)
> - 진행 중인 트랙: `docs/handover/INDEX.md` (트랙별)
> - 병행 작업 충돌 회피: `docs/conventions/parallel-work.md`

---

## 1. 활성 트랙 인덱스

| 트랙 ID | 파일 | 상태 | 이슈 |
|---------|------|------|------|
| `personalization-removal-librarian-rag` | [track-personalization-removal-librarian-rag.md](./handover/track-personalization-removal-librarian-rag.md) | 진행 중 | #151 |

**최근 종료 트랙** (시간 역순):

- `realtime-infra-reset` (Issue #127, PR #128 + 후속 안정화 #132~#138, 2026-06-11) — 기존 `ws-redis` Step 3~7 계획 폐기 후 STOMP 운영 경로와 `/ws/v2` raw WS + Redis Pub/Sub 경로 감사·재설계. Step 0~6: Audit → Redis/V2 테스트 보강 → 프론트 클라이언트 책임 분리 (`realtimeAuth`/`stompRealtimeSubscriptions`) → raw WS parity (disconnect LEAVE broadcast 등) → Controlled Cutover (`NEXT_PUBLIC_REALTIME_TRANSPORT=raw` 옵트인 facade) → **ADR-010: STOMP 즉시 제거 X, 제거 조건 9개 명시** → k6 raw V2 하네스 준비 (실측 미실행). 잔여 리스크 (메일 알림·NPC V2 broadcast·reverse proxy 검증·k6 실측) 는 후속 트랙 의제. learning 87
- `s3-media` (Issue #89, PR #96·#102·#103 + 트랙 종료 docs PR, 2026-05-20) — 정적 자산 외부 호스팅 인프라 (S3 + CloudFront + OAC). 운영 환경음 무음 해결 (Step 2 머지 시점 정상화) + CloudFront edge 캐싱·DDoS Layer 3-4 Shield Standard·OAC confused deputy 방어. **무중단 마이그 4단계** 절차로 운영 끊김 0. **Step 3 (CD 자동 sync) + Step 4 (BGM 분리 매니저) 폐기** — mp3 git 추적 X 결로 trigger 불가 + BGM = 환경음 4종 사용자 의도 확정. spec.decisions 6축 미리 박았으나 트랙 진행 중 D6 폐기·D7 신설 정정. learning 51·52
- `ai-native-2026-05-upgrade` (Issue #93, 트랙 머지 PR — push 후 갱신, 2026-05-17) — sweep v1 (2026-05-16) + sweep v2 (2026-05-17, MCP / AI Eval / AGENTS.md / Anthropic 5월 / k6 LMOps / 경쟁 환경) 통합 매트릭스 직접 적용. 즉시 도입 3건 (CLAUDE.md compaction 60% + Critical Rules `<rule id=N>` XML 태그 + CodeRabbit Claude Code 플러그인 가이드/1주 시범) + 보안 baseline 1건 (MCP 5규칙). 조건부 도입 9건은 후속 트랙 (`skills-progressive-disclosure` · `anthropic-outcomes-trial` · `npc-evaluator-lmops` 보강) 분리. 메타 트랙 (1 PR · 4 commit). learning 83
- `ctx-refresh-post-village-3d` (Issue #90, 트랙 머지 PR #91, 2026-05-16) — village-3d 머지 후 컨텍스트 노화 CRITICAL 2건 + WARNING 3건 일괄 정리. 3개 서브에이전트 (research + context-health + full-review) 동시 출격 결과 종합 → 3 묶음 (ⓐ 컨텍스트 / ⓑ 운영 P1 / ⓒ AI Native 진화) 분리 → ⓐ 4 step + 메타. CLAUDE.md "2D · Phaser" 정정 + wiki Phaser 3페이지 노화 경고 + knowledge INDEX/changelog 정합 + agents frontmatter / ARCHIVED 표기 + 트랙 파일 보존 정책 현실화. learning 79
- `village-3d` (PR #68·#69·#78·#79·#84·#85, 트랙 머지 PR #86, 2026-05-13) — Three.js 3D 마을 + 멀티유저 위치 동기화 + 환경음(D6 v) + 채팅 UI 재설계(머리 위 3D Sprite 말풍선 + 인라인 입력 + 우측 드로우어 + tap-to-move 모바일). 안식처 가드레일 6축 (D11) 코드 강제. **종료 사유**: 사용자 결정 — 본질 가치 1축(환경음) + 멀티유저 + 새 채팅 UI까지 박은 결로 운영 머지 + 점검 시간. Step 3·4·5·6·7 (캐릭터 모델·도서관·NPC·편지·인벤토리)은 후속 트랙으로 분리. learning 74·78
- `village-design-mvp` (PR #57·#64, 2026-05-10, Step 1 만 머지) — 마을 디자인 MVP (Stardew 결 픽셀 + Alone Together 차별점). **종료 사유: D3 재검토 트리거 (큐레이션 자산만으로 디자인 영혼 표현 한계) 도달 + 사용자 결 명시 박음 (시안 1·2·3 거부 누적 → 3D 시각 욕심 결로 정정).** D1 안식처 · D2 Alone Together · D6 4축 본질 가치는 새 트랙 `village-3d` 로 승계. D3 (Stardew 픽셀) · D4 (큐레이션 자산) 폐기. learning 69·70·71·72
- `harness-spec-driven` (PR #47, 2026-04-30) — spec-driven 4층 분리 모델 (Issue/Spec/Track/Step) + 자동 fix-loop + Comprehension Gate (13 카테고리/Tier A·B·C) + wiki 활용 강화 4종 + Dependabot 도입 (dependency-tracker-agent 대체). learning 66·67·68
- `infra-tls-hardening` (PR #43, 2026-04-28) — Cloudflare SSL Flexible→Full(strict), Origin CA, HSTS, 보안그룹 prefix list, nginx 표준 구조 마이그. learning 65
- STOMP reconnect 핫픽스 (PR #41, 2026-04-28) — 멤버 토큰 만료 시 5초 무한 reconnect 차단. learning 60
- `ws-redis` Step 2 (PR #26, 2026-04-27) — raw WS + Redis Pub/Sub 백엔드. 토폴로지 ③ 결정. learning 44·45·46·53·59
- `ghost-session` (PR #36 · #37, 2026-04-27) — presence cleanup 진단 + 게스트 토큰 stale fix 5종. learning 54
- `ui-mvp-feedback` (PR #27, 2026-04-26) — F-1 모바일 터치 + F-2 typing cleanup + F-3 IME 가드. learning 49·50

**다음 후보 트랙** (착수 시 사용자 결정):

- `village-3d-step3-character-model` (예약) — Quaternius Ultimate Modular Men 결로 캐릭터 모델 교체. 박스 placeholder → 4방향 walk 애니메이션. 자산 라이선스 명시.
- `village-3d-step4-library` (예약) — 도서관 인테리어 + 글 작성·조회·댓글 첫 시안 + AI 추천. 백엔드 confession·comment 도메인 신규.
- `token-auto-renewal` (Issue #38, **closed — 보류 코멘트 보존**) — 결정 게이트 통과 (A 도메인 / 단계 분할), 구현계획서 §6 `track-token-auto-renewal.md` 보존. **재차 보류 사유**: Redis 저장소 5패턴 비교 + 블로그 포스팅까지 깊이 가져갈 가치 → UI 트랙 우선. 재개 시 Issue #38 reopen + Step 0 (Redis 5패턴 학습노트) 선행 검토
- `npc-evaluator-lmops` — NPC 응답 evaluator + prompt 버전 관리 + LLM 비용 추적 + 회귀 detector. 사전 ADR: [learning 68](./learning/68-npc-service-differentiator-adr.md) §3·§4. `harness-spec-driven` 머지 후 `/spec-new` 첫 사용자로 dry-run 겸용
- `ai-observability` — 분산 trace + LLM 메트릭 (응답시간/토큰/비용) Grafana dashboard. `npc-evaluator-lmops` 와 병행 가능
- `realtime-raw-ws-cutover` (후보) — ADR-010 의 STOMP 제거 조건 충족 작업: 메일 알림 대체 결정 + NPC 응답 broadcast application port 재설계 + `/ws/v2` reverse proxy 검증 + dev/staging `NEXT_PUBLIC_REALTIME_TRANSPORT=raw` 수동 검증 + k6 raw V2 실측 (`loadtest/raw-v2-mixed.js`). (구 `ws-redis` Step 3~7 은 2026-06-06 폐기 — `realtime-infra-reset` 트랙으로 대체됨)
- `multi-session-policy` — 동일 userId 다중 세션 (대체/거부/병행)
- `s3-media` — S3 도입 (사전 결정 필요)

> 새 트랙 시작 시 `docs/handover/INDEX.md`의 "트랙 시작 절차" 따른다. 메인 `handover.md`는 트랙 머지 PR 안에서만 갱신.

---

## 2. 전체 완료 요약

Phase 0·1·2·3·5 구현 → AWS 배포 (ghworld.co) → CD 자동화 → 학습노트 정리까지 완료. 현재 issue #151에서 저장형 개인화와 수익화 저장 모델을 제거하고 Confession/Library/private librarian RAG 중심으로 재정렬 중이다.

| 구분 | 범위 | 주요 PR | 상세 (learning) |
|------|------|---------|-----------------|
| Phase 0 | Foundation (Flyway, DDL 전략) | — | — |
| Phase 1 | Identity (회원가입, 로그인, GUEST 토큰) | PR #1 | [08](./learning/08-phase1-layer-patterns.md) |
| Phase 2 | Village 초기 모델 (현재 issue #151로 저장형 개인화 제거 중) | PR #7 | [13](./learning/13-global-alert-port-pattern.md) |
| Phase 3 | Communication (마을 공개 채팅) | PR #7 | [15](./learning/15-websocket-stomp-deep-dive.md) · [21](./learning/21-village-public-chat-architecture.md) · [23](./learning/23-chatroom-structure-space-equals-room.md) · [24](./learning/24-stomp-websocket-jwt-channel-interceptor.md) · [25](./learning/25-batch-broadcast-multiuser-message-attribution.md) |
| Phase 5 | AI NPC (historical, removed from general communication chat) | PR #8 · #13 | [22](./learning/22-ollama-local-llm-spring-integration.md) · [28](./learning/28-llm-model-selection-and-production-strategy.md) · [29](./learning/29-vector-embedding-pgvector-semantic-search.md) · [30](./learning/30-jpa-pgvector-type-mapping.md) · [31](./learning/31-kafka-idempotency-key-design.md) · [33](./learning/33-ai-agent-evaluation-methodology.md) · [36](./learning/36-npc-conversation-engineering-patterns.md) |
| 실시간 공유 | 위치·타이핑·일반 채팅 | PR #11 | [26](./learning/26-phaser-html-keyboard-focus-conflict.md) |
| 프론트 UI | Tailwind v4 디자인 시스템 + Phaser 월드 | PR #9 | [32](./learning/32-web-2d-game-engine-comparison.md) · [34](./learning/34-react-nextjs-production-code-patterns.md) |
| AWS 배포 | EC2 서울, nginx + Cloudflare, ghworld.co | — | [35](./learning/35-aws-ec2-first-deployment.md) |
| CI/DX | Checkstyle + Error Prone + ArchUnit + CodeRabbit | — | [18](./learning/18-java-static-analysis-stack.md) · [20](./learning/20-frontend-eslint-convention.md) · ADR [008](./architecture/decisions/008-ci-dx-tool-stack.md) |
| CD 자동화 | GHCR + SSM + OIDC (PR #15~#19) | PR #15~#19 | [37](./learning/37-cd-pipeline-design.md) · [38](./learning/38-env-var-config-migration.md) · [39](./learning/39-nextjs-docker-healthcheck-ipv6-trap.md) |
| 관측성 스택 | Prometheus + Grafana (monitor EC2), Micrometer histogram, k6 RW | PR #21~#23 | [40](./learning/40-observability-stack-decisions.md) · [42](./learning/42-grafana-jvm-dashboard-reading.md) |
| 부하 테스트 | k6 WebSocket+STOMP, Plateau Sweep, Breaking Point VU ~200 확정 | PR #23 | [41](./learning/41-k6-load-testing-setup.md) + `docs/reports/load-test-2026-04-22.md` |
| 데이터 기반 블로그 초안 | 256MB→1GB → Simple Broker 병목 서사 | — | [43](./learning/43-load-test-breaking-point-story.md) |
| RabbitMQ vs raw WS 트레이드오프 | learning/44 (대안 분석), learning/45 (B안 설계서) | — | [44](./learning/44-spring-stomp-external-broker-choice.md) · [45](./learning/45-websocket-redis-pubsub-redesign.md) |
| MVP 피드백 1차 | F-1 모바일 터치 이동 + F-2 typing 말풍선 cleanup + F-3 한글 IME 가드 | PR #27 | [49](./learning/49-react-input-ime-handling.md) · [50](./learning/50-mobile-touch-movement.md) |
| ws-redis Step 2 | raw WS + Redis Pub/Sub 백엔드 (토폴로지 ③ 결정) | PR #26 | [44](./learning/44-spring-stomp-external-broker-choice.md) · [45](./learning/45-websocket-redis-pubsub-redesign.md) · [46](./learning/46-village-scaling-decisions.md) · [53](./learning/53-hexagonal-outbound-port-caller-rule.md) · [59](./learning/59-ws-server-separation-vs-monolith.md) |
| ghost-session | presence cleanup 진단 + 게스트 토큰 stale fix 5종 (#28 본인 따라다니는 분신 — 게스트 토큰 재발급 시 자기인식 stale + tokenBridge 도입 + 게스트 만료 24h 분리) | PR #36 · #37 | [54](./learning/54-presence-cleanup-ghost-character-diagnosis.md) |
| STOMP reconnect 핫픽스 | 멤버 토큰 만료 시 5초 무한 reconnect 차단 — `onError` `return` 만으로는 라이브러리 자동 reconnect 못 막아 `Client.deactivate()` 명시 필요 | PR #41 | [60](./learning/60-stomp-reconnect-layered-conflict.md) |
| infra-tls-hardening | Cloudflare SSL Flexible→Full(strict), Cloudflare Origin CA + EC2 nginx 인증서, HSTS 6mo, 보안그룹 80/443 → Cloudflare IP prefix list, nginx.conf 비표준 → sites-enabled 표준 구조 마이그 | PR #43 | [65](./learning/65-cookie-security-attributes-deep-dive.md) |
| harness-spec-driven | AI Native 하네스 spec-driven 4층 (Issue/Spec/Track/Step) + 자동 fix-loop (테스트 3회·리뷰 2회·PR 게이트 2회) + Comprehension Gate (13 카테고리/Tier A·B·C) + wiki 활용 강화 4종 + Dependabot (dependency-tracker-agent 대체) + 슬래시 스킬 4종 (`/spec-new`·`/track-start`·`/step-start`·`/track-end`) | PR #47 | [66](./learning/66-spec-driven-fix-loop-comprehension-gate.md) · [67](./learning/67-wiki-policy-rejection-reversal.md) · [68](./learning/68-npc-service-differentiator-adr.md) |
| village-3d | Three.js 3D 마을 + 멀티유저 위치 동기화 + 환경음 (Howler.js 4종) + 채팅 UI 재설계 (3D Sprite 말풍선·인라인 입력·우측 드로우어·tap-to-move 모바일). 안식처 가드레일 6축 (D11) 코드 강제. Step 1 (PoC) + Step 1.5 (멀티유저) + Step 1.7 (채팅) + Step 2 (환경음) 머지. Step 3~7은 후속 트랙으로 분리 (캐릭터 모델·도서관·NPC·편지·인벤토리) | PR #68 · #69 · #78 · #79 · #84 · #85 | [72](./learning/72-phaser-to-threejs-pivot-decision.md) · [74](./learning/74-3d-chat-ui-redesign-decisions.md) · [78](./learning/78-next-three-howler-dev-memory-diagnosis.md) |
| ctx-refresh | village-3d 머지 후 컨텍스트 노화 일괄 정리 — 3개 서브에이전트 (research + context-health + full-review) 동시 출격 → CLAUDE.md "2D · Phaser" 정정 + wiki Phaser 3페이지 노화 경고 + knowledge INDEX/changelog 정합 + 3d-game-chat-ui realtime 이동 + agents frontmatter/ARCHIVED + 트랙 파일 보존 정책 현실화. lint config (MD032/MD034/MD040) 한국어 docs 친화 + pre-commit hook auto-fix 버그 처치 | (트랙 머지 PR #91) | [79](./learning/79-context-refresh-cycle-meta-learning.md) |
| ai-native-2026-05-upgrade | AI Native 하네스 진화 — sweep v1 (MD vs HTML · Agent OS · Skills · Claude Code 신기능) + sweep v2 (MCP · AI Eval · AGENTS.md · Anthropic 5월 · k6 LMOps · 경쟁 환경) 통합 매트릭스 직접 적용. 즉시 도입 3건 (CLAUDE.md compaction 60% + Critical Rules `<rule id=N>` XML 태그 + CodeRabbit 플러그인 가이드 + 1주 시범) + 보안 baseline 1건 (MCP 5규칙). 조건부 도입 9건은 후속 트랙 분리. 메타 4 commit | (트랙 머지 PR #94) | [83](./learning/83-ai-native-2026-05-upgrade-trial.md) |
| village-design-mvp (Step 1 만 머지) | 자산 토대 (Kenney CC0 + LimeZu CC BY 4.0 LICENSE.md) + Welcome 모션 (React 페이드인) + 디자인 시스템 점검 — 트랙 자체는 종료 (큐레이션 자산 한계 인정 → `village-3d` 승계). Welcome 모션 + LICENSE 인프라만 보존, 마을 시안·Cozy Pack 자산·dev/slices 페이지·Step 2 미커밋 코드 폐기 | PR #57·#64 | [69](./learning/69-asset-model-curated-vs-ai-generation.md) · [70](./learning/70-village-mood-aesthetic-decision.md) · [71](./learning/71-design-tone-from-self-interview.md) · [72](./learning/72-phaser-to-threejs-pivot-decision.md) |
| realtime-infra-reset | STOMP 운영 + `/ws/v2` raw WS + Redis Pub/Sub 감사·재설계 — `ws-redis` Step 3~7 폐기 후 재출발. 프론트 realtime facade (STOMP 기본 / raw 옵트인) + raw WS parity + ADR-010 (STOMP 제거 조건 9개) + k6 raw V2 하네스 | PR #128 + #132~#138 | [87](./learning/87-stomp-retention-raw-ws-cutover-conditions.md) · ADR [010](./architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md) |

> 학습 노트 전체 색인: [docs/learning/INDEX.md](./learning/INDEX.md)

---

## 3. 핵심 설계 결정 (현재 활용 중 — 유지)

### 이벤트 흐름

```text
RegisterUserService
  → outbox_event 테이블 저장 (같은 트랜잭션)
  → OutboxKafkaRelay (@Scheduled 1s) → Kafka "user.registered" 토픽
  → 현재 issue #151 이후 저장형 마을 record 생성 없음
```

### 게스트 정책

- `POST /api/v1/chat/messages`: 게스트 → `GuestChatNotAllowedException` (403)
- STOMP `/app/chat/village`: 게스트 → `GuestChatNotAllowedException` (ChatMessageHandler에서 Principal 검사)
- STOMP CONNECT: 토큰 없이 연결 허용 (구독은 가능, 메시지 전송 시 403)

### 채팅 흐름 (마을 공개 채팅 — 현재 운영 구조)

```text
[초기 상태]
V9 마이그레이션 이후 → 마을 공개 채팅방 (id=1, type=PUBLIC), 일반 채팅 NPC 참여자 제거

[STOMP 경로 — 주 경로]
클라이언트 STOMP CONNECT (Authorization: Bearer {token})
  → StompAuthChannelInterceptor → JWT 파싱 → Principal 설정
클라이언트 → /app/chat/village (body만 전송)
  → ChatMessageHandler → SendMessageUseCase.Command(userId, publicChatRoomId, body)
  → getOrCreateParticipant() (첫 메시지 시 자동 참여, V4 UNIQUE 보호)
  → Message(유저) → Cassandra 저장 (message + user_message dual-write)
  → /topic/chat/village broadcast: MessageResponse(user) — 즉시 반환

[REST 경로 — fallback]
POST /api/v1/chat/messages {body: "..."}
  → 동일 UseCase 실행
  → SimpMessagingTemplate으로 /topic/chat/village broadcast (유저 메시지만)
  → REST 응답: {userMessage}
```

> ⚠️ 2026-06-11 기준 [ADR-010](./architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md): **STOMP `/ws`가 운영 기본 경로로 유지**된다. raw WS `/ws/v2`는 `NEXT_PUBLIC_REALTIME_TRANSPORT=raw` 옵트인으로만 선택 가능. STOMP 제거는 ADR-010 의 조건 9개 (메일 알림 대체·NPC broadcast 대체·reverse proxy 검증 등) 충족 시 재검토.

### WebSocket 구조 (현재)

- STOMP endpoint: `/ws` (SockJS fallback) — **운영 기본**
- STOMP 인증: `StompAuthChannelInterceptor` — CONNECT 프레임 `Authorization` 헤더에서 JWT 추출
- 클라이언트 → 서버: `/app/chat/village` (고정)
- 서버 → 클라이언트: `/topic/chat/village` (Simple Broker, 고정)
- 설정 키: `village.public-chat-room-id`
- raw WS 후보 경로: `/ws/v2` (JSON envelope — SUBSCRIBE/PUBLISH/POSITION/TYPING/UNSUBSCRIBE, Redis Pub/Sub fan-out, `?access_token=` 인증). 명세: `docs/specs/websocket-raw-v2-draft.md`
- 프론트 transport 선택: `frontend/src/lib/websocket/realtimeClient.ts` facade — env 미지정 시 STOMP

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

## 4. 다음 할 것 — 프로덕션 로드맵

### 진행 중 트랙

- `personalization-removal-librarian-rag` 진행 중. 저장형 개인화/Economy 제거와 Confession/Library/private librarian RAG 중심 문서·백엔드 정합화가 현재 우선이다.
- 다음 착수 후보는 §1의 `다음 후보 트랙` 목록을 기준으로 사용자 승인 후 시작 (`realtime-raw-ws-cutover`, `token-auto-renewal`, village-3d 후속 Step 트랙, `multi-session-policy`).

### Week 7 잔여

| Step | 목표 | 산출물 | 상태 |
|------|------|--------|------|
| **D. Task 3 제출 (Performance Report)** | Notion 페이지 | 표 + 증거 10장 + Bottleneck Analysis + Recommendations | 🔧 작성 중 |
| **E. Task 1 기술 블로그** | Step C 서사 (Before/After) | Velog/Tistory | **연기** — `ws-redis` 트랙 완주 후 진짜 Before/After로 재작성. 43번은 "진단 기록"으로 유지 |
| **F. Task 2·4 README + 영상 + 에세이 + 이력서** | Week 7 나머지 산출물 | — | E 후속 |
| (선택) G. Post-Mortem | Sweep 2의 GC Death Spiral을 독립 리포트로 | — | 자료 확보됨 |

### 병행 가능한 짜투리 작업

| 작업 | 우선순위 |
|------|--------|
| hook `.claude/hooks/stop-handover-check.js` 개선 (커밋 단위로 검사 · 특정 경로 제외 · 세션당 1회 · 트랙 분리 반영) | 중 |
| learning/42 §6 PromQL 블록 갱신 — Heap `sum()` 합산, `bytes(IEC)` unit, `k6_*_p99` 실제 메트릭 이름, Row 3그룹 레이아웃 추가 | 중 |
| 포트 22 Security Group 제거 (SSM 전용) — AWS Console 직접 | 낮음 |
| learning/37 CD 구축기 실측치 업데이트 | 낮음 |
| EC2 잔존 파일 정리 (application-prod.yml 혹시 남으면) | 낮음 |
| ParseTokenPort 위치 이동 (global/security → port) | 별도 PR |

### 번외 — MVP 피드백 대응

> 상세: `docs/feedback/README.md`

- [x] F-1: 모바일 터치 이동 지원 (PR #27)
- [x] F-2: 떠난 유저 typing 말풍선 cleanup (PR #27 — 원 피드백 표 설명 정정됨)
- [x] F-3: 맥북 IME 마지막 단어 반복 입력 (PR #27, macOS 실기 미검증 — 원 제공자 재검증 대기)
- [ ] F-5: 회원가입 고도화 (닉네임 + 이름) — 별도 트랙 후보

### 개인화/수익화 저장 모델

issue #151 기준으로 저장형 개인 공간, 개인 캐릭터, 꾸미기, 수익화 저장 모델은 현재 제품 범위에서 제거한다.
3D 마을/도서관은 런타임 경험으로 유지하고, 재방문 중심은 고백/편지/개인별 사서 RAG로 둔다.

### 보류 — 마을 운영 모델 결정 (B안 완주 후)

- 단일 마을 + Hard Cap 패턴(현재 결론) vs ZEP처럼 유저 직접 마을 생성
- 도메인 핵심 가치("안식처")와 충돌 여부 검토 필요
- 채팅 인프라(`ws-redis` 트랙)에는 영향 없음

---

## 5. 현재 기술 스택 버전

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
| Next.js | 16.2.6 |
| React | 19.2.6 |
| Three.js | 0.184.x |
| Howler.js | 2.2.4 |

---

## 6. 패키지 구조 현황

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
│   ├── domain/          ← 런타임 마을/presence 경계 (저장형 개인화 제거 중)
│   ├── error/           ← VillageErrorCode
│   ├── application/
│   └── adapter/
│       └── in/websocket/ ← PositionHandler, PositionDisconnectListener, PresenceNotifier, TypingHandler
└── communication/
    ├── domain/          ← ChatRoom, Participant, Message, MentionParser, enum 5종
    ├── error/           ← CommunicationErrorCode, *Exception 4종
    ├── application/
    │   ├── port/in/ (UseCase 4종 — SendMessageUseCase, LoadChatHistoryUseCase, LoadMentionablesUseCase + 레거시 CreateChatRoomUseCase)
    │   ├── port/out/ (12종: Save/Load/Generate + Broadcast/Publish/Summarize)
    │   └── service/ (SendMessageService, LoadChatHistoryService)
    └── adapter/
        ├── in/
        │   ├── web/ (ChatRoomController POST /api/v1/chat/messages)
        │   ├── websocket/ (ChatMessageHandler /app/chat/village)
        │   │   └── v2/ (ChatWebSocketHandler /ws/v2 — raw WS 후보 경로, RoomSubscriptionRegistry)
        │   └── messaging/ (ConversationSummaryEventConsumer)
        └── out/
            ├── persistence/ (JPA 4종 + Cassandra 6종 + ConversationMemory/ConversationSummaryOutbox)
            └── messaging/
                └── redis/ (RedisChatRelay — /ws/v2 용 Redis Pub/Sub fan-out)
```

---

## 7. TestAdapter 구조

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

## 8. 참고 문서 위치

| 필요할 때 | 파일 |
|-----------|------|
| **진행 중인 작업 트랙** | [docs/handover/INDEX.md](./handover/INDEX.md) |
| **왜 그런 결정을 했는지 (학습 노트 전체)** | [docs/learning/INDEX.md](./learning/INDEX.md) |
| 학습 노트 번호 예약 | [docs/learning/RESERVED.md](./learning/RESERVED.md) |
| 병행 작업 충돌 회피 정책 | [docs/conventions/parallel-work.md](./conventions/parallel-work.md) |
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
