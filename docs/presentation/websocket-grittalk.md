---
marp: true
theme: default
paginate: true
backgroundColor: #ffffff
color: #222222
style: |
  section {
    font-family: 'Pretendard', 'Malgun Gothic', sans-serif;
    padding: 40px 50px;
  }
  h1 { color: #1a1a2e; font-size: 2em; }
  h2 { color: #0f3460; font-size: 1.4em; border-bottom: 3px solid #0f3460; padding-bottom: 6px; }
  h3 { color: #333; font-size: 1.1em; }
  table { font-size: 0.65em; width: 100%; border-collapse: collapse; }
  th { background: #0f3460; color: #ffffff; padding: 5px 8px; }
  td { padding: 4px 8px; border-bottom: 1px solid #ddd; color: #222; vertical-align: top; }
  tr:nth-child(even) { background: #f5f5f5; }
  blockquote { border-left: 4px solid #999; padding: 6px 14px; background: #fafafa; color: #333; font-size: 0.8em; margin: 6px 0; }
  code { background: #f0f0f0; color: #333; padding: 2px 6px; border-radius: 4px; }
  pre { font-size: 0.7em; }
---

# 실시간 마을 채팅의 WebSocket 여정

---

## 이 서비스가 뭔가요?

대화가 그리운 사람을 위한 **2D 온라인 마을**

- Phaser.js로 만든 마을을 캐릭터가 돌아다닌다
- 이웃(유저)과 AI 주민(NPC)이 실시간으로 대화한다
- 캐릭터의 위치가 실시간으로 공유된다

### 실시간이 필요한 3가지

```text
1. 채팅 메시지  →  내가 보낸 말이 상대방에게 즉시 도착
2. 캐릭터 위치  →  내가 움직이면 상대방 화면에서도 움직임
3. 타이핑 표시  →  상대방이 입력 중인지 실시간 확인
```

> 💡 라이브 데모: **<https://ghworld.co>**

---

## 왜 HTTP로는 안 되는가?

```text
HTTP (Polling)                    WebSocket
┌────────┐     ┌────────┐       ┌────────┐     ┌────────┐
│ Client │────→│ Server │       │ Client │◄───►│ Server │
│        │←────│        │       │        │     │        │
│        │────→│        │       │  하나의 연결로  │        │
│        │←────│        │       │  양방향 통신   │        │
└────────┘     └────────┘       └────────┘     └────────┘
 매번 새 연결 + 헤더 반복           연결 1번, 이후 프레임만 교환
 서버가 먼저 보낼 수 없음           서버가 언제든 push 가능
```

캐릭터 위치를 100ms마다 보내야 하는데
→ HTTP polling: **초당 10번 × 유저 수** 만큼 요청 폭발
→ WebSocket: **연결 1개로 계속 전송**

---

## 왜 Raw WebSocket이 아니라 STOMP인가?

```text
Raw WebSocket                    STOMP over WebSocket
┌──────────────────┐            ┌──────────────────┐
│ "안녕하세요"      │            │ SEND              │
│                  │            │ destination:/app/  │
│ → 이게 채팅?     │            │   chat/village     │
│   위치 업데이트?  │            │ content-type:json  │
│   타이핑 알림?   │            │                    │
│   파싱은 누가?   │            │ {"body":"안녕"}    │
└──────────────────┘            └──────────────────┘
 메시지 타입 구분 직접 구현         프로토콜이 라우팅 해줌
```

### STOMP 선택 이유

- **메시지 라우팅**: destination 기반으로 핸들러 자동 매핑
- **구독 모델**: `/topic/chat/village` 구독하면 해당 채널 메시지만 수신
- **Spring 네이티브 지원**: `@MessageMapping`으로 컨트롤러처럼 작성

---

## 전체 아키텍처

```text
브라우저 (React + Phaser.js)
    │
    │ STOMP over WebSocket (/ws)
    │
    ▼
┌─────────────────────────────────────────────┐
│  Spring Boot                                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ StompAuthChannelInterceptor         │   │
│  │ → CONNECT 프레임에서 JWT 추출       │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│    ┌────────────┼────────────┐              │
│    ▼            ▼            ▼              │
│  /app/chat   /app/village  /app/village     │
│  /village    /position     /typing          │
│    │            │            │              │
│    ▼            ▼            ▼              │
│  ChatMessage  Position    Typing            │
│  Handler      Handler     Handler           │
│    │            │                           │
│    ▼            ▼                           │
│  /topic/chat  /topic/village               │
│  /village     /positions                    │
└─────────────────────────────────────────────┘
```

---

## 핵심 도전 #1: 인증을 어떻게 할 것인가

HTTP에는 `Authorization` 헤더가 있다. **WebSocket에는?**

```text
[HTTP 요청]
GET /api/v1/chat/messages
Authorization: Bearer eyJhbG...

[WebSocket]
STOMP CONNECT 프레임
Authorization: ???
→ 표준 스펙에 인증 헤더가 없다
```

---

### 해결: STOMP CONNECT 프레임에 JWT를 실어 보낸다

```java
// StompAuthChannelInterceptor.java
public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor = wrap(message);
    
    if (accessor.getCommand() == StompCommand.CONNECT) {
        String token = accessor.getFirstNativeHeader("Authorization");
        // → JWT 파싱 → Principal 설정
    }
}
```

> 이후 모든 STOMP 메시지에서 `Principal`로 유저 식별 가능

---

## 핵심 도전 #2: 게스트는 읽기만, 회원만 쓰기

```text
게스트 (비회원)                    회원
┌──────────────┐               ┌──────────────┐
│ STOMP CONNECT│               │ STOMP CONNECT│
│ (토큰 없음)  │               │ (JWT 포함)   │
│              │               │              │
│ ✅ 구독 가능  │               │ ✅ 구독 가능  │
│ /topic/chat/ │               │ /topic/chat/ │
│ village      │               │ village      │
│              │               │              │
│ ❌ 전송 불가  │               │ ✅ 전송 가능  │
│ → 403        │               │ /app/chat/   │
└──────────────┘               └──────────────┘
```

---

### 왜 이렇게 했나?

- 비회원도 마을 분위기를 **구경**할 수 있어야 한다 (유입 전략)
- 하지만 채팅 참여는 **가입 유도** 포인트

```java
// ChatMessageHandler.java
if (user.userType() == UserType.GUEST) {
    throw new GuestChatNotAllowedException();
}
```

---

## 핵심 도전 #3: 캐릭터 위치 실시간 공유

캐릭터가 움직일 때마다 위치를 broadcast해야 한다

### 문제: 네트워크 폭발

```text
매 프레임(60fps)마다 위치 전송?
→ 초당 60개 × 유저 수 = 서버 폭발
```

---

### 해결: 클라이언트 100ms 쓰로틀 + 서버 broadcast

```text
클라이언트                    서버
  │                           │
  │── 100ms마다 위치 전송 ──→│── broadcast ──→ 다른 유저들
  │   {x: 120, y: 340}       │
  │                           │
  │                    수신 측: lerp 보간으로 부드럽게 이동
```

### 접속 종료 감지

```java
// PositionDisconnectListener.java
@EventListener
public void onDisconnect(SessionDisconnectEvent event) {
    // → LEAVE 타입 broadcast
    // → 다른 유저 화면에서 캐릭터 제거
}
```

---

## 채팅 메시지 흐름: 유저 → NPC 응답까지

```text
① 유저가 메시지 전송
   STOMP /app/chat/village → ChatMessageHandler

② 메시지 저장 + 즉시 broadcast
   → Cassandra 저장 (원본)
   → /topic/chat/village broadcast (유저 메시지)

③ NPC 비동기 응답 (@Async)
   → 유저 메시지 임베딩 (nomic-embed-text)
   → pgvector 유사도 검색 (과거 대화 맥락)
   → LLM 호출 (GPT-4o-mini)
   → /topic/chat/village broadcast (NPC 메시지)

④ 3회 누적 시 대화 요약
   → Outbox → Kafka → LLM 요약 → pgvector 저장
```

> 유저 메시지는 **즉시** 도착, NPC 응답은 **비동기**로 도착
> → 채팅이 멈추지 않는다

---

## REST + WebSocket 이중 경로

같은 UseCase를 두 가지 경로로 실행할 수 있다

```text
[WebSocket 경로 — 주 경로]
클라이언트 STOMP → ChatMessageHandler → SendMessageUseCase
                                         → broadcast

[REST 경로 — fallback]
POST /api/v1/chat/messages → ChatRoomController → SendMessageUseCase
                                                   → SimpMessagingTemplate
                                                     .convertAndSend()
                                                   → broadcast
```

### 왜 두 개?

- WebSocket이 끊겼을 때 REST로 fallback
- API 테스트 / Cucumber 인수 테스트에서 REST 사용
- **도메인 로직(UseCase)은 하나**, 진입점만 다름

---

## 현재 한계: 서버 1대의 벽

```text
현재: Simple Broker (인메모리)
┌──────────┐     ┌──────────┐
│ 유저 A   │────→│ Server 1 │←────│ 유저 B   │
│ (세션 1) │     │ [Broker] │     │ (세션 2) │
└──────────┘     └──────────┘     └──────────┘
              ✅ 같은 서버 → 메시지 전달 OK

서버 2대가 되면?
┌──────────┐     ┌──────────┐     ┌──────────┐
│ 유저 A   │────→│ Server 1 │     │ Server 2 │←────│ 유저 B   │
│ (세션 1) │     │ [Broker] │     │ [Broker] │     │ (세션 2) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
              ❌ 다른 서버 → 메시지 못 받음!
```

---

## 다음 단계: Redis Pub/Sub 브로커 전환

```text
┌──────────┐     ┌──────────┐                    ┌──────────┐
│ 유저 A   │────→│ Server 1 │──publish──→┌─────┐│ Server 2 │←────│ 유저 B   │
│          │     │          │            │Redis││          │     │          │
│          │     │          │←subscribe──│     ││          │     │          │
└──────────┘     └──────────┘            └─────┘└──────────┘     └──────────┘
```

### 전환 계획

1. **부하 테스트**로 현재 단일 서버 한계치 측정
2. Simple Broker → **Redis Pub/Sub** 브로커 교체
3. 서버 2대 구성 후 **동일 시나리오 재테스트**
4. Before / After 수치 비교

> Port/Adapter 패턴으로 브로커 교체 시 도메인 로직 변경 없음

---

## AWS 배포: 서울 리전에서 운영 중

```text
ghworld.co
    │
    ▼ (Cloudflare SSL)
┌─────────────────────────────────┐
│  EC2 t3.medium (서울, 4GB)      │
│                                 │
│  nginx (:80)                    │
│    ├─ /api/  → App (:8080)     │
│    ├─ /ws    → App (WebSocket) │
│    └─ /      → Frontend (:3000)│
│                                 │
│  Docker Compose                 │
│  PG + Redis + Cassandra + Kafka │
│  + Spring Boot + Next.js        │
└─────────────────────────────────┘
```

- nginx WebSocket 프록시: `Upgrade` + `Connection` 헤더 필수
- CORS: `@Value`로 환경별 주입 (localhost ↔ ghworld.co)
- JVM 메모리 튜닝: Cassandra 512M, Kafka 256M, App 256M

---

## 정리

### 1. WebSocket + STOMP

HTTP polling 대신 **양방향 실시간 통신**
STOMP 프로토콜로 **메시지 라우팅 자동화**

### 2. 인증 이중 체계

HTTP JWT + STOMP CONNECT JWT
게스트는 구독만, 회원만 전송 가능

### 3. 실시간 3종 (채팅 + 위치 + 타이핑)

100ms 쓰로틀 + lerp 보간으로 **네트워크 효율 + UX** 확보

### 4. 스케일 인식

Simple Broker의 한계를 알고,
**Redis Pub/Sub 전환 계획**을 갖고 있다

### 5. 프로덕션 배포

ghworld.co에서 **실제 운영 중**

---

# Q&A

## 프로젝트

- 서비스: **<https://ghworld.co>**
- GitHub: `zkzkzhzj/ChatAppProject`

### 핵심 코드

- STOMP 인증: `StompAuthChannelInterceptor.java`
- 채팅 핸들러: `ChatMessageHandler.java`
- 위치 공유: `PositionHandler.java`
- WebSocket 설정: `WebSocketConfig.java`

### 학습 노트

- WebSocket/STOMP 딥다이브: `docs/learning/15`
- AWS 배포 과정: `docs/learning/35`
