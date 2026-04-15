# 코드 리뷰 — 2026-04-15 20:26

## 대상
- 종류: uncommitted changes
- 변경 파일:
  - M backend/src/main/java/com/maeum/gohyang/global/security/AuthenticatedUser.java
  - M backend/src/main/java/com/maeum/gohyang/identity/adapter/in/security/JwtProvider.java
  - M frontend/src/game/scenes/VillageScene.ts
  - M frontend/src/lib/websocket/stompClient.ts
  - M frontend/src/lib/websocket/useStomp.ts
  - ?? frontend/src/lib/websocket/positionBridge.ts (신규)
  - ?? backend/.../village/adapter/in/websocket/PositionHandler.java (신규)
  - ?? backend/.../village/adapter/in/websocket/PositionBroadcast.java (신규)
  - ?? backend/.../village/adapter/in/websocket/PositionDisconnectListener.java (신규)
  - ?? backend/.../village/adapter/in/websocket/PositionRequest.java (신규)
  - M docs/handover.md 외 다수 문서 변경

## Codex 리뷰 결과 (OpenAI Codex v0.120.0 / gpt-5.4)

### [P1] STOMP 연결 전 위치 publish 시 런타임 에러
- 파일: `frontend/src/game/scenes/VillageScene.ts:393-396`
- `update()`가 매 100ms마다 `sendPosition()`을 호출하지만 STOMP 연결 상태를 확인하지 않는다.
- `@stomp/stompjs`의 `client.publish()`는 연결이 없으면 `TypeError: There is no underlying STOMP connection`을 throw한다.
- 마을 씬 진입 후 STOMP handshake 완료 전, 또는 재연결 중에 런타임 에러가 발생할 수 있다.

### [P2] 익명(토큰 없는) 방문자의 위치 공유 미작동
- 파일: `frontend/src/lib/websocket/useStomp.ts:75-78`
- `PositionHandler`는 `AuthenticatedUser` 인스턴스가 아니면 메시지를 무시한다.
- 하지만 프론트엔드는 `accessToken`이 없으면 `connectAnonymous()`로 연결하고, 이 경우 principal이 null이다.
- 결과적으로 익명 방문자는 위치가 broadcast되지 않고, LEAVE 이벤트도 발생하지 않는다.

---

## 보완 검증 (Claude Opus 4.6 — AGENTS.md Critical Rules 기반)

### [CRITICAL] 입력 검증 누락 — PositionRequest 좌표 범위 미검증
- 파일: `PositionHandler.java:32` / `PositionRequest.java`
- 클라이언트가 보내는 `x`, `y` 좌표에 대한 검증이 전혀 없다.
- `Double.MAX_VALUE`, `NaN`, `Infinity`, 음수 등 임의의 값을 보낼 수 있다.
- WebSocket 입력 검증이 REST와 불일치한다 (REST DTO에는 @Valid 등 검증이 존재하는 패턴).
- 대응: `PositionRequest`에 좌표 범위 검증을 추가하거나 `PositionHandler`에서 범위 체크 필요.

### [CRITICAL] 테스트 누락
- 파일: `backend/.../village/adapter/in/websocket/` 전체
- CLAUDE.md Critical Rule #5: "테스트 없는 기능 완료 금지"
- `PositionHandler`, `PositionDisconnectListener`, `AuthenticatedUser.displayId()`, `JwtProvider.parse()` 변경에 대한 테스트가 없다.
- 최소한 다음 테스트가 필요:
  - PositionHandler: 인증된 유저 위치 전송 성공, 미인증 시 무시
  - PositionDisconnectListener: disconnect 이벤트 시 LEAVE broadcast
  - AuthenticatedUser: displayId() MEMBER/GUEST 케이스
  - 프론트엔드: positionBridge 콜백 등록/해제

### [WARNING] userType 매직 스트링 사용
- 파일: `PositionBroadcast.java:5`, `PositionHandler.java:39`, `VillageScene.ts:402-403`
- `"GUEST"`, `"MEMBER"`, `"LEAVE"` 문자열이 백엔드와 프론트엔드 양쪽에 하드코딩되어 있다.
- 백엔드에서는 enum 또는 상수로 관리하는 것이 컨벤션에 맞다. `UserType.name()`을 활용하고, `"LEAVE"`는 별도 상수 정의가 바람직하다.

### [WARNING] positionBridge 단일 리스너 제한
- 파일: `frontend/src/lib/websocket/positionBridge.ts:11`
- `let listener: PositionListener | null = null` — 리스너가 1개만 등록 가능하다.
- 현재는 VillageScene만 사용하므로 문제없지만, 향후 미니맵 등 추가 구독자가 생기면 이전 리스너가 덮어씌워진다.
- 당장은 의도된 설계로 보이나, 확장 시 주의 필요.

### [WARNING] STOMP 위치 broadcast 대역폭 / Rate Limiting 부재
- 파일: `PositionHandler.java:43`
- 모든 유저의 위치가 100ms 간격으로 모든 구독자에게 broadcast된다.
- N명의 유저가 접속하면 초당 `N * 10`개의 메시지가 모든 구독자에게 전달된다.
- 서버 측 rate limiting이나 메시지 집계(aggregation) 전략이 없다.
- 동시성 전략 명시 필요 (Critical Rule #6 관련).

### [WARNING] TOPIC_POSITIONS 상수 중복 정의
- 파일: `PositionHandler.java:27`, `PositionDisconnectListener.java:24`
- 동일한 토픽 경로가 두 클래스에 각각 정의되어 있다.
- 한 곳에서 변경하고 다른 곳을 놓치면 불일치가 발생한다.
- communication 도메인의 `ChatTopics.java` 같은 상수 클래스로 통합하는 것이 바람직하다.

### [INFO] sendPosition의 STOMP 연결 상태 가드 필요
- 파일: `frontend/src/lib/websocket/stompClient.ts:92-98`
- `sendPosition()`이 `getStompClient().publish()`를 직접 호출하는데, `connected` 상태 체크가 없다.
- Codex [P1]과 동일 맥락. `client.connected` 체크를 `sendPosition` 내부에 추가하는 것이 방어적이다.

### [INFO] resolveMyDisplayId()의 JWT 파싱 로직 중복
- 파일: `VillageScene.ts:376-391`
- 프론트엔드에서 JWT payload를 `atob()`으로 직접 파싱하고 있다.
- `lib/auth.ts`에 이미 유사한 토큰 파싱 로직이 있을 수 있으므로, 공통 유틸로 추출하는 것이 바람직하다.

### [INFO] 아키텍처 적합성
- AuthenticatedUser에 sessionId 필드 추가: global 패키지에 위치하므로 도메인 간 의존 규칙 위반 없음.
- PositionHandler 등 village 도메인의 adapter/in/websocket: 패키지 구조 컨벤션에 부합.
- `@Autowired` 필드 주입 없음 (모두 `@RequiredArgsConstructor` 사용): Critical Rule #3 준수.
- `throw new RuntimeException()` 없음: Critical Rule #4 준수.
- Domain Entity에 인프라 어노테이션 없음: Critical Rule #1 준수.

---

## 요약

| 등급 | 건수 | 핵심 |
|------|------|------|
| CRITICAL | 2 | 입력 검증 누락, 테스트 누락 |
| WARNING | 4 | 매직 스트링, 단일 리스너, Rate Limiting 부재, 상수 중복 |
| INFO | 3 | 연결 가드, JWT 파싱 중복, 아키텍처 적합성 확인 |
| Codex P1 | 1 | STOMP 미연결 시 publish 에러 |
| Codex P2 | 1 | 익명 방문자 위치 공유 미작동 |
