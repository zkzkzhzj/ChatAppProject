# 24. STOMP WebSocket JWT 인증 -- ChannelInterceptor로 CONNECT 프레임에서 인증하기

> 작성 시점: 2026-04-13
> 맥락: 마을 공개 채팅 구현 중, REST API의 JWT 인증은 SecurityFilterChain이 처리하지만 STOMP 메시지에는 동일한 필터가 적용되지 않는 문제를 만났다. WebSocket 연결 이후의 STOMP 프레임을 어떻게 인증할 것인가.

---

## 배경

Spring Security의 `SecurityFilterChain`은 HTTP 요청에 대해 동작한다. WebSocket 핸드셰이크도 HTTP 요청이므로 여기서는 필터가 동작한다. 그런데 핸드셰이크 이후에는?

```
[HTTP GET /ws]  ← SecurityFilterChain 동작 (Upgrade 요청)
    │
    ▼ 101 Switching Protocols
    │
[WebSocket 연결 수립]  ← 이 시점부터 HTTP가 아니다
    │
    ▼
[STOMP CONNECT]  ← SecurityFilterChain이 보지 못한다
[STOMP SUBSCRIBE]
[STOMP SEND]
```

핸드셰이크 이후의 STOMP 프레임은 Spring의 **메시징 레이어**에서 처리된다. HTTP 필터 체인과는 완전히 다른 파이프라인이다. 따라서 STOMP CONNECT 프레임에서 JWT를 꺼내 인증하려면 메시징 레이어에 인터셉터를 등록해야 한다.

---

## 선택지 비교

|  | A. HandshakeInterceptor | B. ChannelInterceptor | C. Spring Security MessageSecurity |
|--|---------|---------|---------|
| 핵심 개념 | HTTP 핸드셰이크 시점에 쿼리 파라미터나 쿠키에서 토큰 추출 | STOMP CONNECT 프레임의 헤더에서 토큰 추출 | `@EnableWebSocketSecurity` + `AuthorizationManager`로 메시지 레벨 권한 제어 |
| 장점 | 인증 실패 시 WebSocket 연결 자체를 거부한다. 리소스 낭비 없음. HTTP 표준 메커니즘 사용 | STOMP 네이티브 헤더에 토큰을 실어 보내므로 클라이언트 코드가 자연스럽다. SockJS와 호환성 좋음. CONNECT 시점에 `accessor.setUser()`로 Principal 설정 가능 | Spring Security의 선언적 보안 모델과 일관성. `@MessageMapping`별 권한 제어 가능 |
| 단점 | 토큰을 URL 쿼리에 넣으면 서버 로그에 남을 수 있다 (보안 이슈). SockJS는 HTTP 핸드셰이크 시 커스텀 헤더를 지원하지 않는다 -- `Authorization` 헤더를 보낼 수 없음 | 연결은 이미 수립된 상태에서 인증하므로, 인증 실패해도 TCP 연결이 잠깐 유지된다 | 설정이 복잡하다. STOMP 인증과 HTTP 인증 설정이 섞여 혼란스러울 수 있음. Spring Boot 4.x에서 설정 방식이 크게 바뀜 |
| 적합한 상황 | SockJS를 안 쓰고 네이티브 WebSocket만 쓸 때. 쿠키 기반 세션 인증 | SockJS + STOMP 조합. JWT 토큰 인증. 대부분의 실전 프로젝트 | 메시지 목적지별로 세밀한 권한 제어가 필요할 때 (관리자 채널, 읽기 전용 채널 등) |
| 실제 사용 사례 | 순수 WebSocket API 서버 | Spring 공식 문서 권장 패턴, 대부분의 Spring STOMP 튜토리얼 | 엔터프라이즈 메시징 시스템 |

---

## 이 프로젝트에서 고른 것

**선택: B. ChannelInterceptor**

