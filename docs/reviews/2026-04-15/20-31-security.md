# 보안 리뷰 — 2026-04-15 20:31

## Codex 보안 리뷰 결과

### [P1] WebSocket 익명 접속 허용 — StompAuthChannelInterceptor.java:39-47
Authorization 헤더 없이 STOMP CONNECT 시 연결을 거부하지 않고 익명으로 통과시킨다.
구독 인가(subscription authorization)도 없으므로, 미인증 사용자가 `/topic/chat/village`, `/topic/village/positions`를 구독하여 실시간 채팅과 위치 데이터를 열람할 수 있다.

### [P1] JWT 서명 키 하드코딩 폴백 — application.yml:63
`${JWT_SECRET:change-me-in-production-this-is-a-256-bit-secret-key-placeholder}` 형태로 폴백 키가 존재.
환경변수 미설정 시 공개된 리포지토리의 키로 서버가 기동되어, JWT를 위조할 수 있다.

### [P2] DEBUG 로그 레벨 기본 설정 — application.yml:105
`com.maeum.gohyang: DEBUG` 설정이 기본(프로필 무관)으로 적용됨.
NpcReplyService.java:44의 `log.debug("NPC 요청 원문 — userMessage={}")` 등에 의해 유저 대화 원문이 로그에 기록된다.

### [P2] 대화 요약 INFO 로그 출력 — ConversationSummaryEventConsumer.java:87-88
`log.info("... summary={}", summary)` 로 LLM 요약 결과(유저 대화 요약본)가 INFO 레벨로 출력.
중앙 로깅 시스템에 개인 대화 내용이 영구 적재된다.

---

## 보안 전문 패턴 분석

### [CRITICAL]

#### [SEC-5] WebSocket 토큰 미검증 시 익명 구독 허용
- **파일:** `StompAuthChannelInterceptor.java:40-42`
- **내용:** Authorization 헤더 없으면 `return message`로 통과. STOMP SUBSCRIBE에 대한 인가 검사도 없음.
- **영향:** 게스트 토큰조차 없이 WebSocket 연결 후 `/topic/chat/village`, `/topic/village/positions` 구독 가능. 실시간 채팅 도청 및 접속자 위치 추적 가능.
- **권장:** CONNECT 시 토큰 필수화 (토큰 없으면 `MessageDeliveryException` throw), 또는 SUBSCRIBE 단계에서 인증 여부 확인.

#### [SEC-3] JWT 시크릿 폴백 키 하드코딩
- **파일:** `application.yml:63`
- **내용:** `jwt.secret` 기본값이 리포지토리에 공개되어 있음.
- **영향:** 환경변수 설정 누락 시 공격자가 임의 JWT 발급 가능. MEMBER 권한 토큰 위조로 전체 API 접근.
- **권장:** 폴백 값 제거. `@PostConstruct`에서 기본값 감지 시 startup 실패 처리. 또는 `@Value` 대신 `@ConfigurationProperties`로 필수 속성 강제.

---

### [WARNING]

#### [SEC-2-a] NPC 대화 원문 DEBUG 로그 출력
- **파일:** `NpcReplyService.java:44`, `NpcReplyService.java:59`
- **내용:** `log.debug("NPC 요청 원문 — userMessage={}")`, `log.debug("NPC 응답 원문 — response={}")`. application.yml에서 기본 로그 레벨이 DEBUG이므로 프로덕션에서도 출력됨.
- **권장:** 기본 로그 레벨을 INFO로 변경. 프로덕션 프로필에서 DEBUG 비활성화 보장.

#### [SEC-2-b] 대화 요약 내용 INFO 로그 출력
- **파일:** `ConversationSummaryEventConsumer.java:87-88`
- **내용:** `log.info("... summary={}", summary)` — 유저 대화 요약이 INFO로 출력.
- **권장:** `summary` 파라미터 제거. 요약 성공 여부만 로깅 (userId, messageCount 등 메타데이터만).

#### [SEC-7-a] STOMP 메시지 입력 검증 부재
- **파일:** `StompSendMessageRequest.java:3`
- **내용:** `record StompSendMessageRequest(String body)` — `@NotBlank`, `@Size` 등 검증 어노테이션 없음. REST API의 `SendMessageRequest`에는 `@Size(max = 1000)` 존재하나 STOMP 경로는 미적용.
- **영향:** WebSocket으로 수MB 크기의 메시지를 보내면 LLM 호출·DB 저장에 과부하 가능.
- **권장:** STOMP 메시지 DTO에도 검증 추가, 또는 `@MessageMapping` 핸들러에서 수동 검증.

#### [SEC-7-b] PositionRequest 좌표 범위 미검증
- **파일:** `PositionRequest.java:4`
- **내용:** `record PositionRequest(double x, double y)` — 좌표 범위 제한 없음.
- **영향:** NaN, Infinity, 극단적 좌표값 전송으로 다른 클라이언트의 렌더링 오류 유발 가능.
- **권장:** 좌표 범위 검증 (0 ~ WORLD_WIDTH/HEIGHT) 추가.

#### [SEC-1] @PreAuthorize 미사용
- **내용:** 프로젝트 전체에 `@PreAuthorize` 사용 없음. 인가는 Controller 메서드 내부의 `user.isGuest()` 체크로만 수행.
- **영향:** 역할 기반 접근 제어(RBAC)가 선언적이지 않아, 새 엔드포인트 추가 시 인가 누락 위험.
- **현재 상태:** SecurityConfig의 `anyRequest().authenticated()`로 인증은 보장됨. 게스트/멤버 구분은 수동. 현 규모에서는 동작하나 엔드포인트 증가 시 위험 증가.
- **권장:** 장기적으로 `@PreAuthorize("hasRole('MEMBER')")` 등 선언적 인가 도입 검토.

---

### LGTM

| 항목 | 상태 | 비고 |
|------|------|------|
| CORS 설정 | LGTM | `localhost:3000/3001`만 허용, `allowedOrigins("*")` 미사용. WebSocket도 동일 |
| CSRF 비활성화 | LGTM | Stateless JWT API이므로 CSRF 비활성화 적절 |
| SQL Injection | LGTM | Native Query(`NpcConversationMemoryJpaRepository`)에서 `@Param` 바인딩 사용. 문자열 결합 없음 |
| Response DTO 민감정보 | LGTM | `AuthResponse(accessToken)`만 존재. password/secret/내부키 노출 없음 |
| 로그에 password/token 직접 출력 | LGTM | `log.*(info|debug).*password|token` 패턴 미검출 |
| Java 코드 내 하드코딩 시크릿 | LGTM | `"sk-`, `"password=`, `"secret=` 패턴 미검출 (테스트 코드 제외) |
| Kafka 이벤트 내 민감정보 | LGTM | 이벤트 페이로드에 password/token/secret 필드 없음 |
| .env 파일 | LGTM | `.gitignore`에 포함됨. 현재 NPC_ADAPTER만 포함 |
| Actuator 노출 | LGTM | 기본: `health,info,metrics`만 노출. docker 프로필은 health만. local만 전체 허용 |

---

## 조치 우선순위

| 우선순위 | 항목 | 난이도 |
|----------|------|--------|
| 1 | JWT 폴백 시크릿 제거 + startup 검증 | 낮음 |
| 2 | WebSocket CONNECT 시 토큰 필수화 | 중간 |
| 3 | 대화 원문/요약 로그 제거 | 낮음 |
| 4 | STOMP 메시지 입력 검증 추가 | 낮음 |
| 5 | PositionRequest 좌표 범위 검증 | 낮음 |
| 6 | 기본 로그 레벨 INFO로 변경 | 낮음 |
