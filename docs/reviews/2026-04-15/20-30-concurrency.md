# 동시성·성능 리뷰 — 2026-04-15 20:30

## Codex 리뷰 결과

Codex v0.120.0 (gpt-5.4) 실행. PowerShell 호환성 오류로 첫 시도 실패 후 복구.

### Codex 발견 항목 (3건, 모두 P2)

**[P2] PositionDisconnectListener — 멀티 세션 퇴장 오판**
- 파일: `backend/src/main/java/com/maeum/gohyang/village/adapter/in/websocket/PositionDisconnectListener.java:33-36`
- `displayId`는 유저 단위(user-{id}/guest-UUID)이지 STOMP 세션 단위가 아니다. 같은 유저가 2탭으로 접속 중 1탭만 닫아도 LEAVE가 broadcast되어 모든 클라이언트가 해당 유저를 제거한다.
- 권고: 활성 세션 수를 추적하거나, STOMP session ID 기반 presence 관리 필요.

**[P2] PositionHandler — 신규 접속자에게 기존 유저 위치 미전달**
- 파일: `backend/src/main/java/com/maeum/gohyang/village/adapter/in/websocket/PositionHandler.java:36-43`
- 위치를 메모리에 저장하지 않으므로, 늦게 접속한 유저는 이미 멈춘 유저의 좌표를 받을 수 없다. 마을이 빈 것처럼 보이는 UX 문제.
- 권고: 인메모리 ConcurrentHashMap으로 최신 위치를 캐싱하고, 구독 시 snapshot 전송.

**[P2] VillageScene.ts — base64url 디코딩 실패로 자기 아바타 중복**
- 파일: `frontend/src/game/scenes/VillageScene.ts:382-387`
- `atob()`는 base64url 인코딩을 지원하지 않는다. guest JWT subject가 `guest-<uuid>`이므로 `-`/`_` 문자가 포함될 수 있고, 이 경우 `atob()` 예외 발생 → `myDisplayId = null` → 자신의 broadcast를 필터링하지 못해 아바타가 중복으로 렌더링된다.
- 권고: base64url → base64 변환 함수 적용 또는 `jose` 라이브러리의 JWT 디코더 사용.

---

## 보완 검증 (Grep/Read 기반)

### [CRITICAL]

#### CONC-C1. @Transactional 내 외부 LLM API 호출
- 파일: `ConversationSummaryEventConsumer.java:53` (`@Transactional`)
- 이 Consumer는 `@Transactional` 범위 안에서 `summarizeConversationPort.summarize()`와 `generateEmbeddingPort.generate()`를 호출한다.
- 이 두 메서드는 각각 `OllamaSummarizeAdapter`, `OllamaEmbeddingAdapter`로 구현되며, Ollama REST API (외부 HTTP 호출)를 수행한다.
- **DB 커넥션을 Ollama 응답 대기 시간(수 초~수십 초) 동안 점유**한다. 트래픽 증가 시 커넥션 풀 고갈 → 전체 서비스 장애로 이어질 수 있다.
- 또한 Ollama 호출 성공 후 DB 커밋 실패 시, 이미 발생한 외부 호출은 되돌릴 수 없다.
- **권고**: 외부 API 호출을 트랜잭션 밖으로 분리한다. idempotencyGuard.isAlreadyProcessed()만 별도 트랜잭션에서 확인하고, 외부 API 호출 후 save + markAsProcessed를 별도 트랜잭션으로 묶는다.

#### CONC-C2. PositionDisconnectListener — 멀티 탭/재접속 시 false LEAVE (Codex P2와 동일)
- 파일: `PositionDisconnectListener.java:33-36`
- Codex 발견과 동일. 동시성 관점에서 재접속과 기존 세션 종료가 race할 경우, 유저가 접속 중임에도 LEAVE broadcast가 나간다.
- 이는 단순 UX 문제가 아니라, 분산 환경에서 서버 인스턴스 간 세션 상태 불일치로 악화될 수 있다.

#### CONC-C3. 위치 공유 — 신규 접속자에게 snapshot 미전달 (Codex P2와 동일)
- 파일: `PositionHandler.java:36-43`
- 위치를 어디에도 저장하지 않으므로, 신규 접속자가 기존 유저를 볼 수 없다.
- **권고**: ConcurrentHashMap<String, PositionBroadcast>로 최신 위치를 유지하고, STOMP SessionSubscribeEvent에서 snapshot을 해당 세션에 전송한다.

### [WARNING]

