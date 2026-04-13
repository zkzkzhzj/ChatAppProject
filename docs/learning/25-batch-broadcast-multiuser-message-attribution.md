# 25. 배치 브로드캐스트와 멀티유저 메시지 귀속 — 인터리빙 방지와 "내 메시지" 판별

> 작성 시점: 2026-04-13
> 맥락: 마을 공개 채팅에서 유저 메시지 + NPC 응답을 broadcast할 때 다른 유저의 메시지가 중간에 끼어드는 문제(인터리빙)와, 멀티유저 환경에서 "내 메시지"를 구분하지 못하는 버그를 해결하면서 정리한 내용.

---

## 배경

마을 공개 채팅의 동작 흐름은 이렇다:

1. 유저 A가 메시지를 보낸다
2. 서버가 유저 A의 메시지를 저장한다
3. NPC가 자동 응답한다 (LLM 또는 하드코딩)
4. 서버가 NPC 응답을 저장한다
5. 유저 A의 메시지와 NPC 응답을 구독자 전체에게 broadcast한다

여기서 두 가지 문제가 발생했다.

**문제 1 — 인터리빙**: `convertAndSend()`를 유저 메시지, NPC 메시지 각각 호출하면, 두 호출 사이에 유저 B의 메시지가 끼어들 수 있다. 결과적으로 채팅 화면에 `A: 안녕 → B: ㅎㅇ → NPC: 반가워요~`처럼 NPC가 B에게 대답하는 것처럼 보인다.

**문제 2 — 메시지 귀속**: `senderType`이 "USER"/"NPC"만 구분하므로, 유저 B의 화면에서 유저 A의 메시지도 "나"로 표시된다. 모든 USER 메시지가 자기 것처럼 보이는 버그.

---

## 선택지 비교

### 문제 1: 인터리빙 방지

| | A. 개별 broadcast | B. 배치(List) broadcast | C. 서버 측 직렬화 (큐/락) |
|--|---------|---------|---------|
| 핵심 개념 | `convertAndSend()`를 유저/NPC 메시지마다 각각 호출 | `List<MessageResponse>`로 묶어서 한 번에 호출 | 메시지 처리를 싱글 스레드 큐로 직렬화하여 순서 보장 |
| 장점 | 구현이 가장 단순. 메시지 타입별로 독립 처리 가능 | 인터리빙을 구조적으로 방지. 클라이언트가 "이 유저 메시지에 대한 NPC 응답"을 쌍으로 받을 수 있음 | 모든 메시지의 전역 순서를 보장. 가장 강력한 보장 |
| 단점 | 두 호출 사이에 다른 메시지가 끼어들 수 있음. NPC 응답이 누구의 메시지에 대한 것인지 맥락이 끊김 | 클라이언트에서 배열/단일 객체 분기 처리 필요. NPC 응답이 비동기(스트리밍)가 되면 배치 자체가 불가능 | 동시 처리 성능이 급감. 채팅 서비스에서 병목이 될 수 있음 |
| 적합한 상황 | NPC 응답이 없거나, 메시지 간 연관이 없는 경우 | 요청-응답이 쌍으로 존재하고 동기적으로 처리되는 경우 | 금융 거래처럼 전역 순서가 절대적으로 중요한 경우 |
| 실제 사용 사례 | 일반적인 채팅 앱 (Slack, Discord) | 봇 응답이 포함된 채팅 (Discord 봇 커맨드 응답) | 주문 매칭 시스템, 이벤트 소싱 |

### 문제 2: 메시지 귀속

| | A. senderType만 사용 | B. senderId 추가 | C. participantId로 판별 |
|--|---------|---------|---------|
| 핵심 개념 | "USER"/"NPC" 두 가지 타입으로만 구분 | userId를 응답에 포함. 프론트에서 내 userId와 비교 | 채팅방별 참가자 ID(participantId)로 구분 |
| 장점 | 가장 단순. 싱글유저 환경에서 충분 | 범용적. 어떤 화면에서든 "누가 보낸 메시지인가" 판별 가능 | 채팅방 컨텍스트에 종속적이라 보안상 유리 (userId 직접 노출 없음) |
| 단점 | 멀티유저에서 "다른 유저"와 "나"를 구분 불가 | userId가 응답에 노출됨. 시퀀셜 ID면 유저 수 추측 가능 | 프론트가 "내 participantId"를 별도로 알아야 함. 입장 시마다 새로 할당되면 추적이 복잡 |
| 적합한 상황 | 1:1 채팅, 봇 전용 채널 | 다수가 참여하는 공개 채팅 | 익명성이 중요한 서비스 |

---

## 이 프로젝트에서 고른 것

**인터리빙: B. 배치(List) broadcast**
**메시지 귀속: B. senderId 추가**

