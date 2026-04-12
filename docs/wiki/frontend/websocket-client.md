---
title: WebSocket 클라이언트
tags: [frontend, websocket, stomp, sockjs, chat]
related: [communication/chat-architecture.md, frontend/phaser-setup.md]
last-verified: 2026-04-13
---

# WebSocket 클라이언트

## 라이브러리

| 패키지 | 버전 | 역할 |
|--------|------|------|
| @stomp/stompjs | 7.3.0 | STOMP 프로토콜 클라이언트 |
| sockjs-client | 1.6.1 | WebSocket fallback |
| axios | 1.14.0 | REST API 호출 (채팅방 생성 등) |

## 연결

```javascript
const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);
stompClient.connect(
  { Authorization: 'Bearer <accessToken>' },
  (frame) => console.log('Connected:', frame)
);
```

## 메시지 송수신

### 전송 (클라이언트 → 서버)

```javascript
stompClient.send(`/app/chat/${roomId}`, {}, JSON.stringify({
  body: "안녕하세요"
}));
```

### 수신 (서버 → 클라이언트)

```javascript
stompClient.subscribe(`/topic/chat/${roomId}`, (message) => {
  const response = JSON.parse(message.body);
  // response: MessageResponse (participantId, body, messageType, createdAt)
});
```

## 목적지 정리

| 방향 | 목적지 | 설명 |
|------|--------|------|
| 클라이언트 → 서버 | `/app/chat/{roomId}` | 메시지 전송 |
| 서버 → 클라이언트 | `/topic/chat/{roomId}` | NPC 응답 broadcast |

## 인증

WebSocket 연결 시 STOMP 헤더에 JWT 토큰 전달. 현재 서버 측 WebSocket 인증 검증은 미구현 (보안 리뷰 시 개선 대상).

## 향후 구현 항목

- [ ] 연결 끊김 시 자동 재연결
- [ ] 타이핑 인디케이터 (입력 중 표시)
- [ ] 채팅 히스토리 로드 (Cassandra 페이징 조회)
