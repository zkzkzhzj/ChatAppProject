# MD 정합성 리뷰 -- 2026-04-15

## 대상
- 종류: 문서 정합성 + 코드<->명세 교차검증
- 범위: docs/ 전체, backend/src/main/java, application.yml, migration SQL

---

## 리뷰 결과

### [WARNING] auth-flow.md:28 -- `validateAndExtract()` 메서드 존재하지 않음
- 문서: `JwtProvider.validateAndExtract() -> Optional<JwtClaims>` 반환이라 기술
- 코드: 실제 메서드명은 `JwtProvider.parse() -> Optional<AuthenticatedUser>`. `JwtClaims`는 deprecated 빈 클래스.
- 파일: `docs/wiki/identity/auth-flow.md:26`

### [WARNING] auth-flow.md:35 -- 공개 경로에 `/api/v1/auth/login` 누락
- 문서: 공개 경로 목록에 `/api/v1/auth/register`, `/api/v1/auth/guest` 등 나열하지만 `/api/v1/auth/login` 누락
- 코드: `application.yml:70` 에 `/api/v1/auth/login`이 `security.common-public-paths`에 포함됨
- 파일: `docs/wiki/identity/auth-flow.md:35`

### [WARNING] auth-flow.md:48-49 -- 게스트 DB 저장 설명 오류 + Refresh Token 미구현
- 문서: "GUEST | DB 저장 | `users` (type=GUEST)" -- 게스트를 DB에 저장한다고 기술
- 코드: `IssueGuestTokenService`는 `issueTokenPort.issueGuestToken()`만 호출. DB 저장 없음. JWT subject에 `guest-UUID`만 발급.
- 문서: MEMBER는 "Access + Refresh" 발급이라 기술
- 코드: `RegisterUserService`/`LoginService` 모두 Access Token만 반환. Refresh Token 로직 미구현.
- 파일: `docs/wiki/identity/auth-flow.md:48-49`

### [WARNING] npc-conversation.md:38-41 -- 시스템 프롬프트 불일치
- 문서 Wiki: `답변은 1~3문장으로 짧게 해.`
- 코드 application.yml:96: `답변은 반드시 1문장으로 해. 꼭 필요한 경우에만 최대 2문장까지 허용.`
- 코드가 더 제한적으로 변경됨. Wiki가 outdated.
- 파일: `docs/wiki/communication/npc-conversation.md:38`

### [WARNING] websocket-client.md:16 -- axios 용도 설명 outdated
- 문서: `axios | 1.14.0 | REST API 호출 (채팅방 생성 등)`
- 코드: 채팅방 생성 API는 제거됨 (마을 공개 채팅방 고정). axios는 로그인/회원가입/메시지 전송 용도.
- 파일: `docs/wiki/frontend/websocket-client.md:16`

### [WARNING] websocket-client.md:49 -- 배열 체크 설명 outdated
- 문서: `서버가 배열(batch)로 보낼 수 있으므로 내부에서 Array.isArray() 체크 후 개별 dispatch`
- 코드: websocket.md 명세에서 단일 MessageResponse 객체로 broadcast. 배열 아님. PR #10에서 수정 완료.
- 파일: `docs/wiki/frontend/websocket-client.md:49`

### [WARNING] handover.md:29-30 -- Phase 1 Identity 파일 목록 불완전
- 문서: Port (in)에 `RegisterUserUseCase`, `IssueGuestTokenUseCase`만 나열
- 코드: `LoginUseCase`도 존재하며 `AuthController`에서 사용 중
- 파일: `docs/handover.md:35`

### [WARNING] ERD npc_conversation_memory -- chatRoomId 컬럼 누락
- 문서 ERD: `NPC_CONVERSATION_MEMORY`에 `user_id`만 있고 `chat_room_id` 없음
- 코드: Domain `NpcConversationMemory`, JPA Entity, Migration SQL 모두 `chatRoomId` 없음
- event.md Kafka 페이로드에는 `chatRoomId: 1` 포함되지만, 요약 저장 시에는 사용하지 않음
- 심각도 낮음: 현재 마을 공개 채팅방 1개 고정이므로 문제없으나, 추후 다중 채팅방 시 설계 변경 필요
- 파일: `docs/architecture/erd.md:196-203`, `docs/specs/event.md:87-89`

### [INFO] package-structure.md:13 -- economy/, safety/, notification/ 미구현
- 문서: 최상위 구조에 `economy/`, `safety/`, `notification/` 포함
- 코드: 실제 코드베이스에 이들 패키지 미존재. 미래 설계 문서로 정확하지만, "현재" 구조와 "목표" 구조가 혼재.
- 파일: `docs/architecture/package-structure.md:9-17`

### [INFO] domain-boundary.md:65 -- Communication 발행 이벤트 누락
- 문서: Communication 발행 이벤트로 `MessageReported`만 기재
- 코드: `npc.conversation.summarize` 토픽도 Communication(SendMessageService)이 발행
- 파일: `docs/architecture/domain-boundary.md:60-61`

### [INFO] handover.md:139 -- "uncommitted" 표시된 항목이 이미 머지됨
- 문서: "4/13 -- 백엔드 마을 공개 채팅 아키텍처 전환 (uncommitted)" 및 "프론트엔드 채팅 UI 구현 (uncommitted)"
- 실제: PR #7, #8, #9, #10이 모두 머지 완료 상태. 이 항목들은 이미 main에 반영됨.
- 파일: `docs/handover.md:139, 153`

### [INFO] JwtClaims.java -- deprecated 빈 클래스 잔존
- `identity/adapter/in/security/JwtClaims.java`가 `@Deprecated` 처리되어 있으나 여전히 코드베이스에 남아있음.
- 삭제해도 무방하나 코드 변경이므로 보고만 함.
- 파일: `backend/src/main/java/.../identity/adapter/in/security/JwtClaims.java`

### LGTM 항목

- websocket.md: 채팅 + 위치 공유 destination, payload, 인증 설명 모두 코드와 일치
- event.md: `user.registered`, `npc.conversation.summarize` 토픽 정의, 멱등성 키, 처리 흐름 모두 정확
- api/communication.md: POST/GET /api/v1/chat/messages 명세가 `ChatRoomController` 코드와 일치
- api/auth.md: register, login, guest 3개 엔드포인트 모두 `AuthController`와 일치
- api/village.md: characters/me, spaces/me 명세가 `VillageController`와 일치
- chat-architecture.md: 전체 흐름, 저장소 전략, WebSocket 구조 정확
- guest-policy.md: 게스트 접근 제한, API 응답 코드 모두 정확
- erd.md: 테이블 구조가 V1~V6 마이그레이션 및 JPA Entity와 일치
- coding.md: Port 명명 규칙, DTO 규칙이 실제 코드 컨벤션과 일치
- outbox-pattern.md: 이벤트 목록, 직렬화 전략 정확
- application.yml: Cassandra `spring.cassandra.*` 키, npc 설정 구조 모두 문서와 일치
