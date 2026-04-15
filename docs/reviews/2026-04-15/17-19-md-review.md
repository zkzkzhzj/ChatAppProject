# MD 정합성 리뷰 -- 2026-04-15 17:19

## 대상
- 종류: 문서 정합성 + 코드<->명세 교차검증
- 범위: handover.md, phases.md, erd.md, event.md, package-structure.md, API 명세, WebSocket 명세, Wiki

---

## 1. handover.md -- 현재 상태 정합성

### [WARNING] handover.md:9 -- PR #8 머지 완료가 "완료된 것"과 "현재 진행 중" 양쪽에 기술됨
- "현재 진행 중" 섹션(line 320)에 "PR #8 레이스 컨디션 수정 + 리뷰 대응 (완료)" 표기가 남아있다
- 이미 머지 완료된 PR은 "완료된 것" 섹션으로 이동하거나, "현재 진행 중"에서 제거해야 한다
- 의사결정 오도 위험: 새 세션에서 아직 진행 중인 작업으로 오인할 수 있다

### [WARNING] handover.md:73 -- Port (in) 목록에 LoadChatHistoryUseCase 누락
- 실제 코드에 `LoadChatHistoryUseCase`, `LoadChatHistoryService`가 존재하고 ChatRoomController에서 사용 중
- handover.md의 Communication Phase 3 Port(in) 목록에 `SendMessageUseCase`만 기술됨

### [INFO] handover.md:139 -- "uncommitted" 표기 정리 필요
- "4/13 -- 백엔드 마을 공개 채팅 아키텍처 전환" 과 "프론트엔드 채팅 UI 구현"이 (uncommitted)으로 표시되어 있으나, 이 코드는 이미 PR #7로 머지되어 main에 반영된 상태
- 실제 git status는 clean

### LGTM -- 패키지 구조 현황
- handover.md에 기술된 패키지 구조(identity, village, communication, economy, safety, notification, global)가 실제 코드와 일치

---

## 2. API 명세 -- 실제 엔드포인트 일치

### [CRITICAL] docs/specs/api/auth.md -- POST /api/v1/auth/login 엔드포인트 누락
- 실제 코드: `AuthController.java:34` -- `@PostMapping("/login")` 존재
- `LoginUseCase`, `LoginRequest` (email, password), `AuthResponse` DTO 구현 완료
- 에러코드 `IDENTITY_002` ("이메일 또는 비밀번호가 올바르지 않습니다", 401) 존재
- API 명세 문서(auth.md)에 login 엔드포인트가 전혀 기술되지 않음
- 프론트엔드에서 이미 login fallback을 사용하고 있어 문서 누락이 실질적 영향을 미침

### [CRITICAL] docs/specs/api/overview.md:51 -- 에러코드 목록에 IDENTITY_002, COMM_004 누락
- `IDENTITY_002` (401, 로그인 실패) -- 코드에 존재하나 문서 누락
- `COMM_004` (400, 메시지 body 검증 실패 InvalidMessageBodyException) -- 코드에 존재하나 문서 누락

### [WARNING] docs/specs/api/overview.md:13 -- 토큰 발급 경로에 /login 누락
- "POST /api/v1/auth/register 또는 POST /api/v1/auth/guest로 발급받는다" 라고만 기술
- 실제로 POST /api/v1/auth/login으로도 토큰 발급 가능

### LGTM -- Communication API 명세
- POST /api/v1/chat/messages, GET /api/v1/chat/messages 모두 실제 코드와 일치
- Request/Response DTO 필드, 타입, 제약조건 정확

### LGTM -- Village API 명세
- GET /api/v1/village/characters/me, GET /api/v1/village/spaces/me 모두 실제 코드와 일치

---

## 3. ERD -- 실제 마이그레이션 일치

### LGTM -- 전체 테이블 구조
- erd.md의 모든 테이블 정의가 V1__initial_schema.sql과 일치
- V5, V6 마이그레이션의 npc_conversation_memory 테이블 + embedding 컬럼이 erd.md 7절에 정확히 반영됨
- 컬럼 타입, 제약조건, 인덱스 모두 일치

### [INFO] erd.md:134 -- V1 마이그레이션의 chat_room.type 초기값 차이
- V1에서는 `DIRECT / GROUP / NPC`로 생성했고 V3에서 `PUBLIC` 타입을 추가함
- erd.md에는 최종 상태(`PUBLIC / DIRECT / GROUP / NPC`)만 기술되어 있어 정확하나, V1 SQL 주석(line 134)에는 아직 `DIRECT / GROUP / NPC`만 표기
- 실제 동작에 영향 없음 (V3에서 변환 완료)

---

## 4. 이벤트 명세 -- 실제 Kafka 토픽 일치