이유:
1. **SockJS를 쓰고 있다.** SockJS의 HTTP fallback(Long Polling, HTTP Streaming)에서는 커스텀 HTTP 헤더를 보낼 수 없다. 그래서 HandshakeInterceptor에서 `Authorization` 헤더를 읽는 건 불가능하다. 쿼리 파라미터에 토큰을 넣을 수 있지만 보안 리스크가 있다.
2. **STOMP 네이티브 헤더는 SockJS와 무관하게 동작한다.** STOMP CONNECT 프레임의 헤더는 STOMP 프로토콜 레벨이므로, 전송 방식(WebSocket이든 Long Polling이든)에 상관없이 항상 전달된다.
3. **Spring 공식 문서가 이 방식을 권장한다.** [Token Authentication 공식 문서](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html)에서 ChannelInterceptor를 사용한 STOMP CONNECT 인증을 설명하고 있다.

---

## 핵심 개념 정리

### 왜 HTTP 필터가 STOMP 프레임을 못 보는가

이해하려면 Spring의 두 가지 메시지 처리 파이프라인을 알아야 한다.

```
HTTP 파이프라인 (Servlet Filter Chain):
    요청 → Filter1 → Filter2 → ... → DispatcherServlet → Controller

메시징 파이프라인 (Message Channel):
    STOMP 프레임 → ChannelInterceptor1 → ChannelInterceptor2 → ... → @MessageMapping Handler
```

WebSocket 핸드셰이크(`GET /ws`)는 HTTP 파이프라인을 탄다. 하지만 핸드셰이크가 끝나고 `101 Switching Protocols` 이후에는 TCP 연결 위에서 STOMP 프레임이 직접 오간다. 이건 HTTP가 아니므로 Servlet Filter Chain을 거치지 않는다.

Spring은 STOMP 프레임을 `clientInboundChannel`이라는 메시지 채널로 받는다. 이 채널에 인터셉터를 등록하는 것이 ChannelInterceptor 방식이다.

### ChannelInterceptor 동작 흐름

```
클라이언트 STOMP CONNECT (Authorization: Bearer xxx)
    │
    ▼
clientInboundChannel
    │
    ▼
StompAuthChannelInterceptor.preSend()
    ├── CONNECT가 아닌 프레임 → 그냥 통과
    ├── 토큰 없음 → 게스트로 통과 (Principal 미설정)
    ├── 토큰 유효 → accessor.setUser(authenticatedUser)
    └── 토큰 만료/위조 → MessageDeliveryException throw
                          → 클라이언트에 STOMP ERROR 프레임 전달
    │
    ▼
이후 SEND/SUBSCRIBE 프레임에서 Principal 자동 사용
```

핵심 코드는 딱 두 줄이다:

```java
accessor.setUser(
    jwtProvider.parse(token)
        .orElseThrow(() -> new MessageDeliveryException("Invalid or expired token"))
);
```

`StompHeaderAccessor.setUser()`는 `java.security.Principal`을 요구한다. 그래서 `AuthenticatedUser`가 `Principal` 인터페이스를 구현해야 했다. 이건 REST 쪽에서는 필요 없던 요구사항이다 -- REST에서는 `SecurityContext`에 `Authentication` 객체를 넣고, `@AuthenticationPrincipal`이 거기서 꺼내기 때문이다.

### Principal vs @AuthenticationPrincipal -- STOMP에서 왜 다른가

REST Controller에서는 `@AuthenticationPrincipal AuthenticatedUser user`로 인증 정보를 받는다. 그런데 `@MessageMapping` 핸들러에서는 이게 동작하지 않는다.

```java
// REST Controller -- 동작한다
@GetMapping("/api/v1/me")
public Response me(@AuthenticationPrincipal AuthenticatedUser user) { ... }

// STOMP Handler -- @AuthenticationPrincipal은 동작하지 않는다
@MessageMapping("/chat/village")
public void handleMessage(
        @Payload StompSendMessageRequest request,
        Principal principal) {  // Principal로 받아야 한다
    AuthenticatedUser user = (AuthenticatedUser) principal;
}
```

이유: `@AuthenticationPrincipal`은 `SecurityContextHolder`에서 `Authentication.getPrincipal()`을 꺼낸다. STOMP 메시징 파이프라인에서는 `SecurityContextHolder`가 세팅되지 않는다. 대신 STOMP 세션에 바인딩된 `user` 헤더(= `accessor.setUser()`로 설정한 값)가 `Principal` 파라미터로 주입된다.