이유:
1. **인터리빙 방지는 배치가 가장 깔끔하다.** 현재 NPC 응답은 동기적으로 생성된다. 유저 메시지와 NPC 응답이 항상 쌍으로 존재하므로, `List.of(userMsg, npcMsg)`로 묶어서 한 번에 보내면 중간에 다른 메시지가 끼어들 여지가 없다.
2. **senderId가 participantId보다 판별이 쉽다.** 프론트에서 JWT를 이미 갖고 있으므로, 토큰의 `sub` claim에서 userId를 꺼내 `message.senderId === myUserId`로 바로 비교하면 된다. participantId는 채팅방에 입장해야 알 수 있고, "내 participantId가 뭔지" 조회하는 추가 API가 필요해진다.
3. **userId 노출 리스크는 수용한다.** 시퀀셜 long ID라 유저 수 추측이 가능하긴 하지만, 마을 공개 채팅에서 이미 같은 공간에 있는 유저들끼리의 대화이므로 익명성 요구사항이 낮다. 나중에 UUID로 바꾸거나 난독화가 필요하면 그때 대응한다.

---

## 핵심 개념 정리

### 1. 인터리빙이 발생하는 구조

```
Thread A (유저 A 메시지 처리)          Thread B (유저 B 메시지 처리)
─────────────────────────          ─────────────────────────
convertAndSend(userA_msg)
                                   convertAndSend(userB_msg)  ← 여기서 끼어듦
convertAndSend(npcA_response)

클라이언트가 받는 순서: A → B → NPC(A)
```

Spring의 `SimpMessagingTemplate.convertAndSend()`는 스레드 세이프하지만, 두 번의 호출이 **원자적이지 않다**. 각 호출은 독립적으로 브로커 채널에 메시지를 넣는다. 두 호출 사이에 다른 스레드의 메시지가 끼어들 수 있다.

### 2. 배치 broadcast로 해결

```java
List<MessageResponse> batch = List.of(
        MessageResponse.fromUser(result.userMessage(), user.userId()),
        MessageResponse.fromNpc(result.npcMessage())
);
messagingTemplate.convertAndSend("/topic/chat/village", batch);
```

`List`를 통째로 직렬화해서 한 번에 보낸다. 하나의 STOMP MESSAGE 프레임 안에 JSON 배열이 들어간다. 중간에 다른 메시지가 끼어들 물리적 여지가 없다.

### 3. 클라이언트의 배열 파싱

서버가 배열을 보내므로 클라이언트에서 분기 처리가 필요하다.

```typescript
client.subscribe(`/topic/chat/${topic}`, (frame) => {
  const parsed: unknown = JSON.parse(frame.body);
  if (Array.isArray(parsed)) {
    (parsed as MessageResponse[]).forEach(onMessage);
  } else {
    onMessage(parsed as MessageResponse);
  }
});
```

`Array.isArray()`로 체크하는 이유: 나중에 시스템 메시지(입장/퇴장 알림)같이 배열이 아닌 단일 메시지를 같은 토픽으로 보낼 수 있다. 두 형태를 모두 처리하면 확장에 유연하다.

### 4. senderId로 "내 메시지" 판별

```
서버 응답:
{ id: "...", senderId: 42, senderType: "USER", body: "안녕" }
{ id: "...", senderId: null, senderType: "NPC", body: "반가워요~" }

프론트 판별:
myUserId = JWT sub claim에서 추출 (42)
message.senderType === "NPC"     → 마을 주민 (노란색)
message.senderId === myUserId    → 나 (파란색)
그 외                             → 이웃 (초록색)
```

NPC의 senderId는 `null`이다. NPC는 userId가 없는 존재이므로, `@Nullable Long senderId`로 설계했다. 이 null이 "NPC"라는 의미를 암묵적으로 갖게 되는데, `senderType`이 이미 명시적으로 구분하고 있으므로 문제없다.

### 5. JWT에서 userId 추출 (라이브러리 없이)

```typescript
export function getUserIdFromToken(): number | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];  // header.payload.signature
    const decoded = JSON.parse(atob(payload)) as { sub?: string };
    return decoded.sub ? Number(decoded.sub) : null;
  } catch {
    return null;
  }
}
```

JWT는 `header.payload.signature` 세 파트를 `.`으로 구분한다. payload는 base64url 인코딩된 JSON이다. `atob()`으로 디코딩하면 별도 라이브러리 없이 claim을 읽을 수 있다. 서명 검증은 하지 않는데, 프론트에서의 JWT 디코딩은 "표시 용도"이지 "인증 용도"가 아니기 때문이다. 인증은 서버가 한다.

---

## 실전에서 주의할 점

- **NPC 응답이 비동기/스트리밍이 되면 배치가 깨진다.** 지금은 NPC 응답이 동기적으로 즉시 생성되니까 `List.of(user, npc)`가 가능하다. LLM 응답이 스트리밍(SSE 스타일 토큰 단위 전송)으로 바뀌면, 유저 메시지는 먼저 broadcast하고 NPC 응답은 토큰 단위로 따로 보내야 한다. 이때는 인터리빙을 다른 방식(예: `replyToMessageId` 필드)으로 해결해야 한다.

- **`atob()`은 base64url과 미세하게 다르다.** JWT payload가 `+`나 `/`를 포함하는 경우 `atob()`이 실패할 수 있다. 현재 서버 JWT는 숫자 ID만 sub에 넣으므로 문제가 없지만, claim에 특수문자가 들어가면 base64url 변환 로직을 추가해야 한다.

