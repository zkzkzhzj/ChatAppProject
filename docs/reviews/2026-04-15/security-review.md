# 보안 리뷰 -- 2026-04-15

> 검증 도구: Grep/Read 기반 수동 정밀 검증 (Codex CLI 미사용 -- 환경 제약)
> 검증 범위: backend 전체 + frontend WebSocket 클라이언트

---

## 보안 전문 패턴 분석

### [CRITICAL]

#### C1. CSRF 비활성화 상태에서 STOMP 메시지 위조 가능
- **파일**: `identity/adapter/in/security/SecurityConfig.java:35`
- **내용**: `.csrf(AbstractHttpConfigurer::disable)` — CSRF가 완전 비활성화되어 있다. REST API는 JWT Bearer 토큰으로 보호되므로 CSRF가 불필요하지만, **STOMP WebSocket 메시지에 대한 CSRF 보호도 함께 비활성화된다.** 현재 STOMP 인증이 CONNECT 프레임에서만 이루어지므로(C2 참조), 세션 하이재킹 시 SEND 프레임 위조가 가능하다.
- **판단**: STATELESS + JWT 구조에서 CSRF 비활성화 자체는 일반적 관행이다. 다만 WebSocket 경로에 대한 추가 보호가 필요하므로 C2와 연계하여 해결해야 한다.

#### C2. WebSocket 토큰 없이 연결 허용 (인증 우회 가능)
- **파일**: `global/config/StompAuthChannelInterceptor.java:40-42`
- **내용**: Authorization 헤더가 없으면 `return message`로 **토큰 없이 STOMP 연결을 허용**한다. 주석에 "게스트 접속, 채팅은 불가"라고 되어 있으나, 인증 없는 WebSocket 세션이 `/topic/*` 구독을 자유롭게 할 수 있다.
- **영향**: 인증 없이 연결한 세션이 `/topic/village/positions`를 구독하면 모든 유저의 실시간 위치를 도청할 수 있다. `/topic/chat/village`도 동일.
- **권장**: CONNECT 시 토큰 필수화하거나, 구독(SUBSCRIBE) 프레임에서도 인증 상태를 검증하는 인터셉터를 추가해야 한다.

#### C3. JWT 시크릿 키 기본값이 추측 가능한 문자열
- **파일**: `application.yml:63`
- **내용**: `jwt.secret: ${JWT_SECRET:change-me-in-production-this-is-a-256-bit-secret-key-placeholder}`
- **영향**: 환경변수 `JWT_SECRET`이 설정되지 않은 채 배포되면, 공격자가 이 기본값으로 유효한 JWT를 위조하여 임의 사용자로 인증할 수 있다. "change-me" 패턴은 GitHub 검색으로 쉽게 발견된다.
- **권장**: 프로덕션에서는 기본값을 제거하고 환경변수 미설정 시 애플리케이션 기동을 실패시켜야 한다. `@Value`에 기본값을 주지 않거나, `@PostConstruct`에서 "change-me" 포함 여부를 검증한다.

#### C4. STOMP 메시지 입력 검증 부재 -- 위치 좌표
- **파일**: `village/adapter/in/websocket/PositionRequest.java:4`
- **내용**: `public record PositionRequest(double x, double y) { }` -- 좌표에 대한 범위 검증이 전혀 없다. `Double.MAX_VALUE`, `NaN`, `Infinity` 등 비정상 값을 전송할 수 있다.
- **영향**: 다른 클라이언트에게 비정상 좌표가 broadcast되어 프론트엔드 렌더링 오류 또는 DoS를 유발할 수 있다.
- **권장**: 서버 측에서 좌표 범위를 검증한다 (예: 맵 크기 기준 0~maxWidth, 0~maxHeight).

