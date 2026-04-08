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
| 메시지 전송 | 클라이언트 → 서버 | `/app/chat/{roomId}` |
| NPC 응답 수신 | 서버 → 클라이언트 | `/topic/chat/{roomId}` |

---

## 클라이언트 → 서버

### `/app/chat/{roomId}` — 메시지 전송

인증된 회원만 가능. 게스트 차단 (`GuestChatNotAllowedException`).

**Path Variable**

| 변수 | 타입 |
|------|------|
| roomId | Long |

**Payload (JSON)**

```json
{
  "body": "안녕하세요"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| body | String | 필수, 최대 1000자 |

---

## 서버 → 클라이언트

### `/topic/chat/{roomId}` — NPC 응답 수신

메시지 전송 후 NPC 응답이 해당 채팅방 구독자 전체에게 broadcast된다.

**구독 예시 (JavaScript)**

```javascript
stompClient.subscribe(`/topic/chat/${chatRoomId}`, (message) => {
  const npcMessage = JSON.parse(message.body);
  console.log(npcMessage);
});
```

**Payload (JSON)**

```json
{
  "id": "660f9511-f30c-52e5-b827-557766551111",
  "participantId": 2,
  "body": "어서오세요, 마을에 오신 것을 환영합니다!",
  "createdAt": "2026-04-08T12:00:00.001Z"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | UUID | NPC 메시지 ID (Cassandra) |
| participantId | Long | NPC 참여자 ID |
| body | String | NPC 응답 텍스트 |
| createdAt | Instant (ISO 8601 UTC) | 메시지 생성 시각 |

---

## REST와 WebSocket의 관계

두 경로는 동일한 `SendMessageUseCase`를 공유한다.

```
REST POST /chat-rooms/{id}/messages
  → SendMessageUseCase 실행
  → NPC 응답을 /topic/chat/{roomId}로 broadcast
  → REST 응답으로 userMessage + npcMessage 동시 반환

STOMP /app/chat/{roomId}
  → 동일한 SendMessageUseCase 실행
  → NPC 응답을 /topic/chat/{roomId}로 broadcast
  → STOMP 응답 없음 (구독 채널로만 수신)
```

Happy Path Cucumber 테스트는 REST로 수행한다.
WebSocket 경로는 프론트엔드 실시간 UX용이다.

---

## Phase 3 제약사항

- **인메모리 브로커**: 단일 노드에서만 동작. 다중 인스턴스 배포 시 broadcast가 각 인스턴스 내부에서만 전달됨.
- **스케일아웃**: Redis Pub/Sub 기반 외부 브로커 교체 필요 (운영 환경 전환 시 결정).
- **인증**: WebSocket 연결 시 Spring Security가 JWT를 검증한다. 게스트 토큰으로 메시지 전송 시 `GuestChatNotAllowedException` 발생.