- **`getUserIdFromToken()`을 매 렌더링마다 호출하고 있다.** `ChatBubble` 컴포넌트가 렌더될 때마다 `localStorage.getItem()` + `atob()` + `JSON.parse()`가 실행된다. 메시지가 100개면 100번 실행. 성능 문제는 아직 없지만, 메시지가 많아지면 userId를 Zustand store나 Context에 캐싱하는 게 맞다.

- **senderId로 유저를 "특정"하지는 않는다.** 현재 "이웃"이라고만 표시하지 닉네임을 보여주지 않는다. 나중에 닉네임을 보여주려면 `senderName` 필드를 응답에 추가하거나, 프론트에서 userId → 닉네임 매핑을 캐싱해야 한다. 매 메시지마다 유저 조회 API를 호출하면 안 된다.

- **배열 응답의 스키마 변화에 주의한다.** 프론트가 `Array.isArray()`로 분기하고 있으므로, 서버가 보내는 메시지 형태(배열 vs 단일)가 바뀌면 프론트 파싱이 깨진다. 배열인 경우와 단일인 경우의 용도를 명확히 정의하고, 혼용하지 않는 게 안전하다. 이상적으로는 모든 메시지를 배열로 통일하는 것도 방법이다.

---

## 나중에 돌아보면

- **이 배치 패턴이 한계에 부딪히는 시점:** NPC 응답이 LLM 스트리밍으로 전환될 때. LLM은 토큰 단위로 느리게 생성하므로, 유저 메시지를 NPC 응답 완료까지 기다렸다가 함께 보내면 UX가 나빠진다. 그때는 유저 메시지를 즉시 broadcast하고, NPC는 별도 스트림(typing indicator → 토큰 스트리밍 → 완료)으로 분리해야 한다.

- **메시지에 `replyToMessageId`가 필요해지는 시점:** 여러 유저가 동시에 NPC에게 말을 걸면, NPC 응답이 누구의 메시지에 대한 것인지 알 수 없다. 배치로 묶여 있을 때는 "같은 배치 = 같은 대화 턴"이라 자연스럽지만, 개별 broadcast로 전환하면 `replyToMessageId`로 명시적 연결이 필요하다.

- **유저 수가 늘어 닉네임 표시가 필요해지는 시점:** "이웃"이라는 익명 표시가 의미 없어지면, 메시지에 `senderName`을 포함하거나 별도 Presence API로 접속 유저 목록을 관리해야 한다.

- **시퀀셜 userId가 문제 되는 시점:** 공개 API에 userId가 노출되면 전체 유저 수를 추측할 수 있다. 외부 공개 ID는 UUID나 해시값으로 분리하는 것을 Phase 전환 시 검토한다.

---

## 더 공부할 거리

### 직접 관련
- 관련 학습노트: [21-village-public-chat-architecture.md](./21-village-public-chat-architecture.md) -- 마을 공개 채팅의 전체 아키텍처와 Everyone/Nearby/DM 비교
- 관련 학습노트: [23-chatroom-structure-space-equals-room.md](./23-chatroom-structure-space-equals-room.md) -- "공간이 곧 채팅방" 설계와 NPC 대화 분리
- 관련 학습노트: [15-websocket-stomp-deep-dive.md](./15-websocket-stomp-deep-dive.md) -- WebSocket/STOMP 동작 원리, Simple Broker 내부 구조

### Spring WebSocket & STOMP
- [Spring STOMP Message Flow 공식 문서](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/message-flow.html) -- `convertAndSend()`가 내부적으로 어떻게 브로커 채널에 메시지를 넣는지 이해하는 데 필수
- [Spring Boot WebSocket: STOMP, Raw Handlers, Scaling](https://websocket.org/guides/frameworks/spring-boot/) -- Spring Boot에서 STOMP 기반 WebSocket의 전체 그림

### 실시간 채팅 설계
- [How to Build Chat Applications with WebSockets](https://oneuptime.com/blog/post/2026-01-26-websocket-chat-application/view) -- WebSocket 채팅 애플리케이션의 메시지 귀속(sender identification) 패턴
- [A Practical Guide to Real-Time Chat with WebSockets](https://medium.com/@vaibhav11t/a-practical-guide-to-real-time-chat-with-websockets-82a5ddf40984) -- 실시간 채팅의 구조적 메시지 포맷(`userId`, `username`, `content` 포함) 설계

### JWT 클라이언트 사이드 처리
- JWT는 서명 검증 없이 payload를 읽을 수 있다는 점이 핵심. 프론트에서는 "표시 용도"로만 쓰고, 인증은 반드시 서버에서 수행한다. `atob()` 대신 base64url을 정확히 처리하려면 `jose` 라이브러리의 `decodeJwt()`를 검토할 수 있다.

### 다음 단계로 고민할 것
- NPC 응답이 LLM 스트리밍으로 바뀔 때 배치 패턴을 어떻게 전환할 것인가
- 유저 닉네임 표시를 위한 Presence 시스템 설계
- `replyToMessageId` 도입 시점과 UI에서의 표현 방식 (스레드? 인라인 인용?)
