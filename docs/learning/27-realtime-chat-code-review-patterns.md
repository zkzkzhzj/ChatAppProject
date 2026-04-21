# 27. 실시간 채팅 코드 리뷰에서 발견된 핵심 이슈와 해결 패턴 -- 4개 전문 에이전트 종합 리뷰 결과

> 작성 시점: 2026-04-13
> 맥락: 마을 공개 채팅 시스템 구현 후 코드리뷰/동시성/보안/문서정합성 4개 전문 에이전트로 종합 리뷰를 수행했다. 실시간 서비스에서 반복적으로 나타나는 패턴들이 한 번에 쏟아져 나왔고, 개별적으로는 사소해 보이지만 합쳐지면 프로덕션 장애로 이어질 수 있는 것들이었다.

---

## 배경

채팅 시스템의 첫 번째 구현이 끝난 시점. 기능은 동작하지만 "동작하는 것"과 "안전한 것"은 다르다. 특히 실시간 서비스는 동시성, 입력 경로 다양성, 에러 노출이라는 세 가지 축에서 REST API와는 다른 위험을 갖는다.

이번 리뷰에서 발견된 이슈를 크게 세 카테고리로 묶었다:

1. **동시성**: check-then-act, 트랜잭션 범위
2. **입력 검증과 보안**: STOMP 검증 부재, CORS 불일치, 에러 노출
3. **프론트엔드 비동기 처리**: disconnectStomp 레이스

---

## 이슈 1: check-then-act 레이스 컨디션 [해결됨]

> **[해결됨]** `IdempotencyGuard`로 멱등성 문제가 해결되었다.

### 문제

`SendMessageService.getOrCreateParticipant()`의 코드를 보면:

```java
return loadParticipantPort.load(userId, chatRoomId)
        .orElseGet(() -> saveParticipantPort.save(
                Participant.newMember(userId, chatRoomId)
        ));
```

"조회 -> 없으면 생성" 패턴이다. 단일 요청에서는 완벽하게 동작한다. 문제는 같은 유저가 동시에 두 메시지를 보낼 때:

```text
Thread A: load(42, 1) → empty
Thread B: load(42, 1) → empty    ← A가 save 하기 전에 조회
Thread A: save(participant)      → participant #100 생성
Thread B: save(participant)      → participant #101 생성 (중복!)
```

현재 DB에 `(user_id, chat_room_id)` UNIQUE 제약조건이 없어서, DB 레벨에서도 이 중복을 막지 못한다.

### 선택지 비교

| | A. 애플리케이션 락 (synchronized/분산 락) | B. DB UNIQUE 제약 + 예외 catch | C. INSERT ON CONFLICT DO NOTHING |
|--|---------|---------|---------|
| 핵심 개념 | Java 레벨에서 동시 접근을 직렬화 | DB가 중복을 거부하면 애플리케이션에서 catch 후 재조회 | DB가 중복이면 무시하고, 이후 SELECT로 기존 행을 반환 |
| 장점 | 중복 INSERT 자체가 발생하지 않는다 | 구현이 단순. 최후의 방어선(DB)이 보장. JPA 환경에서 자연스럽다 | DB 레벨에서 원자적. 별도 예외 처리 불필요 |
| 단점 | 단일 인스턴스면 synchronized로 충분하지만 다중 인스턴스면 분산 락(Redis 등)이 필요. 락 범위/해제 실수 시 데드락 위험 | `DataIntegrityViolationException`이 다른 제약 위반과 구분하기 어려울 수 있다. 예외 기반 흐름 제어는 냄새가 난다 | JPA 표준이 아니라 네이티브 쿼리가 필요. Persistence Adapter가 특정 DB에 종속된다 |
| 적합한 상황 | 생성 실패 시 부수 효과(알림 발송 등)가 있어서 중복 시도 자체를 막아야 할 때 | JPA 기반 프로젝트에서 가장 실용적. "먼저 시도하고 실패하면 대응"하는 방식이 자연스러운 경우 | 대량 INSERT가 빈번하고 예외 오버헤드를 피하고 싶을 때 |
| 실제 사용 사례 | 결제 처리, 좌석 예약 | 대부분의 웹 서비스에서 회원가입 중복 처리 | 데이터 파이프라인, bulk import |

### 이 프로젝트에서의 판단

**B. DB UNIQUE 제약 + DataIntegrityViolationException catch 후 재조회**가 가장 적합하다.

이유:

1. participant 생성은 부수 효과가 없다. 중복 생성 시도가 일어나도 catch하고 기존 것을 재조회하면 된다.
2. JPA 기반이라 네이티브 쿼리(ON CONFLICT)보다 예외 catch가 코드베이스와 일관적이다.
3. 분산 락은 현재 단일 인스턴스 환경에서 과잉 설계다.

핵심 교훈: **"조회 -> 없으면 생성" 패턴을 볼 때마다 동시성을 의심해야 한다.** DB UNIQUE 제약조건은 "있으면 좋고 없어도 되는 것"이 아니라, 데이터 정합성의 최후 방어선이다.

---

## 이슈 2: @Transactional 누락과 혼합 저장소

### 문제

`SendMessageService.execute()`는 네 가지 작업을 한다:

1. PostgreSQL에서 participant 조회/생성
2. PostgreSQL에서 NPC participant 조회
3. Cassandra에 유저 메시지 저장
4. Cassandra에 NPC 메시지 저장

그런데 `@Transactional`이 없다. 2번(NPC 조회)에서 실패하면 1번에서 생성된 participant는 롤백되지 않는다. 또한 PostgreSQL과 Cassandra는 트랜잭션 매니저가 다르므로, 단일 `@Transactional`로 양쪽을 묶을 수 없다.

### 해결 방향

```text
@Transactional으로 묶어야 하는 것:
  - participant 조회/생성 (PostgreSQL)
  - NPC participant 조회 (PostgreSQL)

@Transactional 밖에 있어야 하는 것:
  - Cassandra 메시지 저장
  - (Phase 5) LLM 호출
```

participant 관련 로직을 별도 `@Transactional` 메서드로 분리하는 것이 깔끔하다. 메시지 저장은 Cassandra이므로 PostgreSQL 트랜잭션과 무관하다.

### 트레이드오프: 트랜잭션 범위

넓게 잡으면 정합성은 올라가지만 DB 커넥션 점유 시간이 늘어난다. 특히 Phase 5에서 LLM 호출이 들어오면 응답에 수 초가 걸릴 수 있는데, 이걸 트랜잭션 안에 넣으면 커넥션 풀이 고갈된다.

```text
[나쁜 예]
@Transactional
void execute() {
    participant = getOrCreate();     // DB
    npc = loadNpc();                 // DB
    userMsg = save(cassandra);       // Cassandra (트랜잭션 의미 없음)
    llmResponse = callLLM();         // 3초 대기 (커넥션 점유!)
    npcMsg = save(cassandra);        // Cassandra
}

[좋은 예]
void execute() {
    participant = ensureParticipant();  // @Transactional (짧게 끊김)
    userMsg = save(cassandra);
    llmResponse = callLLM();           // 트랜잭션 밖
    npcMsg = save(cassandra);
}
```

---

## 이슈 3: STOMP 메시지 입력값 검증 부재 [해결됨]

> **[해결됨]** `SendMessageUseCase.Command`의 compact constructor에서 body 검증이 구현되었다.

### 문제

REST DTO에는 검증이 있다:

```java
// REST
public record SendMessageRequest(
    @NotBlank @Size(max = 1000) String body
) {}
```

STOMP DTO에는 검증이 없다:

```java
// STOMP
public record StompSendMessageRequest(String body) {}
```

빈 문자열, null, 10만 자 메시지가 그대로 서비스 레이어까지 내려간다.

### 왜 이런 일이 생기는가

