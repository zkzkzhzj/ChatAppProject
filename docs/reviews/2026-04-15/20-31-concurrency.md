# 동시성·성능 리뷰 — 2026-04-15 20:31

## Codex 리뷰 결과 (gpt-5.4)

Codex는 위치 공유 기능의 **기능적 회귀** 2건을 P1으로 식별했다.

### [P1] 게스트 유저 위치 공유 불가
- **파일**: `frontend/src/lib/websocket/useStomp.ts:75-79`
- **내용**: accessToken이 없으면 `connectAnonymous()`를 호출하지만, 서버의 `PositionHandler`는 `principal`이 `AuthenticatedUser`인 경우에만 broadcast한다. 게스트가 토큰 없이 접속하면 principal이 null이므로 위치 전송이 무시되고, 퇴장 이벤트도 발생하지 않는다.
- **조치**: 게스트도 guest JWT를 발급받은 뒤 connectWithAuth로 접속하거나, 토큰 없이 접속하는 경로에서 게스트 토큰을 자동 발급하는 플로우 필요.

### [P1] STOMP 연결 전 위치 전송 시도
- **파일**: `frontend/src/game/scenes/VillageScene.ts:393-396`
- **내용**: VillageScene은 create() 직후 100ms 간격으로 `sendPosition()`을 호출하나, STOMP 연결은 useStomp()에서 비동기로 수립된다. 페이지 로드 직후에는 미연결 상태에서 publish가 호출되어 오류가 발생할 수 있다.
- **조치**: `client.connected` 상태를 확인하거나, 연결 완료 전까지 버퍼링하는 가드 필요.

---

## 동시성 전문 분석

### [CRITICAL]

#### [CONC-6] OutboxKafkaRelay — 다중 인스턴스 동시 발행 위험
- **파일**: `global/infra/outbox/OutboxKafkaRelay.java:53-88`
- **내용**: `@Scheduled(fixedDelay = 1000)` + `@Transactional`로 Outbox 이벤트를 릴레이하지만, 다중 인스턴스 배포 시 동일 이벤트를 여러 인스턴스가 동시에 조회/발행할 수 있다. 코드 주석에 "단일 인스턴스 기준. 다중 인스턴스 배포 시 분산 락 필요"라고 명시되어 있다.
- **심각도**: 현재 단일 인스턴스이므로 즉시 위험은 아니나, 스케일아웃 시 **중복 Kafka 이벤트 발행 → 컨슈머 측 멱등성에만 의존**하게 된다. 컨슈머가 IdempotencyGuard를 사용하므로 데이터 정합성은 유지되나, 불필요한 처리량 증가와 partial failure 시 혼란 가능.
- **조치**: 스케일아웃 전 ShedLock 또는 Redisson 분산 락 적용 필수. 또는 CDC 전환 검토.

#### [CONC-1] RegisterUserService — check-then-act 레이스 컨디션
- **파일**: `identity/application/service/RegisterUserService.java:31-40`
- **내용**: `isEmailTaken()` 조회 후 `saveWithLocalAuth()` 호출. 동시 요청 시 두 요청 모두 isEmailTaken=false를 받고 동시에 save를 시도할 수 있다.
- **방어**: email 컬럼에 `@Column(unique = true)` 제약이 있으므로(UserLocalAuthJpaEntity:28) DB 레벨에서 중복 삽입은 방지된다. 그러나 **DataIntegrityViolationException이 잡히지 않아** 500 에러로 전파된다.
- **조치**: try-catch로 DataIntegrityViolationException을 잡아 DuplicateEmailException으로 변환하거나, save 시점에서 예외 변환 로직 추가.

### [WARNING]

#### [CONC-2] 상태 변경 Entity에 @Version 누락
- **대상**: Character, Space, Participant 등 상태 변경 가능 Entity
- **내용**: 프로젝트 전체에서 `@Version` 또는 `@Lock` 어노테이션이 단 하나도 없다. 현재는 동시 수정이 일어나는 시나리오가 제한적이지만(캐릭터 커스터마이징, 공간 꾸미기 등 아직 미구현), 향후 아이템 구매/포인트 차감 기능 구현 시 반드시 낙관적 락 적용 필요.
- **조치**: 상태 변경이 발생하는 Entity에 `@Version` 필드 추가를 기능 구현 시 필수 체크리스트에 포함.

