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
유저 메시지 저장 후, NPC 응답은 `@Async` 별도 스레드에서 비동기 생성된다.
REST 응답에는 유저 메시지만 포함되며, NPC 응답은 WebSocket `/topic/chat/village`로만 broadcast된다.
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
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "participantId": 1,
  "senderId": 42,
  "senderType": "USER",
  "body": "안녕하세요",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | Cassandra에 저장된 메시지 ID |
| participantId | Long | 발신자 참여자 ID |
| senderId | Long | 유저 ID |
| senderType | String | `"USER"` |
| body | String | 메시지 본문 |
| createdAt | Instant (ISO 8601 UTC) | Cassandra Timestamp 기준 |

> NPC 응답은 비동기로 생성되어 WebSocket `/topic/chat/village`로 broadcast된다.
> REST 응답에는 포함되지 않는다.

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| COMM_003 | 403 | 게스트는 채팅 불가 (`GuestChatNotAllowedException`) |

---

## GET `/api/v1/chat/messages` — 채팅 히스토리 조회

인증 필요 (회원 전용). 게스트 접근 시 403.

채팅방 진입 시 이전 대화 10개를 최신순으로 조회한다.
participant 정보로 USER/NPC를 구분하여 senderType을 매핑한다.

**Response** `200 OK`

```json
[
  {
    "id": "660f9511-f30c-52e5-b827-557766551111",
    "participantId": 2,
    "senderId": null,
    "senderType": "NPC",
    "body": "어서오세요, 마을에 오신 것을 환영합니다!",
    "createdAt": "2026-04-08T12:00:00.001Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": 1,
    "senderId": 42,
    "senderType": "USER",
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  }
]
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | Cassandra 메시지 ID |
| participantId | Long | 발신자 참여자 ID |
| senderId | Long (nullable) | USER: 유저 ID, NPC: null |
| senderType | String | `"USER"` 또는 `"NPC"` |
| body | String | 메시지 본문 |
| createdAt | Instant (ISO 8601 UTC) | Cassandra Timestamp 기준 |

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| COMM_003 | 403 | 게스트는 채팅 불가 (`GuestChatNotAllowedException`) |