REST에서는 `@Valid`를 붙이면 Spring MVC의 `MethodValidationPostProcessor`가 자동으로 검증한다. STOMP의 `@MessageMapping`에서도 `@Payload @Validated`를 사용하면 검증이 동작하긴 한다. 하지만 Spring Framework의 [관련 이슈(SPR-11185)](https://github.com/spring-projects/spring-framework/issues/15811)에서 볼 수 있듯이 이 지원은 역사적으로 불완전했고, 버전에 따라 동작이 다를 수 있다.

### 선택지 비교

| | A. STOMP DTO에도 @Validated 추가 | B. UseCase Command에서 검증 | C. 핸들러에서 수동 검증 |
|--|---------|---------|---------|
| 핵심 개념 | `@Payload @Validated`로 프레임워크 검증 활용 | Command 생성 시 `Preconditions` 체크 | 핸들러 메서드 내부에서 if문으로 체크 |
| 장점 | REST와 동일한 패턴. 어노테이션만 추가하면 됨 | REST/STOMP 두 경로 모두 통과하는 단일 검증 지점 | 가장 명시적. 동작 보장이 확실 |
| 단점 | Spring 버전에 따라 동작이 불안정할 수 있음 | 프레임워크 검증(@Valid)과 수동 검증이 이중으로 존재 | 검증 로직이 산재. DTO가 늘어나면 누락 위험 |
| 적합한 상황 | 프레임워크를 신뢰할 수 있는 환경 | 입력 경로가 다양한 헥사고날 구조 | 검증 대상이 적고 단순할 때 |

**이 프로젝트에서는 B가 가장 적합하다.** 헥사고날 아키텍처에서 UseCase Command는 모든 입력 경로(REST, STOMP, Kafka 이벤트)가 반드시 거치는 지점이다. 여기서 검증하면 어댑터가 뭐든 상관없이 일관된 검증이 보장된다.

```java
// UseCase Command에서 검증
public record Command(long userId, long chatRoomId, String body) {
    public Command {
        if (body == null || body.isBlank()) {
            throw new InvalidMessageBodyException("메시지 본문은 비어있을 수 없습니다");
        }
        if (body.length() > 1000) {
            throw new InvalidMessageBodyException("메시지는 1000자를 초과할 수 없습니다");
        }
    }
}
```

---

## 이슈 4: WebSocket CORS와 REST CORS 불일치 [해결됨]

> **[해결됨]** `setAllowedOriginPatterns("*")`는 `setAllowedOrigins("http://localhost:3000", "http://localhost:3001")`로 수정되었다.

### 문제

```java
// REST (SecurityConfig)
config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:3001"));

// WebSocket (WebSocketConfig) — 당시 코드
registry.addEndpoint("/ws").setAllowedOriginPatterns("*");  // 모든 origin 허용
```

REST는 특정 origin만 허용하는데 WebSocket은 전부 열려있다. 공격자가 악의적인 페이지에서 WebSocket 연결을 맺을 수 있다(Cross-Site WebSocket Hijacking, CSWSH).

### 해결

동일한 origin 목록을 사용해야 한다. 하드코딩을 피하고 `application.yml`로 외부화하면 두 곳에서 같은 값을 참조할 수 있다.

```yaml
app:
  cors:
    allowed-origins:
      - http://localhost:3000
      - http://localhost:3001
```

개발 중에 `*`를 쓰고 싶은 유혹이 있지만, 개발 환경의 보안 구멍이 프로덕션까지 따라가는 일이 너무 흔하다. 처음부터 제한하는 습관이 안전하다.

---

## 이슈 5: STOMP 에러 핸들러 미등록 [해결됨]

> **[해결됨]** `StompErrorHandler.java`가 구현되어 등록되었다.

### 문제

`@MessageExceptionHandler`나 `StompSubProtocolErrorHandler`가 등록되어 있지 않다. STOMP 메시지 처리 중 예외가 발생하면 Spring이 기본 동작으로 **스택 트레이스를 포함한 ERROR 프레임**을 클라이언트에게 보낸다.

이건 두 가지 면에서 위험하다:

- **보안**: 내부 패키지 경로, 클래스명, DB 관련 정보가 노출될 수 있다
- **UX**: 클라이언트가 받는 에러 메시지가 유저에게 의미 없는 자바 예외 메시지다

### 해결

`StompSubProtocolErrorHandler`를 상속해서 에러 메시지를 마스킹한다.

```java
public class ChatStompErrorHandler extends StompSubProtocolErrorHandler {
    @Override
    public Message<byte[]> handleClientMessageProcessingError(
            Message<byte[]> clientMessage, Throwable ex) {
        // 스택 트레이스 대신 generic 메시지만 전달
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.ERROR);
        accessor.setMessage("메시지 처리 중 오류가 발생했습니다");
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
```

그리고 `WebSocketConfig`에서 등록:

```java
registry.setErrorHandler(new ChatStompErrorHandler());
```

REST에서는 `@RestControllerAdvice`로 예외를 잡아서 안전한 응답을 만드는 게 당연한데, STOMP에서는 이걸 잊기 쉽다. **입력 경로가 다르면 에러 처리도 따로 챙겨야 한다.**

---

## 이슈 6: 프론트엔드 disconnectStomp() 비동기 레이스

### 문제

```typescript
export function disconnectStomp(): void {
  void stompClient?.deactivate();  // Promise를 await하지 않음
  stompClient = null;              // 즉시 null로 설정
}
```

`deactivate()`는 Promise를 반환한다. `void`로 무시하고 바로 `stompClient = null`을 해버리면:

1. `deactivate()`가 완료되기 전에 모듈 레벨 변수가 null이 된다
2. React Strict Mode에서 `useEffect`의 cleanup이 호출된 직후 다시 mount가 되면, `getStompClient()`가 새 인스턴스를 만든다
3. 이전 인스턴스의 `deactivate()`가 아직 진행 중이므로 이중 연결이 발생할 수 있다

### 해결

```typescript
export async function disconnectStomp(): Promise<void> {
  const client = stompClient;
  stompClient = null;  // 먼저 null로 설정해서 다른 호출에서 같은 인스턴스를 쓰지 않도록
  await client?.deactivate();
}
```

그리고 `useStomp.ts`의 cleanup에서는 mounted flag 패턴으로 이중 연결을 방지한다:

```typescript
useEffect(() => {
  let mounted = true;
  
  connectWithAuth(token, () => {
    if (!mounted) return;  // 이미 unmount된 상태면 구독하지 않음
    // ...구독 로직
  });
  
  return () => {
    mounted = false;
    disconnectStomp();
  };
}, []);
```

이건 React 18+ Strict Mode에서 거의 모든 비동기 Effect에 해당하는 패턴이다. Strict Mode는 개발 환경에서 Effect를 두 번 실행해서 cleanup이 제대로 되는지 검증하는데, 비동기 처리가 없으면 이 검증에서 버그가 드러난다.

---

## 전체 패턴 정리: 실시간 서비스 리뷰 체크리스트

이번 리뷰에서 발견된 이슈들을 일반화하면 실시간 서비스에서 반복적으로 확인해야 할 패턴이 나온다.

```text
[동시성]
- "조회 -> 없으면 생성" 패턴이 있는가? → UNIQUE 제약조건 확인
- 상태 변경 로직에 @Transactional이 적절히 걸려있는가?
- 외부 호출(LLM, API)이 트랜잭션 안에 있지는 않은가?

[입력 검증]
- REST가 아닌 입력 경로(STOMP, Kafka)에도 검증이 있는가?
- 검증 로직이 하나의 지점(UseCase)에 모여있는가?

[보안]
- WebSocket CORS가 REST CORS와 동일한가?
- STOMP 에러 핸들러가 등록되어 있는가? (스택 트레이스 노출 방지)
- 에러 메시지에 내부 정보가 포함되지 않는가?

[프론트엔드 비동기]
- Promise를 반환하는 함수를 void로 무시하고 있지 않은가?
- React Strict Mode에서 이중 mount를 고려했는가?
- cleanup에서 비동기 작업이 완료될 때까지 기다리는가?
```

---

## 실전에서 주의할 점

- **"단일 요청에서 잘 돌아간다"는 테스트 통과 조건이 아니다.** Critical Rule #6이 이 프로젝트에 있는 이유다. 동시성 테스트는 "두 스레드가 동시에 같은 일을 하면?"이라는 질문에서 시작한다. `CountDownLatch`나 `ExecutorService`로 동시 요청을 시뮬레이션하는 테스트를 기능 구현과 함께 작성해야 한다.

- **혼합 저장소에서 "전부 성공 또는 전부 실패"는 환상이다.** PostgreSQL + Cassandra처럼 트랜잭션 매니저가 다른 저장소를 쓰면, 분산 트랜잭션(2PC) 없이는 원자성을 보장할 수 없다. 현실적인 전략은 "PostgreSQL 작업만 트랜잭션으로 묶고, Cassandra 실패 시 보상 로직(retry/event 기반 재처리)"이다.

- **STOMP는 REST의 보안 인프라를 공유하지 않는다.** `SecurityFilterChain`, `@RestControllerAdvice`, `@Valid` 같은 REST에서 당연하게 쓰던 것들이 STOMP에서는 동작하지 않거나 별도 설정이 필요하다. 새로운 입력 경로를 추가할 때마다 "REST에서 자동으로 처리되던 것 중 여기서 빠진 게 뭐지?"라고 질문해야 한다.

- **`void promise`는 코드 냄새다.** TypeScript에서 `void someAsyncFunction()`은 "이 Promise의 결과에 관심 없다"는 의도적 표현이지만, 실제로는 에러를 삼키고 경쟁 상태를 만든다. ESLint의 `@typescript-eslint/no-floating-promises` 규칙을 켜두면 이런 패턴을 잡을 수 있다.

---

## 나중에 돌아보면

- **check-then-act 패턴이 다른 도메인에서 다시 나타나는 시점:** 아이템 구매, 공간 점유, 친구 요청 등 "없으면 생성"하는 모든 로직에서 같은 문제가 반복된다. UNIQUE 제약 + catch 패턴을 프로젝트 전체의 표준 패턴으로 정립하는 게 좋다.

- **입력 검증을 UseCase Command에서 하는 게 귀찮아지는 시점:** Command가 수십 개가 되면 각각에 수동 검증을 넣는 게 반복 작업이 된다. 그때 `jakarta.validation`을 Command에 적용하고 `Validator`를 UseCase 진입점에서 자동 실행하는 인프라를 만들 수 있다.

- **STOMP 에러 핸들러가 정교해져야 하는 시점:** 지금은 모든 에러를 generic 메시지로 마스킹하지만, 클라이언트가 에러 종류에 따라 다른 행동을 해야 할 때(토큰 만료 -> 재인증, 권한 없음 -> 안내 메시지, 서버 오류 -> 재시도) 에러 코드 체계가 필요해진다.

- **이 학습노트 자체가 필요 없어지는 시점:** 여기 적힌 패턴들이 자동화된 리뷰 체크리스트나 아키텍처 테스트(ArchUnit)로 강제되면, 사람이 기억에 의존할 필요가 없어진다.

---

## 더 공부할 거리

### 직접 관련

- 관련 학습노트: [15-websocket-stomp-deep-dive.md](./15-websocket-stomp-deep-dive.md) -- STOMP 프로토콜 동작 원리, 메시지 흐름
- 관련 학습노트: [24-stomp-websocket-jwt-channel-interceptor.md](./24-stomp-websocket-jwt-channel-interceptor.md) -- STOMP 인증 파이프라인, REST와 STOMP의 인증 이중 체계
- 관련 학습노트: [25-batch-broadcast-multiuser-message-attribution.md](./25-batch-broadcast-multiuser-message-attribution.md) -- 배치 broadcast와 메시지 귀속 패턴
- 관련 학습노트: [21-village-public-chat-architecture.md](./21-village-public-chat-architecture.md) -- 마을 공개 채팅 전체 아키텍처

### 동시성과 데이터 정합성

- [Fixing a Race Condition (Medium)](https://medium.com/in-the-weeds/fixing-a-race-condition-c8b475fbb994) -- check-then-act 레이스 컨디션의 실전 사례와 UNIQUE 제약을 이용한 해결
- [Winning Race Conditions With PostgreSQL (DEV.to)](https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn) -- PostgreSQL의 UNIQUE index와 INSERT ON CONFLICT를 활용한 동시성 처리
- [How to handle unique constraint violations (Enterprise Craftsmanship)](https://enterprisecraftsmanship.com/posts/handling-unique-constraint-violations/) -- 제약 위반을 예외로 처리할 때의 설계 고민

### STOMP 검증과 에러 처리

- [Spring Framework Issue SPR-11185: @Valid in @MessageMapping](https://github.com/spring-projects/spring-framework/issues/15811) -- @MessageMapping에서 @Valid 지원의 역사. 왜 REST처럼 자연스럽게 동작하지 않았는지 맥락을 알 수 있다
- [StompSubProtocolErrorHandler API 문서](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/messaging/StompSubProtocolErrorHandler.html) -- STOMP 에러 핸들링의 공식 진입점
- [WebSockets With Spring, Part 3: STOMP Over WebSocket (Medium)](https://medium.com/swlh/websockets-with-spring-part-3-stomp-over-websocket-3dab4a21f397) -- StompSubProtocolErrorHandler 구현 예시 포함

### WebSocket 보안

- [Spring Security: WebSocket Security](https://docs.spring.io/spring-security/reference/servlet/integrations/websocket.html) -- CSRF, CORS, message-level authorization 설정
- CSWSH(Cross-Site WebSocket Hijacking) -- `setAllowedOriginPatterns("*")`가 왜 위험한지. Origin 검증 없이 WebSocket 연결을 허용하면 악의적 사이트에서 인증된 유저의 세션을 탈취할 수 있다

### React 비동기 패턴

- React 18 Strict Mode의 double-mount 동작 -- 개발 환경에서 Effect를 두 번 실행하는 이유와 cleanup의 중요성
- `@typescript-eslint/no-floating-promises` -- void로 무시된 Promise를 린트에서 잡는 방법

### 다음 단계로 고민할 것

- ArchUnit으로 "UseCase Command에 검증이 있는가"를 자동 체크할 수 있는가?
- STOMP 에러 코드 체계 설계 (REST의 ErrorCode enum과 통합할 것인가, 분리할 것인가)
- 혼합 저장소(PostgreSQL + Cassandra) 환경에서의 보상 트랜잭션 패턴
