# API 명세 — Communication

> Base URL: `/api/v1/chat`
> 공통 규칙: `overview.md` 참조
> WebSocket(STOMP) 명세: `../websocket.md` 참조

마을 공개 채팅방은 DB 마이그레이션(V3)에서 고정 생성된다.
채팅방 생성 API는 존재하지 않는다. 채널 개념 도입 전까지 마을 = 1개, 채팅방 = 1개로 운영한다.

---

## POST `/api/v1/chat/messages` — 메시지 전송

인증 필요 (회원 전용). 게스트 접근 시 403.

STOMP가 주 경로이지만, REST fallback을 유지한다.
메시지 전송과 동시에 NPC 응답을 동기로 생성하여 반환한다.
NPC 응답은 REST 응답 외에 WebSocket `/topic/chat/village`로도 broadcast된다.
고정 공개 채팅방을 사용하므로 roomId Path Variable은 없다 (`village.public-chat-room-id` 설정값 사용).

메시지는 Cassandra에 저장된다.

**Request**

```json
{
  "body": "안녕하세요"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| body | String | 필수(`@NotBlank`), 최대 1000자(`@Size(max = 1000)`) |

**Response** `200 OK`

```json
{
  "userMessage": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": 1,
    "senderId": 42,
    "senderType": "USER",
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  },
  "npcMessage": {
    "id": "660f9511-f30c-52e5-b827-557766551111",
    "participantId": 2,
    "senderId": null,
    "senderType": "NPC",
    "body": "어서오세요, 마을에 오신 것을 환영합니다!",
    "createdAt": "2026-04-08T12:00:00.001Z"
  }
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | Cassandra에 저장된 메시지 ID |
| participantId | Long | 발신자 참여자 ID |
| senderId | Long (nullable) | 유저 메시지: 유저 ID, NPC 메시지: `null` |
| senderType | String | `"USER"` 또는 `"NPC"` |
| body | String | 메시지 본문 |
| createdAt | Instant (ISO 8601 UTC) | Cassandra Timestamp 기준 |

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| COMM_003 | 403 | 게스트는 채팅 불가 (`GuestChatNotAllowedException`) |
