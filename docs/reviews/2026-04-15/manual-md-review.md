# MD 정합성 리뷰 -- 2026-04-15

## 대상
- 종류: 문서 정합성 + 코드<->명세 교차검증
- 범위: docs/ 전체, backend/src/main/java, frontend/src/lib/websocket, application.yml, migration SQL
- 방법: Bash 권한 미허용으로 codex review CLI 실행 불가. 수동 교차검증 수행.

---

## 리뷰 결과

### [CRITICAL] handover.md:31 -- Phase 1 Port 목록에서 LoginUseCase, LoginService, LoadUserCredentialsPort 누락

handover.md Phase 1 Identity 완료 목록(라인 29~41)에 `LoginUseCase`, `LoginService`, `LoginRequest`, `LoadUserCredentialsPort` 가 기재되어 있지 않다. 그러나 코드에는 이 4개 파일이 모두 존재하고 AuthController에서 사용 중이다.

영향: 새 세션에서 Identity 도메인 현황을 잘못 파악할 수 있다.

---

### [CRITICAL] handover.md:31 -- Phase 1 Error에 InvalidCredentialsException 누락

handover.md Phase 1 Error 행에는 `IdentityErrorCode`, `DuplicateEmailException`만 기재되어 있다. 코드에는 `InvalidCredentialsException`이 추가로 존재한다.

---

### [WARNING] identity/domain/UserType.java -- @Deprecated 파일이 코드베이스에 잔존

`identity/domain/UserType.java`는 `@Deprecated` + "다음 정리 시 삭제" 주석이 달려 있지만 아직 삭제되지 않았다. handover.md에도 이 잔존 파일에 대한 언급이 없다.

---

### [WARNING] docs/specs/api/village.md:57 -- SpaceTheme 예시값 불일치

village.md API 명세의 Response 예시에 `"theme": "FOREST"`로 적혀 있고 비고에 "현재 구현: DEFAULT"라고 적었다. 그러나 실제 코드의 `SpaceTheme` enum에는 `DEFAULT`만 존재한다. 예시가 아직 구현되지 않은 값을 보여주고 있어 클라이언트 개발자가 혼동할 수 있다.

---

### [WARNING] handover.md -- Communication Port (out) 목록 outdated

handover.md Phase 3 Port(out) 목록(라인 75)에는 `SaveChatRoomPort`, `SaveParticipantPort`, `LoadParticipantPort`, `SaveMessagePort`, `GenerateNpcResponsePort`만 기재되어 있다. 그러나 실제 코드에는 다음이 추가로 존재한다:
- `BroadcastChatMessagePort`
- `GenerateEmbeddingPort`
- `LoadConversationMemoryPort`
- `SaveConversationMemoryPort`
- `PublishConversationSummaryEventPort`
- `LoadMessageHistoryPort`
- `SummarizeConversationPort`

이들은 Phase 5(pgvector) 섹션에 별도 기재되어 있으나, Phase 3의 Port(out) 목록이 최신 상태를 반영하지 못하고 있다.

---

### [WARNING] handover.md -- Communication Port (in) 목록에 LoadChatHistoryUseCase 누락

handover.md Phase 3 Port(in)에 `CreateChatRoomUseCase`, `SendMessageUseCase`만 기재되어 있다. `LoadChatHistoryUseCase`가 코드에 존재하고 `ChatRoomController.getChatHistory()`에서 사용 중이지만 handover에 없다.

---

### [WARNING] handover.md -- NpcReplyService 기재 위치 부재

`NpcReplyService`는 communication/application/service에 존재하는 핵심 서비스이나, handover.md Phase 3 Service 행에는 `CreateChatRoomService`, `SendMessageService`만 기재되어 있다. Phase 5 섹션에 "@Async 분리"로 언급되나 Service 목록에는 빠져 있다.

---

### [WARNING] docs/specs/event.md -- npc.conversation.summarize 이벤트의 멱등성 키 설명과 코드 불일치 가능성

