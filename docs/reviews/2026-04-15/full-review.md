# 전체 프로젝트 리뷰 -- 2026-04-15

## 대상
- 종류: full project scan (수동 전수 검증)
- 범위: backend/src/main/java 전체, backend/src/test 전체, migration SQL, application.yml 관련

---

## Codex 리뷰 결과

> Note: `codex review` CLI가 현재 환경에서 실행 불가하여, Claude Opus 4.6이 AGENTS.md/CLAUDE.md 기준으로 전체 코드베이스를 수동 전수 점검하였다.

---

### [CRITICAL] 아키텍처 위반

#### C-1. global/ 패키지에서 identity adapter 직접 참조
- **파일:** `global/config/StompAuthChannelInterceptor.java:14`
- **내용:** `import com.maeum.gohyang.identity.adapter.in.security.JwtProvider;`
- **규칙:** AGENTS.md "도메인 간 직접 참조 금지" + "global/ 패키지 남용 금지"
- **영향:** `global/config/` 패키지가 identity 도메인의 Adapter 계층 클래스를 직접 import한다. 이는 global이 identity 구현 세부사항에 결합되는 것이다.
- **권장:** JwtProvider의 `parse()` 메서드를 인터페이스(Port)로 추출하여 `global/security/`에 위치시키고, JwtProvider가 이를 구현하도록 변경. StompAuthChannelInterceptor는 인터페이스에만 의존.

#### C-2. InitializeUserVillageService의 check-then-act 멱등성 패턴
- **파일:** `village/application/service/InitializeUserVillageService.java:30`
- **내용:** `if (loadCharacterPort.load(userId).isPresent()) { return; }`
- **규칙:** AGENTS.md Critical Rule #6 "check-then-act 멱등성 패턴 금지 -- insertIfAbsent 기반으로 보장"
- **영향:** IdempotencyGuard가 1차 방어선이지만, 서비스 레벨의 isPresent() 체크와 save() 사이에 레이스 컨디션 잔존. Kafka at-least-once로 동시 이벤트 도달 시 character 테이블의 UNIQUE(user_id) 제약 위반 가능. 현재 DataIntegrityViolationException이 잡히지 않으므로 consumer가 실패하고 재시도 루프에 빠질 수 있다.
- **권장:** `INSERT ... ON CONFLICT DO NOTHING` 기반 insertIfAbsent로 변경하거나, DataIntegrityViolationException을 catch해 무시하는 방어 코드 추가.

#### C-3. @Transactional이 Adapter(Consumer) 계층에 위치
- **파일:** `village/adapter/in/messaging/UserRegisteredEventConsumer.java:43`
- **파일:** `communication/adapter/in/messaging/ConversationSummaryEventConsumer.java:53`
- **규칙:** AGENTS.md "@Transactional은 Service 계층에만"
- **영향:** Kafka Consumer(Adapter 계층)에 @Transactional이 직접 붙어있다. 트랜잭션 범위가 Consumer 메서드 전체를 감싸므로, 이벤트 파싱 실패와 비즈니스 로직 실패를 구분할 수 없고, 장시간 트랜잭션이 발생할 수 있다.
- **완화:** Kafka Consumer는 특수한 진입점이므로 Service 호출과 idempotency check를 하나의 트랜잭션으로 묶어야 하는 실용적 이유가 있다. 다만 이 판단의 근거를 코드 주석이나 ADR에 남기지 않았다.

#### C-4. 위치 공유 기능(PositionHandler) 테스트 완전 부재
- **파일:** `village/adapter/in/websocket/PositionHandler.java` (전체)
- **파일:** `village/adapter/in/websocket/PositionDisconnectListener.java` (전체)
- **규칙:** CLAUDE.md Critical Rule #5 "테스트 없는 기능 완료 금지"
- **영향:** 위치 공유 STOMP 핸들러에 대한 단위 테스트/통합 테스트가 전무하다. 인증 검증, broadcast 로직, disconnect 이벤트 처리 모두 검증되지 않았다.

