# Raw WebSocket V2 후보 명세 — 마음의 고향

> 이 문서는 운영 명세가 아니다.
> 현재 백엔드 `/ws/v2` 실험 구현을 기준으로 작성한 전환 후보 명세다.
> 운영 경로는 아직 [websocket.md](./websocket.md)의 STOMP `/ws`다.

---

## 연결

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `/ws/v2` |
| 프로토콜 | raw WebSocket JSON envelope |
| 인증 | query param `access_token` |
| 토큰 없음 | 현재 구현은 handshake 허용, publish 거부 |

> 주의: query param `access_token`은 현재 구현 기준일 뿐이다. 운영 전환 전 인증 방식과 로그/마스킹 정책 결정을 거쳐야 한다.

예시:

```text
ws://localhost:8080/ws/v2?access_token=<token>
```

---

## Inbound Frames

### SUBSCRIBE

```json
{
  "type": "SUBSCRIBE",
  "roomId": 1
}
```

### UNSUBSCRIBE

```json
{
  "type": "UNSUBSCRIBE",
  "roomId": 1
}
```

### PUBLISH

```json
{
  "type": "PUBLISH",
  "roomId": 1,
  "body": "안녕하세요"
}
```

### POSITION

```json
{
  "type": "POSITION",
  "roomId": 1,
  "x": 120.5,
  "y": 340.0,
  "z": 0.75
}
```

### TYPING

```json
{
  "type": "TYPING",
  "roomId": 1,
  "typing": true
}
```

### PING

```json
{
  "type": "PING"
}
```

---

## Outbound Frames

### MESSAGE

```json
{
  "type": "MESSAGE",
  "roomId": 1,
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": 1,
    "senderId": 42,
    "senderType": "USER",
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  }
}
```

### POSITION_UPDATE

```json
{
  "type": "POSITION_UPDATE",
  "roomId": 1,
  "displayId": "user-42",
  "userType": "MEMBER",
  "x": 120.5,
  "y": 340.0,
  "z": 0.75
}
```

### TYPING_UPDATE

```json
{
  "type": "TYPING_UPDATE",
  "roomId": 1,
  "displayId": "user-42",
  "typing": true
}
```

### ERROR

```json
{
  "type": "ERROR",
  "code": "COMM_003",
  "message": "게스트는 채팅을 보낼 수 없습니다."
}
```

### PONG

```json
{
  "type": "PONG"
}
```

---

## Step 3 Parity 상태

- `POSITION`은 STOMP V1 `PositionHandler`와 같이 인증된 principal과 유한한 좌표만 요구하고, 좌표를 서버에서 clamp하지 않는다.
- 구독 세션 disconnect 시 해당 세션이 구독하던 각 room에 `POSITION_UPDATE`를 `userType: "LEAVE"`, `x: 0.0`, `y: 0.0`, `z: 0.0`으로 broadcast한다.
- `POSITION_UPDATE`, `TYPING_UPDATE`의 사용자 식별 필드는 현재 구현 기준 `displayId`다.
- guest token은 `POSITION`, `TYPING` broadcast가 가능하지만 `PUBLISH`는 `COMM_003`으로 거절한다.

---

## 현재 미해결

- envelope `version` 필드가 없다.
- NPC 응답은 아직 V2로 broadcast되지 않는다.
- 메일 알림(`/user/queue/mail`) 대응이 없다.