#### C5. STOMP 메시지 입력 검증 부재 -- 채팅 메시지
- **파일**: `communication/adapter/in/websocket/StompSendMessageRequest.java:3`
- **내용**: `public record StompSendMessageRequest(String body) { }` -- REST API의 `SendMessageRequest`는 `@NotBlank @Size(max=1000)` 검증이 있으나, STOMP 경로의 Request에는 **검증 어노테이션이 전혀 없다.**
- **영향**: STOMP 경로로 null, 빈 문자열, 또는 수만 자의 메시지를 전송할 수 있다. DB 저장 시 오류가 발생하거나, 대용량 메시지가 모든 구독자에게 broadcast되어 메모리/네트워크 자원을 소진할 수 있다.
- **권장**: `ChatMessageHandler.handleMessage()`에서 body의 null/공백/길이를 명시적으로 검증한다.

---

### [WARNING]

#### W1. WebSocket 엔드포인트가 Security Filter 우회
- **파일**: `application.yml:72` + `SecurityConfig.java:39`
- **내용**: `/ws/**`가 `permitAll()`로 설정되어 Spring Security 필터 체인을 통과한다. WebSocket 보안은 `StompAuthChannelInterceptor`에 위임하고 있으나, C2에서 지적한 대로 인터셉터의 검증이 불완전하다.
- **판단**: WebSocket은 HTTP 업그레이드 후 별도 프로토콜이므로 `permitAll()`은 일반적이지만, 인터셉터 보안이 강화되어야 의미가 있다.

#### W2. Actuator 엔드포인트 로컬 전체 노출
- **파일**: `application-local.yml:5`
- **내용**: 로컬 환경에서 `/actuator/**` 전체가 public으로 열린다. `management.endpoints.web.exposure.include`에 `health,info,metrics`가 설정되어 있어 실제 노출 범위는 제한적이나, 프로파일이 잘못 적용되면 프로덕션에서도 노출될 수 있다.
- **권장**: `actuator`에 별도 인증을 적용하거나, 프로덕션 프로파일에서는 명시적으로 차단한다.

#### W3. CORS AllowedHeaders 와일드카드
- **파일**: `SecurityConfig.java:56`
- **내용**: `config.setAllowedHeaders(List.of("*"))` -- 모든 헤더를 허용한다. `allowCredentials(true)`와 함께 사용되므로 보안상 바람직하지 않다.
- **권장**: 필요한 헤더만 명시한다 (Authorization, Content-Type, Accept 등).

#### W4. CORS 설정이 하드코딩
- **파일**: `SecurityConfig.java:54` + `WebSocketConfig.java:40`
- **내용**: `http://localhost:3000`, `http://localhost:3001`이 코드에 하드코딩되어 있다. 프로덕션 배포 시 도메인 변경이 필요하며, 환경변수화가 누락되어 있다.
- **권장**: `application.yml`로 분리하여 환경별로 설정 가능하게 한다.

#### W5. DB 비밀번호 기본값 존재
- **파일**: `application.yml:8-9`
- **내용**: `username: ${DB_USERNAME:gohyang}`, `password: ${DB_PASSWORD:gohyang}` -- 환경변수 미설정 시 기본값 `gohyang`으로 접속한다. C3과 동일한 패턴으로, 프로덕션 배포 시 위험하다.
- **권장**: 프로덕션 프로파일에서는 기본값을 제거한다.

#### W6. 대화 요약 로그에 사용자 대화 내용 노출 가능
- **파일**: `communication/adapter/in/messaging/ConversationSummaryEventConsumer.java:87`
- **내용**: `log.info("... summary={}", userId, ..., summary)` -- 대화 요약 텍스트가 INFO 레벨 로그에 출력된다. 요약이라도 사용자의 개인적 대화 내용이 포함될 수 있다.
- **권장**: 요약 텍스트는 DEBUG 레벨로 낮추거나, 로그에서 제외한다.