---

### [WARNING] 컨벤션 위반

#### W-1. LoadChatHistoryService에 @Transactional(readOnly = true) 누락
- **파일:** `communication/application/service/LoadChatHistoryService.java:20`
- **규칙:** AGENTS.md "읽기 전용 조회에 @Transactional(readOnly = true) 필수"
- **영향:** 현재 Cassandra 기반이라 JPA 트랜잭션의 실질 영향은 적으나, 컨벤션 일관성 위반.

#### W-2. CORS 허용 오리진이 코드에 하드코딩
- **파일:** `identity/adapter/in/security/SecurityConfig.java:54`
- **파일:** `global/config/WebSocketConfig.java:40`
- **내용:** `"http://localhost:3000", "http://localhost:3001"` 하드코딩
- **규칙:** AGENTS.md "하드코딩된 설정값 금지 -- application.yml로 분리"
- **영향:** 프로덕션 배포 시 CORS 오리진 변경 불가. 환경 변수나 application.yml의 프로퍼티로 분리 필요.

#### W-3. PositionRequest에 입력값 검증 부재
- **파일:** `village/adapter/in/websocket/PositionRequest.java:4`
- **내용:** `public record PositionRequest(double x, double y) { }` -- 검증 없음
- **규칙:** AGENTS.md "Request DTO에 Validation 어노테이션 필수"
- **영향:** 클라이언트가 NaN, Infinity, 음수, 극단적 좌표 등 비정상 값을 전송할 수 있다. 다른 클라이언트에 그대로 broadcast되므로 클라이언트 사이드 오류 유발 가능.

#### W-4. StompSendMessageRequest에 @NotBlank/@Size 검증 부재
- **파일:** `communication/adapter/in/websocket/StompSendMessageRequest.java:3`
- **내용:** `public record StompSendMessageRequest(String body) { }` -- 검증 없음
- **완화:** `SendMessageUseCase.Command` 생성 시 body 검증이 수행되므로 실질적 방어는 존재. 다만 DTO 레벨 검증 누락으로 Command 생성 전에 비정상 입력이 Service 레이어까지 도달한다.

#### W-5. ConversationSummaryOutboxAdapter에서 JSON 수동 생성
- **파일:** `communication/adapter/out/persistence/ConversationSummaryOutboxAdapter.java:21`
- **파일:** `identity/adapter/out/persistence/OutboxPersistenceAdapter.java:21`
- **내용:** `String payload = "{\"userId\":" + userId + ",\"chatRoomId\":" + chatRoomId + "}";`
- **영향:** 문자열 연결로 JSON을 생성하면 특수문자 이스케이프 누락, 포맷 오류 발생 가능. ObjectMapper를 사용하는 것이 안전.

#### W-6. LoginService/RegisterUserService에서 이메일 중복 체크 레이스 컨디션 미언급
- **파일:** `identity/application/service/RegisterUserService.java:31`
- **내용:** `if (checkEmailDuplicatePort.isEmailTaken(command.email())) { throw ... }`
- **규칙:** AGENTS.md Critical Rule #6 "check-then-act 패턴 금지"
- **완화:** user_local_auth 테이블의 UNIQUE(email) 제약이 DB 레벨 방어선 역할. RegisterUserService가 DataIntegrityViolationException을 적절히 처리하는지 확인 필요 -- 현재 미처리로 500 Internal Server Error가 클라이언트에 노출될 수 있다.

#### W-7. Cassandra 듀얼 쓰기 비원자성
- **파일:** `communication/adapter/out/persistence/MessageCassandraPersistenceAdapter.java:31-34`
- **내용:** `messageRepository.save()` 후 `userMessageRepository.save()` -- 두 번째 실패 시 데이터 불일치
- **영향:** message 테이블에는 저장되었으나 user_message에는 저장 실패 시, 대화 요약에서 해당 메시지 누락. Cassandra batch 또는 보상 로직 필요.

---

### [INFO] 참고 사항

