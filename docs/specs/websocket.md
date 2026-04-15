# WebSocket(STOMP) 명세 — 마음의 고향

> Phase 3 구현 기준. 현재는 인메모리 Simple Broker 사용.
> 스케일아웃 시 Redis Pub/Sub 기반 외부 브로커로 교체 예정 (ADR-007 참조).

---

## 연결

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `/ws` |
| 프로토콜 | STOMP over WebSocket |
| Fallback | SockJS (`/ws/info` 등) |
| 인증 | 연결 시 `Authorization: Bearer <token>` 헤더 전달 |

**연결 예시 (JavaScript)**

```javascript
const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);
stompClient.connect(
  { Authorization: 'Bearer <accessToken>' },
  (frame) => console.log('Connected:', frame)
);
```

---

## 목적지(Destination) 구조

| 구분 | 방향 | 목적지 |
|------|------|-------|
| Application Prefix | — | `/app` |
| Broker Destinations | — | `/topic`, `/queue` |
| 메시지 전송 | 클라이언트 → 서버 | `/app/chat/village` |
| 메시지 수신 | 서버 → 클라이언트 | `/topic/chat/village` |

채널 개념 도입 전까지 마을 공개 채팅방 1개를 고정 사용한다. roomId 변수는 없다.

---

## 클라이언트 → 서버

### `/app/chat/village` — 메시지 전송

인증된 회원만 가능. 게스트 차단 (`GuestChatNotAllowedException`).
고정 목적지이므로 Path Variable은 없다.

**Payload (JSON)**