#### CONC-W1. RegisterUserService — check-then-act (이메일 중복 검사)
- 파일: `RegisterUserService.java:31-33`
- `isEmailTaken()` 조회 후 `saveWithLocalAuth()` 호출. 두 요청이 동시에 같은 이메일로 도착하면 둘 다 조회 통과 가능.
- **완화 요인**: `UserLocalAuthJpaEntity.email`에 `unique = true` 제약조건 존재. 두 번째 save는 DataIntegrityViolationException 발생.
- **문제**: 이 예외를 잡아서 DuplicateEmailException으로 변환하는 코드가 없다. 현재는 500 Internal Server Error가 클라이언트에 전달된다.
- **권고**: `DataIntegrityViolationException`을 catch하여 DuplicateEmailException으로 변환하는 로직 추가.

#### CONC-W2. InitializeUserVillageService — check-then-act (캐릭터 중복 생성)
- 파일: `InitializeUserVillageService.java:30-33`
- `loadCharacterPort.load(userId).isPresent()` 후 `saveCharacterPort.save()`. 동시 이벤트 처리 시 두 스레드가 모두 조회 통과 가능.
- **완화 요인**: `CharacterJpaEntity.userId`에 `unique = true` 존재. 멱등성 가드(IdempotencyGuard)도 1차 방어선으로 동작.
- **잔존 리스크**: IdempotencyGuard의 `isAlreadyProcessed`와 `markAsProcessed`도 check-then-act이다. 다만 processed_event.event_id에 unique 제약이 있으므로 두 번째 markAsProcessed가 예외를 던질 수 있다.
- **권고**: Character unique 제약 위반 시 로그만 남기고 정상 반환하는 방어 코드 추가 권장.

#### CONC-W3. SendMessageService — 인메모리 카운터 (멀티 인스턴스 미지원)
- 파일: `SendMessageService.java:38`
- `ConcurrentHashMap<Long, AtomicInteger> messageCounters`로 유저별 메시지 수를 추적한다.
- **양호한 점**: compareAndSet 루프를 사용한 원자적 increment-and-reset (라인 86-94). 단일 인스턴스에서는 올바르게 동작.
- **제약**: 멀티 인스턴스 배포 시 인스턴스별로 카운터가 분리되어, 요약 이벤트 발행 타이밍이 일관되지 않는다.
- 주석에 "멀티 인스턴스 배포 시 Redis INCR로 전환 필요"라고 명시되어 있으므로, 현재 단일 인스턴스 단계에서는 수용 가능.

#### CONC-W4. @Version 락 전략 부재
- 전체 프로젝트에서 `@Version` 또는 `@Lock` 사용이 없다.
- 현재 상태 변경 로직(회원가입, 캐릭터 생성, 메시지 전송)은 포인트 차감이나 수량 변경 같은 competitive write가 아직 없으므로 즉시 위험은 아니다.
- **향후 리스크**: economy 도메인(포인트, 아이템 구매)이 구현되면 반드시 낙관적 락을 도입해야 한다.

#### CONC-W5. NpcReplyService — @Async 예외 삼키기
- 파일: `NpcReplyService.java:69-72`
- `@Async` 메서드의 catch 블록에서 로그만 남기고 예외를 삼킨다. NPC 응답 실패 시 유저에게 아무런 피드백이 없다.
- **권고**: 실패 시 WebSocket으로 에러 메시지를 broadcast하거나, fallback 메시지를 전송하는 것이 좋다.

#### CONC-W6. VillageScene.ts — atob() base64url 비호환 (Codex P2와 동일)
- 파일: `frontend/src/game/scenes/VillageScene.ts:383`
- guest JWT subject `guest-<uuid>`의 `-` 문자가 base64url에서 문제를 일으킨다.

### LGTM (양호한 설계)

- **Kafka 멱등성**: 두 Consumer 모두 IdempotencyGuard + processed_event 테이블 기반 중복 방어를 올바르게 구현. catch 블록에서 `throw e`로 예외를 재던져 메시지 유실을 방지.
- **SendMessageService.getOrCreateParticipant()**: UNIQUE 제약 + DataIntegrityViolationException catch 후 재조회 패턴. check-then-act를 올바르게 방어.
- **SendMessageService.publishSummaryEventIfNeeded()**: compareAndSet 루프로 increment-and-reset을 원자적으로 수행. 비원자적 복합 연산 함정을 정확히 피함.
- **OllamaResponseAdapter**: Semaphore로 동시 호출 제한. GPU 자원 보호.
- **Outbox 패턴**: RegisterUserService에서 user + outbox를 같은 트랜잭션으로 묶어 이벤트 유실 방지.
- **N+1 쿼리**: JPA 관계 매핑(@OneToMany, @ManyToMany) 없음. Cassandra 분리 저장소 사용. N+1 위험 없음.
- **FetchType.LAZY**: 사용하지 않으므로 LAZY 관련 이슈 없음.
