---
title: 채팅 아키텍처
tags: [communication, websocket, cassandra, chat, stomp]
related: [infra/outbox-pattern.md, frontend/websocket-client.md]
last-verified: 2026-06-08
---

# 채팅 아키텍처

마을 공개 채팅은 `chat_room.id = 1`, `type = PUBLIC` 방 하나를 기준으로 동작한다.
일반 채팅은 사용자 메시지만 저장하고 broadcast한다. 자동 응답, 멘션 대상 조회, 대화 요약 저장은 현재 런타임에서 제거되었다.

```text
REST POST /api/v1/chat/messages
  -> SendMessageService
  -> getOrCreateParticipant()
  -> Message 저장 (Cassandra + user_message)
  -> MessageResponse 반환

STOMP /app/chat/village
  -> ChatMessageHandler
  -> SendMessageService
  -> /topic/chat/village broadcast
```

## 저장소

| 데이터 | 저장소 | 이유 |
|--------|--------|------|
| ChatRoom, Participant | PostgreSQL | 관계형 데이터와 참여자 중복 방지 |
| Message | Cassandra | 채팅방 단위 write-heavy 메시지 저장 |

## 도메인 모델

| 모델 | 속성 |
|------|------|
| ChatRoom | id, title, type(PUBLIC/DIRECT/GROUP), status(ACTIVE/CLOSED) |
| Participant | userId, chatRoomId, displayName, role(HOST/MEMBER), entryType |
| Message | chatRoomId, participantId, body, messageType(TEXT/IMAGE/SYSTEM) |

## 주요 코드

| 파일 | 역할 |
|------|------|
| `communication/application/service/SendMessageService.java` | 메시지 전송과 참여자 자동 생성 |
| `communication/adapter/out/persistence/MessageCassandraPersistenceAdapter.java` | Cassandra 메시지 저장 |
| `communication/adapter/in/websocket/ChatMessageHandler.java` | STOMP 메시지 처리 |
| `global/config/WebSocketConfig.java` | STOMP/SockJS 설정 |