```json
{
  "body": "안녕하세요"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| body | String | 필수 |

---

## 서버 → 클라이언트

### `/topic/chat/village` — 메시지 수신

유저 메시지와 NPC 응답이 **개별 `MessageResponse`**로 구독자 전체에게 broadcast된다.
유저 메시지는 전송 즉시, NPC 응답은 비동기 생성 후 별도로 broadcast된다.

**구독 예시 (JavaScript)**

```javascript
stompClient.subscribe('/topic/chat/village', (message) => {
  const msg = JSON.parse(message.body); // MessageResponse (단일)
  console.log(msg.senderType, msg.body);
});
```

**Payload (JSON) — `MessageResponse` (단일 객체)**

유저 메시지 예시:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "participantId": 1,
  "senderId": 42,
  "senderType": "USER",
  "body": "안녕하세요",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

NPC 응답 예시 (비동기, 별도 broadcast):

```json
{
  "id": "660f9511-f30c-52e5-b827-557766551111",
  "participantId": 2,
  "senderId": null,
  "senderType": "NPC",
  "body": "어서오세요, 마을에 오신 것을 환영합니다!",
  "createdAt": "2026-04-08T12:00:00.001Z"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | 메시지 ID (Cassandra) |
| participantId | Long | 참여자 ID |
| senderId | Long (nullable) | 유저 메시지: 유저 ID, NPC 메시지: `null` |
| senderType | String | `"USER"`, `"NPC"`, 또는 `"SYSTEM"` |
| body | String | 메시지 본문 |
| createdAt | Instant (ISO 8601 UTC) | 메시지 생성 시각 |

### SYSTEM 메시지 (입/퇴장 알림)

`PresenceNotifier`가 WebSocket 연결/해제 이벤트를 감지하여 같은 `/topic/chat/village`로 SYSTEM 메시지를 broadcast한다.

```json
{
  "id": "system-1712345678901",
  "participantId": 0,
  "senderId": null,
  "senderType": "SYSTEM",
  "body": "손님이 입장하셨습니다!",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

| 필드 | 값 | 비고 |
|------|-----|------|
| id | `"system-{timestamp}"` | 밀리초 기반 고유 ID |
| participantId | `0` | SYSTEM 메시지 고정값 |
| senderId | `null` | SYSTEM 메시지에는 발신자 없음 |
| senderType | `"SYSTEM"` | 입장/퇴장 알림 구분용 |

---

## REST와 WebSocket의 관계

두 경로는 동일한 `SendMessageUseCase`를 공유한다.

```
REST POST /api/v1/chat/messages
  → SendMessageUseCase 실행
  → 유저 MessageResponse를 /topic/chat/village로 broadcast (단일 객체)
  → REST 응답으로 SendMessageResponse(userMessage만) 반환
  → NPC 응답은 @Async 비동기 → 별도 MessageResponse broadcast

STOMP /app/chat/village
  → 동일한 SendMessageUseCase 실행
  → 유저 MessageResponse를 /topic/chat/village로 broadcast (단일 객체)
  → STOMP 응답 없음 (구독 채널로만 수신)
  → NPC 응답은 @Async 비동기 → 별도 MessageResponse broadcast
```

Happy Path Cucumber 테스트는 REST로 수행한다.
WebSocket 경로는 프론트엔드 실시간 UX용이다.

---

## 위치 공유 (Village Position)

채널 개념 도입 전까지 마을 전체에서 1개 위치 공유 채널을 사용한다. 게스트 포함 모든 인증된 유저가 전송/수신 가능하다.
위치는 비영속 -- 메모리에만 존재하며 DB 저장하지 않는다.

### `/app/village/position` -- 위치 전송

**Payload (JSON)**

```json
{
  "x": 120.5,
  "y": 340.0
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| x | double | 필수 |
| y | double | 필수 |

### `/topic/village/positions` -- 위치 수신

모든 유저의 위치 변경과 퇴장이 broadcast된다.

**Payload (JSON) -- `PositionBroadcast`**

이동 예시:

```json
{
  "id": "user-42",
  "userType": "MEMBER",
  "x": 120.5,
  "y": 340.0
}
```

퇴장 예시:

```json
{
  "id": "guest-a1b2c3d4",
  "userType": "LEAVE",
  "x": 0,
  "y": 0
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | String | MEMBER: `user-{userId}`, GUEST: `guest-{UUID}` |
| userType | String | `"MEMBER"`, `"GUEST"`, 또는 `"LEAVE"` (퇴장) |
| x | double | 퇴장 시 0 |
| y | double | 퇴장 시 0 |

퇴장 broadcast는 `PositionDisconnectListener`가 STOMP 세션 종료 이벤트를 감지하여 자동 발행한다.

---

## 타이핑 상태 (Typing Indicator)

`TypingHandler`가 유저의 타이핑 상태를 broadcast한다. 게스트 포함 모든 인증된 유저가 전송/수신 가능하다.

### `/app/village/typing` -- 타이핑 상태 전송

**Payload (JSON)**

```json
{
  "typing": true
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| typing | boolean | 필수 |

### `/topic/village/typing` -- 타이핑 상태 수신

**Payload (JSON) -- `TypingBroadcastMessage`**

```json
{
  "id": "user-42",
  "typing": true
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | String | `AuthenticatedUser.displayId()` 기반 |
| typing | boolean | 입력 중 여부 |

---

## 목적지 요약

| 구분 | 방향 | 목적지 |
|------|------|--------|
| 채팅 전송 | 클라이언트 → 서버 | `/app/chat/village` |
| 채팅 수신 | 서버 → 클라이언트 | `/topic/chat/village` |
| 위치 전송 | 클라이언트 → 서버 | `/app/village/position` |
| 위치 수신 | 서버 → 클라이언트 | `/topic/village/positions` |
| 타이핑 전송 | 클라이언트 → 서버 | `/app/village/typing` |
| 타이핑 수신 | 서버 → 클라이언트 | `/topic/village/typing` |

---

## Phase 3 제약사항

- **인메모리 브로커**: 단일 노드에서만 동작. 다중 인스턴스 배포 시 broadcast가 각 인스턴스 내부에서만 전달됨.
- **스케일아웃**: Redis Pub/Sub 기반 외부 브로커 교체 필요 (운영 환경 전환 시 결정).
- **인증**: WebSocket 연결 시 `StompAuthChannelInterceptor`(ChannelInterceptor)가 STOMP CONNECT 프레임에서 JWT를 검증한다. Spring Security 필터 체인이 아닌 STOMP 메시징 레이어에서 처리된다. 토큰 없이 연결 시 STOMP 연결 자체는 허용되지만 `Principal`이 설정되지 않는다. 이 경우 `PositionHandler`, `ChatMessageHandler` 등 핸들러에서 `principal instanceof AuthenticatedUser` 체크에 실패하여 메시지가 무시되거나 예외가 발생한다. 게스트 JWT를 전달하면 게스트로 인증되며, 위치 공유는 가능하지만 채팅 전송 시 `GuestChatNotAllowedException`이 발생한다.