#### W7. Swagger UI가 공개 경로에 포함
- **파일**: `application.yml:73-76`
- **내용**: `/swagger-ui/**`, `/v3/api-docs/**`가 `permitAll()`이다. 개발 환경에서는 편리하지만, 프로덕션에서는 API 구조가 완전히 노출된다.
- **권장**: 프로덕션 프로파일에서는 Swagger 경로를 제거하거나 인증을 요구한다.

#### W8. Position broadcast에 Rate Limiting 부재
- **파일**: `village/adapter/in/websocket/PositionHandler.java:31-45`
- **내용**: 위치 전송에 속도 제한이 없다. 악의적 클라이언트가 초당 수천 건의 위치를 전송하면 서버 및 다른 클라이언트에 부하를 줄 수 있다.
- **권장**: 클라이언트별 위치 전송 주기를 서버에서 제한한다 (예: 100ms 간격).

---

### LGTM (양호 항목)

| 항목 | 판단 근거 |
|------|-----------|
| **SQL Injection** | `@Query`에서 파라미터 바인딩(`:userId`, `?0`) 사용. 문자열 concatenation 없음. pgvector 쿼리도 `@Param`으로 안전하게 바인딩. |
| **비밀번호 해싱** | BCryptPasswordEncoder 사용. 적절함. |
| **민감 정보 Response 노출** | Response DTO에 password/token/secret/key 필드 없음. `AuthResponse`는 accessToken만 반환 -- 이는 의도된 동작. |
| **로그 내 민감 정보** | `log.*password`, `log.*token` 패턴 미발견. 로그에 비밀번호/토큰 출력 없음. |
| **하드코딩 시크릿** | Java 코드에 API Key, DB 비밀번호 하드코딩 없음. `@Value`로 외부 설정 참조. |
| **CORS wildcard origin** | `allowedOrigins("*")` 미사용. localhost 명시 설정. |
| **JWT 토큰 검증** | HMAC-SHA + expiration 검증. 파싱 실패 시 `Optional.empty()` 반환. |
| **세션 관리** | STATELESS 정책. 서버 측 세션 없음. |
| **REST 입력 검증** | Controller에서 `@Valid` 사용. Request DTO에 `@NotBlank`, `@Size`, `@Email` 적용. |
| **예외 처리** | `GlobalExceptionHandler`가 스택 트레이스를 마스킹. 클라이언트에 내부 정보 미노출. |
| **STOMP 예외 처리** | `StompErrorHandler`가 예외를 마스킹하여 `StompErrorResponse`로 변환. |
| **Kafka 이벤트 민감 정보** | userId, chatRoomId만 전달. 비밀번호/토큰 미포함. |
| **멱등성 처리** | Kafka 컨슈머에 `IdempotencyGuard` 적용. 중복 처리 방지됨. |
| **.env 파일 관리** | `.gitignore`에 `.env`, `*.env.local` 포함. 커밋 차단됨. |
| **Spring Security 인증** | `anyRequest().authenticated()` 기본 설정. 명시적 public path 외 전부 인증 필요. |

---

## 우선순위별 조치 권장

### 즉시 조치 (프로덕션 배포 전 필수)
1. **C2** -- STOMP 인증 없는 연결을 차단하거나, SUBSCRIBE 프레임에서 인증 검증 추가
2. **C3** -- JWT 시크릿 기본값 제거 + 기동 시 검증 로직 추가
3. **C4+C5** -- STOMP 메시지 입력 검증 추가 (좌표 범위, 채팅 길이)

### 배포 전 권장
4. **W3** -- CORS AllowedHeaders를 필요한 것만 명시
5. **W4** -- CORS origin을 환경변수로 분리
6. **W5** -- 프로덕션 프로파일에서 DB 기본값 제거
7. **W7** -- 프로덕션 프로파일에서 Swagger 경로 제거

### 개선 권장
8. **W6** -- 대화 요약 로그 레벨 조정
9. **W8** -- WebSocket Rate Limiting 도입
10. **C1** -- WebSocket CSRF 보호는 C2 해결 시 자연스럽게 완화됨
