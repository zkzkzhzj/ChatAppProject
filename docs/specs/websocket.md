# WebSocket 명세: 마음의 고향

## STOMP

| 항목 | 값 |
|------|-----|
| Endpoint | `/ws` |
| Protocol | STOMP over WebSocket |
| Fallback | SockJS |
| 인증 | 연결 시 `Authorization: Bearer <token>` 헤더 |

## Chat

| 방향 | Destination |
|------|-------------|
| 클라이언트 -> 서버 | `/app/chat/village` |
| 서버 -> 클라이언트 | `/topic/chat/village` |

### Send Payload

```json
{
  "body": "안녕하세요"
}
```

### Message Payload

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "participantId": 1,
  "senderId": 42,
  "body": "안녕하세요",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

## System Messages

입장/퇴장 알림은 `senderType: "SYSTEM"`을 포함한다. 일반 사용자 채팅 메시지는 `senderType`을 포함하지 않는다.

```json
{
  "id": "system-1712345678901",
  "participantId": 0,
  "senderId": null,
  "senderType": "SYSTEM",
  "body": "손님이 입장했습니다.",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

## Position

| 방향 | Destination |
|------|-------------|
| 클라이언트 -> 서버 | `/app/village/position` |
| 서버 -> 클라이언트 | `/topic/village/positions` |

## Typing

| 방향 | Destination |
|------|-------------|
| 클라이언트 -> 서버 | `/app/village/typing` |
| 서버 -> 클라이언트 | `/topic/village/typing` |