#### I-1. OutboxKafkaRelay의 단일 인스턴스 제약
- **파일:** `global/infra/outbox/OutboxKafkaRelay.java:35`
- 주석에 "단일 인스턴스 기준"으로 명시되어 있다. 멀티 인스턴스 배포 시 동시 relay로 이벤트 중복 발행 가능.

#### I-2. IssueGuestTokenService의 불필요한 @Transactional
- **파일:** `identity/application/service/IssueGuestTokenService.java:13`
- DB 접근 없이 JWT 토큰만 발급하는 서비스에 `@Transactional(readOnly = true)`가 붙어있다. 트랜잭션 오버헤드가 불필요하다.

#### I-3. messageCounters의 메모리 누수 가능성
- **파일:** `communication/application/service/SendMessageService.java:38`
- `ConcurrentHashMap<Long, AtomicInteger>`에 userId 키가 계속 쌓인다. 유저 수가 늘면 메모리 점유가 증가. 장기적으로 TTL 기반 캐시(Caffeine, Redis)로 전환 검토.

#### I-4. Participant 테이블에 chat_room_id FK가 존재
- **파일:** `V1__initial_schema.sql:149`
- **내용:** `chat_room_id BIGINT NOT NULL REFERENCES chat_room(id)`
- AGENTS.md "도메인 간 FK 금지"는 도메인 간 FK를 금지하지만, participant와 chat_room은 동일 도메인(communication)이므로 위반은 아니다. 참고 차원.

#### I-5. ChatTopics가 최상위 패키지에 위치
- **파일:** `communication/ChatTopics.java`
- `communication/` 루트에 직접 위치. 패키지 구조 규칙에 따라 `communication/domain/` 또는 `communication/adapter/` 하위가 적절할 수 있다.

#### I-6. NpcReplyService에서 예외를 잡고 로그만 남김
- **파일:** `communication/application/service/NpcReplyService.java:69-71`
- NPC 응답 생성 실패 시 `catch (Exception e) { log.error(...) }` -- 유저에게 아무 피드백 없음. AlertPort를 통한 운영 알림 추가 검토.

---

### LGTM

1. **Domain Entity 순수성:** User, ChatRoom, Message, Character, Space, Participant, NpcConversationMemory 모두 JPA/Spring 어노테이션 없는 순수 POJO. 정적 팩토리 메서드(newXxx/restore) 패턴 일관성 우수.

2. **도메인 간 격리:** identity, village, communication 간 직접 import 전무. Kafka 이벤트 기반 비동기 통신 설계 준수.

3. **@Autowired 필드 주입 전무:** 전체 코드베이스에서 @Autowired 사용 없음. 모든 의존성 생성자 주입.

4. **throw new RuntimeException() 전무:** 전체 코드베이스에서 RuntimeException 직접 throw 없음. 커스텀 예외 체계 일관 적용.

5. **Outbox + Idempotency 패턴:** Transactional Outbox, KafkaEventIdExtractor, IdempotencyGuard, 에러 분류(transient/permanent/systemic) 체계가 견고하게 구현됨.

6. **SendMessageService 동시성 처리:** CAS 루프 기반 원자적 카운터, participant 생성 시 UNIQUE 제약 + DataIntegrityViolationException 재조회 패턴 적용.

7. **SendMessageUseCase.Command에서 입력 검증 통합:** REST와 STOMP 두 경로 모두 Command 생성자에서 body 검증 수행. 검증 불일치 방지.

8. **테스트 품질:** SendMessageServiceTest, NpcReplyServiceTest 모두 성공/실패/동시성 케이스 커버. BDD(Given-When-Then) 스타일, 한글 메서드명 일관 적용.

9. **Persistence Entity 컨벤션:** @Builder 미사용, 정적 팩토리 메서드(from/toDomain), @NoArgsConstructor(access = PROTECTED) 일관 적용.

10. **Ollama Adapter의 방어 코딩:** Semaphore로 GPU 보호, fallback 메시지, null 체크, InterruptedException 처리 모두 양호.