`@AuthenticationPrincipal`을 STOMP에서 쓰려면 `WebSocketMessageBrokerConfigurer.addArgumentResolvers()`에 `AuthenticationPrincipalArgumentResolver`를 수동 등록해야 한다. 가능은 하지만, 우리 프로젝트에서는 `Principal`로 받고 `instanceof` 체크하는 방식이 더 명시적이라고 판단했다.

```java
if (!(principal instanceof AuthenticatedUser user) || user.isGuest()) {
    throw new GuestChatNotAllowedException();
}
```

### 게스트 접속 허용 -- 왜 토큰 없이 CONNECT를 허용하는가

```java
if (authHeaders == null || authHeaders.isEmpty()) {
    // 토큰 없이 연결 허용 (게스트 접속, 채팅은 불가)
    return message;
}
```

토큰 없이도 WebSocket 연결 자체는 허용한다. 이렇게 하면:
- 비로그인 유저도 마을에 들어가서 공개 채팅을 **읽을** 수 있다
- 메시지를 **보내려고** 하면 `@MessageMapping` 핸들러에서 `Principal`이 null이므로 거부당한다

"읽기는 되고 쓰기는 안 되는" 게스트 모드를 자연스럽게 구현할 수 있다.

### 인증 이중 체계 -- REST와 STOMP

```
REST API 인증:
    HTTP 요청 → JwtFilter (SecurityFilterChain) → SecurityContextHolder에 Authentication 세팅
    → @AuthenticationPrincipal로 접근

STOMP 인증:
    STOMP CONNECT → StompAuthChannelInterceptor (ChannelInterceptor) → accessor.setUser()
    → Principal 파라미터로 접근
```

같은 `JwtProvider.parse()`를 쓰지만, 인증 결과를 저장하는 위치가 다르다. REST는 `SecurityContextHolder`(스레드 로컬), STOMP는 STOMP 세션의 `user` 헤더다. 코드 중복처럼 보이지만 각 레이어의 메시지 처리 파이프라인이 다르기 때문에 불가피하다.

---

## 실전에서 주의할 점

- **STOMP CONNECT는 세션당 한 번만 온다.** 인터셉터에서 CONNECT만 처리하므로, 연결 중에 토큰이 만료되면 감지할 수 없다. 장시간 연결 시 토큰 갱신 전략이 필요하다. 선택지: (1) 클라이언트가 만료 전에 재연결, (2) 서버에서 heartbeat와 함께 토큰 유효성 주기적 검증, (3) DISCONNECT 후 새 토큰으로 재CONNECT.
- **`MessageDeliveryException`을 던지면 STOMP ERROR 프레임이 간다.** 클라이언트의 `onStompError` 콜백에서 이걸 받아 재인증 로직을 태워야 한다. 에러 메시지에 민감 정보를 담지 않도록 주의한다 ("Invalid token" 정도가 적절, 토큰 디코딩 실패 상세는 서버 로그로만).
- **SockJS + 커스텀 HTTP 헤더의 함정.** SockJS를 쓰면 HTTP 핸드셰이크에 `Authorization` 헤더를 넣을 수 없다. JavaScript의 `new SockJS(url)`은 커스텀 헤더를 지원하지 않기 때문이다. 그래서 토큰은 반드시 STOMP CONNECT 프레임의 네이티브 헤더로 보내야 한다. 이건 SockJS를 쓰는 한 바꿀 수 없는 제약이다.
- **`Principal`을 설정하지 않으면 `convertAndSendToUser()`가 동작하지 않는다.** 나중에 개인 알림(`/queue/notification`)을 구현할 때 `SimpMessagingTemplate.convertAndSendToUser()`를 쓰게 되는데, 이 메서드는 STOMP 세션의 `Principal.getName()`을 기준으로 대상을 찾는다. 게스트 세션에는 Principal이 없으므로 개인 메시지를 받을 수 없다.

---

## 나중에 돌아보면