### LGTM -- user.registered
- event.md 토픽명, 프로듀서, 컨슈머, 처리 흐름이 실제 코드와 일치
- `UserRegisteredEventConsumer` TOPIC = "user.registered" 확인

### LGTM -- npc.conversation.summarize
- event.md 토픽명, 프로듀서, 컨슈머, 처리 흐름이 실제 코드와 일치
- `ConversationSummaryEventConsumer` TOPIC = "npc.conversation.summarize" 확인

---

## 5. 패키지 구조 -- 실제 코드 일치

### [WARNING] docs/architecture/package-structure.md:9 -- communication 패키지에 adapter/in/messaging, adapter/out/npc 미기술
- 실제 코드: `communication/adapter/in/messaging/` (ConversationSummaryEventConsumer)
- 실제 코드: `communication/adapter/out/npc/` (OllamaResponseAdapter, HardcodedNpcResponseAdapter 등 7개 파일)
- package-structure.md의 도메인 내부 구조 템플릿에 `adapter/out/external/`은 있지만, 실제 communication에서는 `adapter/out/npc/`라는 이름을 사용
- Phase 5에서 추가된 구조가 패키지 문서에 반영되지 않음

### [INFO] docs/architecture/package-structure.md -- village/adapter/in/websocket 존재하나 비어있을 가능성
- 실제 디렉토리 존재 확인됨 (village/adapter/in/websocket/)
- 현재 Phase에서 village WebSocket 핸들러는 구현되지 않았으므로 빈 디렉토리일 수 있음

### LGTM -- 최상위 패키지 구조
- identity, village, communication, economy, safety, notification, global 7개 모두 실제 코드와 일치
- economy 하위 wallet/inventory/purchase 구조 일치
- global 하위 config/error/alert/infra/security 구조 일치

---

## 6. Wiki -- 현재 구현 반영

### [CRITICAL] docs/wiki/communication/npc-conversation.md:81 -- "대화 맥락 유지 계획 (미구현)" 표기가 잘못됨
- 실제로 Phase 5에서 대화 맥락 유지가 완전히 구현되어 main에 머지됨:
  - V6 마이그레이션 (embedding vector(768))
  - NpcConversationMemoryJpaEntity + pgvector 시맨틱 검색
  - ConversationSummaryEventConsumer (Kafka -> LLM 요약 -> pgvector)
  - NpcReplyService에서 임베딩 -> 유사도 검색 -> 맥락 주입
- "미구현"이라는 표기가 실제 구현 완료 상태와 직접 모순됨
- handover.md와 phases.md에서는 이미 완료로 표기

### [WARNING] docs/specs/websocket.md:68 -- WebSocket broadcast 형식 오류
- websocket.md에서는 "List<MessageResponse> 배치로 구독자 전체에게 broadcast" 라고 기술
- 실제 코드: ChatMessageHandler.java:48, ChatRoomController.java:60 -- 단일 MessageResponse를 convertAndSend
- NPC 응답도 WebSocketBroadcastAdapter.java:26에서 단일 MessageResponse를 broadcast
- 배치(List) 전송이 아니라 개별 MessageResponse 전송이 실제 동작

### LGTM -- WebSocket 연결 정보, 목적지 구조, 인증 방식 정확

---

## 7. phases.md -- 진행 상태 정확성

### [WARNING] docs/planning/phases.md:142 -- Phase 5 상태 마커 [~]가 실제보다 과소 반영
- phases.md에서 "대화 요약 파이프라인" [x]는 정확
- 그러나 Phase 5 전체 마커가 [~] (진행 중)인데, 남은 작업이 "상용 API 어댑터"와 "위험 신호 감지" 2개뿐
- 이 2개는 handover.md에서 "미착수"로 명확히 구분되어 있어 큰 문제는 아니나, 완료율을 정확히 알기 어려움

### [INFO] docs/planning/phases.md:125 -- Phase 4 Economy 상태 [ ] (미착수)
- phases.md 정확. Economy 도메인은 패키지 구조만 존재하고 실제 서비스/포트 구현 없음 확인

### LGTM -- Phase 0~3 완료 상태가 실제 코드와 일치

---

## 요약

| 등급 | 건수 | 항목 |
|------|------|------|
| CRITICAL | 3 | login API 명세 누락, 에러코드 2개 누락, Wiki NPC 대화 맥락 "미구현" 오표기 |
| WARNING | 5 | handover PR#8 위치, LoadChatHistoryUseCase 누락, overview 토큰 경로, WebSocket batch 오류, package-structure NPC 어댑터 |
| INFO | 3 | uncommitted 표기, V1 SQL 주석, village websocket 빈 디렉토리 |
| LGTM | 8 | ERD-마이그레이션 일치, Kafka 이벤트 2건, Communication API, Village API, 최상위 패키지, Phase 0-3, handover 패키지 |

