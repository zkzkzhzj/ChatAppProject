---
title: WebSocket 클라이언트
tags: [frontend, websocket, stomp, sockjs, chat]
related: [communication/chat-architecture.md, frontend/phaser-setup.md]
last-verified: 2026-04-15
---

# WebSocket 클라이언트

## 라이브러리

| 패키지 | 버전 | 역할 |
|--------|------|------|
| @stomp/stompjs | 7.3.0 | STOMP 프로토콜 클라이언트 |
| sockjs-client | 1.6.1 | WebSocket fallback |
| axios | 1.14.0 | REST API 호출 (로그인, 회원가입, 메시지 전송 등) |

## 연결

```typescript
// stompClient.ts — @stomp/stompjs Client 기반 (싱글턴)
import { Client } from '@stomp/stompjs';

// JWT 인증 연결
connectWithAuth(token: string, onConnected: () => void, onError?: (err: IFrame) => void)
// 내부적으로 Client.connectHeaders에 { Authorization: `Bearer ${token}` } 설정

// 연결 해제
disconnectStomp()  // client.deactivate() 후 참조 null 처리
```

## 메시지 송수신

### 전송 (클라이언트 → 서버)

```typescript
// stompClient.ts
sendVillageMessage(body: string)
// → client.publish({ destination: '/app/chat/village', body: JSON.stringify({ body }) })
// 채널 개념 도입 전까지 destination은 /app/chat/village 고정
```

### 수신 (서버 → 클라이언트)

```typescript
// stompClient.ts
subscribeToChatRoom(topic: string, onMessage: (msg: MessageResponse) => void): StompSubscription
// → client.subscribe(`/topic/chat/${topic}`, callback)
// 서버는 단일 MessageResponse 객체를 broadcast한다
// 현재 useStomp에서 항상 'village'를 전달하여 /topic/chat/village 고정 구독
```

### React Hook (useStomp)

```typescript
// useStomp.ts — 마운트 시 즉시 연결, /topic/chat/village 고정 구독
useStomp()
// - 토큰(localStorage.accessToken)이 있으면 마운트 시 즉시 STOMP 연결
// - /topic/chat/village 구독 → store.addMessage()
// - connectionStatus 상태 관리: connecting → connected | error, unmount 시 disconnected
// - unmount 시 구독 해제 + disconnectStomp()
```

## 목적지 정리

| 방향 | 목적지 | 설명 |
|------|--------|------|
| 클라이언트 → 서버 | `/app/chat/village` | 마을 공개 채팅 메시지 전송 |
| 서버 → 클라이언트 | `/topic/chat/village` | 유저 메시지 + NPC 응답 + SYSTEM 입/퇴장 알림 broadcast (단일 MessageResponse) |
| 클라이언트 → 서버 | `/app/village/position` | 위치 좌표 전송 |
| 서버 → 클라이언트 | `/topic/village/positions` | 유저 위치 + 퇴장 broadcast (PositionBroadcast) |

## 인증

WebSocket 연결 시 STOMP CONNECT 프레임의 `Authorization` 헤더에 JWT 토큰을 전달한다. 서버 측에서 `StompAuthChannelInterceptor`(ChannelInterceptor)가 CONNECT 프레임을 가로채 JWT를 검증하고, `Principal`로 설정한다. 토큰이 유효하지 않으면 `MessageDeliveryException`으로 연결을 거부하며, 클라이언트는 STOMP ERROR 프레임을 받아 `onStompError` 콜백이 호출된다. 토큰 없이도 연결은 허용되지만(게스트), 메시지 전송 시 `GuestChatNotAllowedException`이 발생한다.

## 위치 공유

### 전송

```typescript
// stompClient.ts
sendPosition(x: number, y: number)
// → client.publish({ destination: '/app/village/position', body: JSON.stringify({ x, y }) })
```

### 수신

```typescript
// stompClient.ts
subscribeToPositions(onPosition: (pos: PositionBroadcast) => void): StompSubscription
// → client.subscribe('/topic/village/positions', callback)

// PositionBroadcast 타입
interface PositionBroadcast {
  id: string;           // MEMBER: "user-{userId}", GUEST: "guest-{UUID}"
  userType: 'MEMBER' | 'GUEST' | 'LEAVE';
  x: number;
  y: number;
}
```

### STOMP-Phaser 브릿지 (positionBridge.ts)

React(useStomp)가 STOMP에서 수신한 위치 데이터를 Phaser(VillageScene)에 전달하는 콜백 기반 브릿지.
Phaser는 React 컴포넌트가 아니므로 Zustand 대신 콜백 패턴을 사용한다.

```typescript
// positionBridge.ts
onPositionUpdate(callback: PositionListener): () => void  // Phaser에서 등록
emitPositionUpdate(pos: PositionBroadcast): void           // useStomp에서 호출
```

## 향후 구현 항목

- [ ] 연결 끊김 시 자동 재연결
- [ ] 타이핑 인디케이터 (입력 중 표시)
- [ ] 채팅 히스토리 로드 (Cassandra 페이징 조회)