- **SockJS를 걷어내고 네이티브 WebSocket만 쓰게 되면**: HandshakeInterceptor로 인증 시점을 앞당길 수 있다. 연결 자체를 거부하므로 리소스 낭비가 줄어든다. 하지만 SockJS fallback이 필요 없어지는 시점은 구형 브라우저/네트워크 환경을 완전히 포기할 수 있을 때다.
- **메시지별 세밀한 권한 제어가 필요해지면**: `@EnableWebSocketSecurity` + `AuthorizationManager<Message<?>>` 조합을 도입한다. 예: "관리자만 공지 채널에 SEND 가능", "밴된 유저는 SUBSCRIBE 불가" 같은 정책. 현재는 CONNECT 시점 인증 + 핸들러 레벨 게스트 체크로 충분하다.
- **토큰 만료가 실제 문제가 되는 시점**: 유저가 채팅 중 갑자기 끊기는 경험을 하면, CONNECT 시점 인증만으로는 부족하다는 뜻이다. 그때 heartbeat 기반 토큰 재검증이나 silent refresh 전략을 검토한다.
- **이 결정이 틀렸다고 느끼는 순간**: "인증되지 않은 WebSocket 연결이 서버 리소스를 과도하게 차지할 때". 게스트 CONNECT를 허용하므로 악의적인 연결 폭탄에 취약하다. 그때는 HandshakeInterceptor에서 rate limiting을 추가하거나, 연결 자체를 인증 필수로 전환해야 한다.

---

## 더 공부할 거리

### 직접 관련
- 관련 학습노트: [15-websocket-stomp-deep-dive.md](./15-websocket-stomp-deep-dive.md) -- STOMP 프로토콜 동작 원리, Simple Broker, 메시지 흐름
- 관련 학습노트: [11-security-config-patterns.md](./11-security-config-patterns.md) -- Spring Security 설정 패턴, SecurityFilterChain 구성
- 관련 학습노트: [23-chatroom-structure-space-equals-room.md](./23-chatroom-structure-space-equals-room.md) -- 채팅방 구조와 STOMP 토픽 설계

### 공식 문서
- [Spring Framework: Token Authentication for WebSocket STOMP](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html) -- ChannelInterceptor를 이용한 토큰 인증의 공식 가이드
- [Spring Framework: Authentication in WebSocket](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication.html) -- WebSocket 인증의 전체 그림
- [Spring Security: WebSocket Security](https://docs.spring.io/spring-security/reference/servlet/integrations/websocket.html) -- `@EnableWebSocketSecurity`, 메시지 레벨 권한 제어

### 실전 가이드
- [Overcome WebSocket's Authentication and Authorization Issues (Softbinator)](https://blog.softbinator.com/overcome-websocket-authentication-issues-stomp/) -- HandshakeInterceptor vs ChannelInterceptor 비교, 실전 코드 예시
- [Intro to Security and WebSockets (Baeldung)](https://www.baeldung.com/spring-security-websockets) -- Spring Security + WebSocket 통합 튜토리얼
- [WebSocket에서 JWT 인증 구현 (velog)](https://velog.io/@hyunsoo730/WebSocket%EC%97%90%EC%84%9C-JWT-%EC%9D%B8%EC%A6%9D-%EA%B5%AC%ED%98%84) -- 한글 자료, SockJS + STOMP + JWT 조합의 실전 구현기

### 더 깊이 파려면
- STOMP 프로토콜 스펙: [STOMP 1.2 Specification](https://stomp.github.io/stomp-specification-1.2.html) -- CONNECT 프레임의 정확한 동작, ERROR 프레임 스펙
- Spring의 `AbstractBrokerMessageHandler` 소스코드 -- Simple Broker가 세션과 Principal을 어떻게 매핑하는지 이해하려면 이 코드를 읽어야 한다
- WebSocket 보안 위협: CSWSH(Cross-Site WebSocket Hijacking) -- Origin 검증을 `setAllowedOriginPatterns("*")`로 열어둔 상태에서의 보안 리스크. 프로덕션 전에 반드시 제한해야 한다
