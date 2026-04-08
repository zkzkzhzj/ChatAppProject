# API 명세 — Communication

> Base URL: `/api/v1/chat-rooms`
> 공통 규칙: `overview.md` 참조
> WebSocket(STOMP) 명세: `../websocket.md` 참조

---

## POST `/api/v1/chat-rooms` — NPC 채팅방 생성

인증 필요 (회원 전용). 게스트 접근 시 403.

현재 NPC 타입 채팅방만 지원한다.
생성 시 HOST 참여자(유저)와 NPC 참여자가 함께 생성된다.

**Request**

```json
{
  "displayName": "마을 주민"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| displayName | String | 필수, 최대 50자. NPC에게 표시될 유저 닉네임 |

**Response** `201 Created`

```json
{
  "chatRoomId": 1,
  "participantId": 1
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| chatRoomId | Long | 생성된 채팅방 ID |
| participantId | Long | 이 채팅방에서의 유저 참여자 ID. 메시지 전송 시 발신자 식별에 사용됨 |

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| COMM_003 | 403 | 게스트는 채팅 불가 |

---

## POST `/api/v1/chat-rooms/{chatRoomId}/messages` — 메시지 전송

인증 필요 (회원 전용). 게스트 접근 시 403.

메시지 전송과 동시에 NPC 응답을 동기로 생성하여 반환한다.
NPC 응답은 REST 응답 외에 WebSocket `/topic/chat/{chatRoomId}`로도 broadcast된다.

메시지는 Cassandra에 저장된다.

**Path Variable**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| chatRoomId | Long | 채팅방 ID |

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
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  },
  "npcMessage": {
    "id": "660f9511-f30c-52e5-b827-557766551111",
    "participantId": 2,
    "body": "어서오세요, 마을에 오신 것을 환영합니다!",
    "createdAt": "2026-04-08T12:00:00.001Z"
  }
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | Cassandra에 저장된 메시지 ID |
| participantId | Long | 발신자 참여자 ID |
| body | String | 메시지 본문 |
| createdAt | Instant (ISO 8601 UTC) | Cassandra Timestamp 기준 |

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| COMM_003 | 403 | 게스트는 채팅 불가 |
| COMM_001 | 404 | 채팅방 없음 |
| COMM_002 | 403 | 해당 채팅방의 참여자가 아님 |