event.md 라인 75에 멱등성 키를 `outbox_event.event_id (UUID, Kafka 헤더). 헤더 미존재 시 key + offset 조합 UUID fallback`으로 설명한다. 실제 코드(`KafkaEventIdExtractor`)를 확인해야 정확하지만, user.registered 이벤트의 멱등성 키는 `outbox_event.id`(라인 29)로 적혀 있어 두 이벤트 간 멱등성 키 생성 방식이 다르다. 문서에서 이 차이의 이유가 설명되어 있지 않다. (추정)

---

### [WARNING] package-structure.md:132-145 -- global/ 패키지 설명에 AsyncConfig, KafkaConsumerConfig 누락

package-structure.md의 global/ 설명(라인 132~145)에 `AsyncConfig`, `KafkaConsumerConfig`가 기재되어 있지 않다. 실제 코드에는 `global/config/` 아래에 이 두 파일이 존재한다.

---

### [INFO] docs/wiki/village/character-system.md -- 위치 공유 시스템 미반영

character-system.md "향후 계획"에 "캐릭터 이동 애니메이션"이 적혀 있지만, 이미 PositionHandler + PositionBroadcast + PositionDisconnectListener로 위치 공유가 구현되어 있다. 캐릭터 시스템 wiki에 위치 공유에 대한 설명이 없다.

---

### [INFO] domain-boundary.md:83 -- Village "향후 추가 예정" Presence 모델, 실제로는 PositionHandler로 비영속 구현

domain-boundary.md 라인 83에 "(향후 추가 예정) Presence -- 유저의 현재 위치 및 상태"로 적혀 있다. 현재 PositionHandler가 비영속 위치 공유를 구현했으나 Presence 도메인 모델은 아직 없다. 문서의 "향후 추가 예정" 표기가 현재 상태와 부분적으로 불일치한다.

---

### [INFO] ChatTopics.java -- 위치 공유 토픽 상수가 ChatTopics에 미등록

`ChatTopics.VILLAGE_CHAT`만 정의되어 있고, `/topic/village/positions`는 `PositionHandler`와 `PositionDisconnectListener`에서 각각 매직 스트링(`TOPIC_POSITIONS`)으로 사용 중이다. PR #8에서 토픽 상수화를 수행했으나 위치 공유는 별도 브랜치(feat/realtime-position-sharing)에서 구현되어 상수화가 반영되지 않았다.

---

### [INFO] stompClient.ts:57-62 -- subscribeToChatRoom에서 Array 처리 로직 잔존

서버는 단일 `MessageResponse` 객체만 broadcast하도록 변경되었으나(websocket.md 확인), `subscribeToChatRoom`에는 여전히 `Array.isArray(parsed)` 분기가 남아 있다. 동작에 영향은 없지만 불필요한 코드다.

---

### LGTM 항목

- websocket.md: 채팅 목적지(`/app/chat/village`, `/topic/chat/village`)와 코드 일치 확인
- websocket.md: 위치 공유 목적지(`/app/village/position`, `/topic/village/positions`)와 코드 일치 확인
- websocket.md: PositionBroadcast 페이로드 구조(id, userType, x, y)와 코드 record 일치 확인
- websocket.md: PositionDisconnectListener의 LEAVE broadcast 설명과 코드 일치 확인
- AuthenticatedUser.displayId(): 문서의 "MEMBER: user-{userId}, GUEST: guest-{UUID}" 형식과 코드 일치 확인
- api/auth.md: register(201), login(200), guest(200) 상태코드와 AuthController 코드 일치 확인
- api/communication.md: POST /api/v1/chat/messages, GET /api/v1/chat/messages 엔드포인트와 ChatRoomController 일치 확인
- erd.md: 6개 migration SQL 파일(V1~V6)과 ERD 테이블 정의 정합 확인
- package-structure.md: 헥사고날 구조(domain/application/adapter)와 실제 Java 패키지 구조 일치 확인
- coding.md: Port(out) ByXxx 금지 컨벤션과 실제 Port 메서드명 정합 확인
- event.md: user.registered 토픽, 프로듀서, 컨슈머, 페이로드와 코드 일치 확인
- WebSocketConfig: STOMP 엔드포인트(/ws), prefix(/app), broker(/topic, /queue) 설정과 문서 일치 확인