#### [CONC-7] SendMessageService — ConcurrentHashMap 인메모리 카운터
- **파일**: `communication/application/service/SendMessageService.java:38`
- **내용**: `ConcurrentHashMap<Long, AtomicInteger> messageCounters`로 유저별 메시지 카운트를 관리한다. CAS 루프(`compareAndSet`)를 사용하여 increment-and-reset을 원자적으로 수행하고 있어 단일 인스턴스에서의 동시성은 안전하다.
- **리스크 1**: 서버 재시작 시 카운터 초기화 → 주석에 "허용 가능"으로 명시됨. 요약 이벤트가 지연될 뿐 데이터 유실이 아니므로 수용 가능.
- **리스크 2**: 멀티 인스턴스 배포 시 인스턴스별 카운터가 분리됨 → 주석에 "Redis INCR로 전환 필요"로 명시됨.
- **리스크 3**: Map이 무한 증가 가능 (유저 수만큼 엔트리 누적). 활동하지 않는 유저의 엔트리를 주기적으로 정리하는 메커니즘 없음.
- **조치**: 현 단계에서는 수용 가능하나, 유저 증가 시 TTL 기반 eviction 또는 Redis 전환 필요.

#### [CONC-1] InitializeUserVillageService — check-then-act 패턴
- **파일**: `village/application/service/InitializeUserVillageService.java:30-33`
- **내용**: `loadCharacterPort.load(userId).isPresent()` 체크 후 save. 동시에 같은 userId로 두 이벤트가 처리되면 중복 생성 가능.
- **방어**: Character 테이블에 `@Column(unique = true)` on userId가 있고, 1차 방어선인 IdempotencyGuard(processed_event 테이블)가 Consumer에서 먼저 체크한다. 이중 방어가 되어 있으므로 실질적 위험은 낮다.
- **조치**: DataIntegrityViolationException catch 추가하면 완벽. 현재도 IdempotencyGuard가 대부분 잡아주므로 WARNING 수준.

#### [CONC-3] OutboxKafkaRelay — 트랜잭션 내 Kafka 동기 발행
- **파일**: `global/infra/outbox/OutboxKafkaRelay.java:68`
- **내용**: `kafkaTemplate.send().get()`으로 동기 발행. `@Transactional` 내에서 Kafka broker 응답을 기다리므로, Kafka 지연 시 DB 트랜잭션이 장시간 열려 있게 된다.
- **리스크**: Kafka 장애 시 DB 커넥션 풀 고갈 가능.
- **조치**: 트랜잭션 외부에서 Kafka 발행 후 결과에 따라 DB 상태 업데이트하는 방식으로 분리 검토. 또는 발행 타임아웃을 짧게 설정.

### LGTM (양호)

#### [CONC-4] Kafka 멱등성 — 양호
- `UserRegisteredEventConsumer`와 `ConversationSummaryEventConsumer` 모두 `IdempotencyGuard`를 사용하여 이벤트 중복 처리를 방어하고 있다. `ProcessedEventJpaEntity`의 eventId에 unique 제약이 있어 DB 레벨에서도 이중 방어.

#### [CONC-5] N+1 쿼리 — 해당 없음
- 현재 `@OneToMany`, `@ManyToMany` 관계가 없고, 모든 Entity가 단순 구조. N+1 위험 없음.

#### [CONC-3] NpcReplyService — 외부 API 호출이 트랜잭션 밖
- `NpcReplyService.replyAsync()`는 `@Async`이며 `@Transactional`이 없다. Ollama HTTP 호출이 트랜잭션과 무관하게 동작하므로 트랜잭션 범위 적절.

#### [CONC-8] 비원자적 복합 연산 — 해당 없음
- `SendMessageService`의 CAS 루프가 올바르게 구현되어 있다. `incrementAndGet` + `set(0)` 분리 패턴이 아닌, `compareAndSet` 루프로 atomic하게 처리.

#### [CONC-1] SendMessageService.getOrCreateParticipant — 양호
- UNIQUE 제약 + DataIntegrityViolationException catch + 재조회 패턴이 올바르게 구현되어 있다. 테스트도 존재.

---

## 성능 관점

### [WARNING] 위치 broadcast 스케일링
- **내용**: 모든 유저의 위치가 `/topic/village/positions` 하나의 토픽으로 broadcast된다. 유저 N명일 때 100ms마다 N개 메시지가 모든 구독자에게 전달되므로 O(N^2) 트래픽.
- **현재**: MVP 단계에서 소수 유저이므로 문제없음.
- **조치**: 유저 증가 시 영역(zone) 기반 분할, 또는 서버 측에서 주기적 스냅샷 방식으로 전환 검토.

### [INFO] Simple Broker 한계
- **내용**: WebSocketConfig에서 `enableSimpleBroker("/topic", "/queue")`로 인메모리 Simple Broker를 사용 중. 멀티 인스턴스 배포 시 인스턴스 간 메시지 공유가 안 된다.
- **조치**: 스케일아웃 시 Redis Pub/Sub 또는 RabbitMQ 기반 외부 브로커로 전환 필요. 코드 주석에 이미 명시되어 있음.
