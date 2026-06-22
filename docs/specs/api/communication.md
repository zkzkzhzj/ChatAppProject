# API 명세: Communication

> Base URL: `/api/v1/chat`
> WebSocket(STOMP) 명세: `../websocket.md`

마을 공개 채팅방은 DB 마이그레이션에서 `chat_room.id = 1`, `type = PUBLIC`으로 생성한다.
채팅방 생성 API와 멘션 대상 조회 API는 제공하지 않는다.

## POST `/api/v1/chat/messages`

인증된 회원만 메시지를 보낼 수 있다. 게스트는 `403`을 받는다.

**Request**

```json
{
  "body": "안녕하세요"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| body | String | 필수, 최대 1000자 |

**Response** `200 OK`

```json
{
  "userMessage": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": 1,
    "senderId": 42,
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  }
}
```

## GET `/api/v1/chat/messages`

인증된 회원만 최근 메시지 목록을 조회할 수 있다. 게스트는 `403`을 받는다.
이 API는 DB에 저장된 사용자 채팅 메시지만 반환하며, STOMP 전용 시스템 입장/퇴장 메시지는 포함하지 않는다.

**Response** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": 1,
    "senderId": 42,
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  }
]
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | Cassandra 메시지 ID |
| participantId | Long | 발신자 참여자 ID |
| senderId | Long? | 발신 회원 ID. 참여자 매핑이 없으면 `null`이며 내부 `participantId`로 대체하지 않는다. |
| body | String | 메시지 본문 |
| createdAt | Instant | 생성 시각 |

## Errors

| 코드 | HTTP | 사유 |
|------|------|------|
| COMM_003 | 403 | 게스트 채팅 불가 |
| COMM_004 | 400 | 메시지 본문이 비어 있거나 제한을 초과 |
