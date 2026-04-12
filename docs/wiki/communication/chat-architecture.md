---
title: 채팅 아키텍처
tags: [communication, websocket, cassandra, chat, stomp]
related: [communication/npc-conversation.md, infra/outbox-pattern.md, frontend/websocket-client.md]
last-verified: 2026-04-13
---

# 채팅 아키텍처

## 전체 흐름

```
[REST] 채팅방 생성
POST /api/v1/chat-rooms
  → ChatRoom(NPC) 생성
  → Participant(HOST, 유저) + Participant(NPC) 생성

[REST] 메시지 전송
POST /api/v1/chat-rooms/{roomId}/messages
  → 유저 참여자 확인
  → Message(유저) → Cassandra 저장
  → NPC 응답 생성 (현재 하드코딩)
  → Message(NPC) → Cassandra 저장
  → WebSocket /topic/chat/{roomId} broadcast
  → REST 응답: {userMessage, npcMessage}

[WebSocket] 실시간 메시지 전송
/app/chat/{roomId}
  → ChatMessageHandler (@MessageMapping)
  → SendMessageService (REST와 동일 로직)
  → /topic/chat/{roomId} broadcast
```

## 저장소 전략

| 데이터 | 저장소 | 이유 |
|--------|--------|------|
| ChatRoom, Participant | PostgreSQL | 관계형 데이터, 트랜잭션 필요 |
| Message | Cassandra | write-once, 시간순 조회 최적화, 대량 메시지 처리 |

### Cassandra 메시지 테이블

```sql
PRIMARY KEY ((chat_room_id), created_at, id)
CLUSTERING ORDER BY (created_at DESC, id DESC)
```

- Partition Key: `chat_room_id` — 채팅방별 데이터 분리
- Clustering: `created_at DESC` — 최신 메시지 우선 조회

## WebSocket 구조

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `/ws` (SockJS fallback) |
| 프로토콜 | STOMP |
| 브로커 | Simple Broker (인메모리) |
| 클라이언트 → 서버 | `/app/chat/{roomId}` |
| 서버 → 클라이언트 | `/topic/chat/{roomId}` |

> 스케일아웃 시 Redis Pub/Sub 기반 외부 브로커로 교체 예정 (ADR-007)

## 도메인 모델

| 모델 | 핵심 속성 |
|------|----------|
| ChatRoom | id, title, type(DIRECT/GROUP/NPC), status(ACTIVE/CLOSED) |
| Participant | userId, chatRoomId, displayName, role(HOST/MEMBER/NPC), entryType |
| Message | chatRoomId, participantId, body, messageType(TEXT/SYSTEM/NPC_REPLY) |

## 핵심 코드 위치

| 파일 | 역할 |
|------|------|
| `communication/application/service/SendMessageService.java` | 메시지 전송 로직 |
| `communication/application/service/CreateChatRoomService.java` | 채팅방 생성 |
| `communication/adapter/out/persistence/MessageCassandraPersistenceAdapter.java` | Cassandra 저장 |
| `communication/adapter/in/websocket/ChatMessageHandler.java` | STOMP 메시지 핸들러 |
| `global/config/WebSocketConfig.java` | STOMP/SockJS 설정 |
