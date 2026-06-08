# Realtime Infra Reset Audit

> 작성일: 2026-06-06
> 목적: 실시간 인프라 전환 전 현재 STOMP/raw WS/Redis/프론트/CD/명세 상태를 사실 기준으로 고정한다.

---

## 1. 결론

현재 운영 경로는 STOMP `/ws`다. 백엔드에는 `/ws/v2` raw WebSocket + Redis Pub/Sub 실험 경로가 있지만, 프론트/CD/운영 명세는 아직 STOMP 기준이다. Redis/V2 테스트 일부는 통과하므로 전부 폐기하지 않는다. 다만 운영 전환 전에는 정책 parity와 프론트 책임 분리가 필요하다.

---

## 2. STOMP 운영 경로

| 항목 | 현재 값 | 파일 |
|------|---------|------|
| Endpoint | `/ws` | `backend/src/main/java/com/maeum/gohyang/global/config/WebSocketConfig.java` |
| Protocol | STOMP over WebSocket + SockJS | `frontend/src/lib/websocket/stompClient.ts` |
| Auth | CONNECT `Authorization: Bearer <token>` | `backend/src/main/java/com/maeum/gohyang/global/config/StompAuthChannelInterceptor.java` |
| Chat send | `/app/chat/village` | `frontend/src/lib/websocket/stompClient.ts` |
| Chat receive | `/topic/chat/village` | `frontend/src/lib/websocket/stompClient.ts` |
| Position send | `/app/village/position` | `frontend/src/lib/websocket/stompClient.ts` |
| Position receive | `/topic/village/positions` | `frontend/src/lib/websocket/stompClient.ts` |
| Typing send | `/app/village/typing` | `frontend/src/lib/websocket/stompClient.ts` |
| Typing receive | `/topic/village/typing` | `frontend/src/lib/websocket/stompClient.ts` |
| Mail receive | `/user/queue/mail` | `frontend/src/lib/websocket/stompClient.ts` |

---

## 3. Raw WS V2 실험 경로

| 항목 | 현재 값 | 파일 |
|------|---------|------|
| Endpoint | `/ws/v2` | `backend/src/main/java/com/maeum/gohyang/global/config/WebSocketV2Config.java` |
| Handler | `ChatWebSocketHandler` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandler.java` |
| Auth | query param `access_token` | `backend/src/main/java/com/maeum/gohyang/global/config/JwtHandshakeInterceptor.java` |
| Subscribe | `{"type":"SUBSCRIBE","roomId":1}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/SubscribeFrame.java` |
| Publish | `{"type":"PUBLISH","roomId":1,"body":"..."}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/PublishFrame.java` |
| Position | `{"type":"POSITION","roomId":1,"x":0,"y":0}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/PositionFrame.java` |
| Typing | `{"type":"TYPING","roomId":1,"typing":true}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/TypingFrame.java` |
| Redis channel | `chat:room:{roomId}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/RoomChannelNaming.java` |

주의:

- V2 인증은 현재 query param `access_token`을 사용한다. URL token은 프록시, access log,
  브라우저 히스토리, 에러 리포트에 남을 수 있으므로 운영 전환 전 인증 전달 방식과
  로깅 마스킹 결정을 다시 해야 한다.

---

## 4. Redis 상태

| 항목 | 현재 값 | 판단 |
|------|---------|------|
| Dependency | `spring-boot-starter-data-redis` | 유지 후보 |
| Local/Prod image | `redis:7.2-alpine` | Redis 8 license 회피 기준과 정합 |
| Test container | `GenericContainer(redis:7.2-alpine)` | 동작 가능, 전용 module 없음 |
| App property | `spring.data.redis.host/port/password` | Spring Boot 4 기준 OK |
| Health | `HEALTH_REDIS_ENABLED=false` 기본 | 운영에서 의도적으로 꺼둔 상태 |
| Pub/Sub pattern | exact `SUBSCRIBE`, 방당 1채널 | 유지 후보 |

검증:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.out.messaging.redis.RedisChatRelayTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

결과:

```text
BUILD SUCCESSFUL
```

---

## 5. V1/V2 정책 차이

| 정책 | STOMP V1 | raw WS V2 | 조치 |
|------|----------|-----------|------|
| 인증 없음 | CONNECT 거부 | handshake 허용, publish 거부 | 결정 필요 |
| 게스트 채팅 | 서버에서 거부 | 서버에서 거부 | 유지 |
| 게스트 위치 | 가능 | 가능 | parity 테스트 필요 |
| NPC 응답 | STOMP broadcast | V2로 보내지 않음 | cutover 전 필수 설계 |
| 메일 알림 | `/user/queue/mail` | 없음 | 1차 범위 제외 또는 별도 설계 |
| 퇴장 broadcast | STOMP disconnect/leave | subscription cleanup 중심 | parity 필요 |
| Envelope version | 없음 | 없음 | V2 후보 명세에 추가 검토 |

---

## 6. 프론트 책임 분리 대상

`frontend/src/lib/websocket/useStomp.ts`의 현재 책임:

- access token 결정
- 게스트 토큰 발급
- 멤버 만료 처리
- displayId bridge 동기화
- reconnect 제어
- 채팅 히스토리 로드
- 채팅 수신과 송신
- 메일 알림 수신
- 위치 수신과 송신
- 타이핑 수신과 송신

다음 구현 Step의 첫 리팩터 후보:

| 새 단위 | 책임 |
|---------|------|
| `realtimeAuth.ts` | 토큰 결정, 게스트 발급, displayId 추출 |
| `stompRealtimeClient.ts` | 기존 STOMP connect/subscribe/publish 유지 |
| `realtimeBridge.ts` | chat/position/typing/mail event를 React/Three bridge로 전달 |
| `useRealtimeConnection.ts` | hook orchestration |

---

## 7. 배포/CD 상태

| 항목 | 현재 값 | 파일 |
|------|---------|------|
| local frontend WS URL | `http://localhost:8080/ws` | `frontend/.env.local.example` |
| compose frontend WS URL | `${PUBLIC_WS_URL:-http://localhost:8080/ws}` | `deploy/docker-compose.yml` |
| CD frontend WS URL | `${{ vars.NEXT_PUBLIC_WS_URL || 'https://ghworld.co/ws' }}` | `.github/workflows/deploy.yml` |

판단:

- 운영 cutover 전에는 `/ws/v2`를 기본 URL로 바꾸지 않는다.
- raw WS adapter를 만들더라도 env flag 또는 separate variable로 선택해야 한다.

---

## 8. 다음 결정

추천 다음 Step:

1. `docs/specs/websocket.md`를 운영 STOMP 명세로 고정한다.
2. `docs/specs/websocket-raw-v2-draft.md`를 후보 명세로 작성한다.
3. 그 다음 구현은 `Frontend Client Split`으로 시작한다.

이유:

- `Redis/V2 Stabilize`는 인증 전달 방식, V1/V2 정책 차이, NPC 응답, 메일 알림,
  퇴장 broadcast parity가 남아 있어 바로 운영 경로로 밀기 어렵다.
- `Frontend Client Split`은 STOMP 운영 동작을 유지한 채 `useStomp`의 책임을 분리할 수
  있어, 이후 STOMP adapter와 raw WS adapter를 비교 가능한 구조로 만든다.
