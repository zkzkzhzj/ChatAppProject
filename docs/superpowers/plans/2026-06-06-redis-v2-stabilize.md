# Redis V2 Stabilize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redis Pub/Sub 기반 `/ws/v2` 실험 경로를 운영 전환 후보로 평가할 수 있도록 현재 정책과 실패 케이스를 테스트로 고정한다.

**Architecture:** 운영 STOMP `/ws` 경로는 건드리지 않는다. `/ws/v2` raw WebSocket handler, Redis room subscription registry, Redis relay의 기존 동작을 보강 테스트로 고정하고, 보존/미해결 정책을 트랙 문서에 기록한다.

**Tech Stack:** Java 21, Spring Boot 4, JUnit 5, Mockito, Awaitility, Testcontainers Redis 7.2.

---

## File Structure

- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandlerTest.java`
  - 위치/타이핑 실패 정책을 단위 테스트로 보강한다.
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketV2IntegrationTest.java`
  - 실제 `/ws/v2` + Redis 경로에서 게스트 토큰 위치 broadcast, 토큰 없는 위치 silent ignore, 타이핑 broadcast를 검증한다.
- Modify: `docs/handover/track-realtime-infra-reset.md`
  - Step 1 상태, 검증 결과, 남은 운영 리스크를 기록한다.

---

### Task 1: Handler Failure Policy Tests

**Files:**
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandlerTest.java`

- [ ] **Step 1: Add tests for silent ignore and guest typing policy**

Add tests that verify:

```java
@Test
void POSITION은_NaN_또는_Infinity_좌표면_조용히_무시된다() throws Exception {
    AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
    sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);

    handler.handleTextMessage(session,
            new TextMessage("{\"type\":\"POSITION\",\"roomId\":1,\"x\":\"NaN\",\"y\":200.0}"));
    handler.handleTextMessage(session,
            new TextMessage("{\"type\":\"POSITION\",\"roomId\":1,\"x\":100.0,\"y\":\"Infinity\"}"));

    verify(bus, never()).publish(anyLong(), any(OutboundFrame.class));
    verify(session, never()).sendMessage(any(TextMessage.class));
}

@Test
void Principal이_없는_TYPING은_조용히_무시된다() throws Exception {
    TextMessage frame = new TextMessage("{\"type\":\"TYPING\",\"roomId\":1,\"typing\":true}");

    handler.handleTextMessage(session, frame);

    verify(bus, never()).publish(anyLong(), any(OutboundFrame.class));
    verify(session, never()).sendMessage(any(TextMessage.class));
}

@Test
void TYPING은_게스트도_publish된다() throws Exception {
    AuthenticatedUser guest = new AuthenticatedUser(null, UserType.GUEST, "guest-abc");
    sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, guest);
    TextMessage frame = new TextMessage("{\"type\":\"TYPING\",\"roomId\":1,\"typing\":true}");

    handler.handleTextMessage(session, frame);

    ArgumentCaptor<OutboundFrame> captor = ArgumentCaptor.forClass(OutboundFrame.class);
    verify(bus).publish(eq(1L), captor.capture());
    TypingUpdateEvent event = (TypingUpdateEvent) captor.getValue();
    assertThat(event.displayId()).isEqualTo("guest-abc");
    assertThat(event.typing()).isTrue();
}
```

- [ ] **Step 2: Run focused handler tests**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

---

### Task 2: V2 Redis Integration Policy Tests

**Files:**
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketV2IntegrationTest.java`

- [ ] **Step 1: Add integration helpers**

Add a helper that drains stale frames before negative assertions:

```java
private void drain(BlockingQueue<String> queue) {
    queue.clear();
}
```

- [ ] **Step 2: Add guest token position broadcast test**

Add a test that connects a member and a guest token, subscribes both to room `1`, sends `POSITION` from the guest, and asserts the member receives:

```text
"POSITION_UPDATE"
"userType":"GUEST"
"x":100.0
"y":200.0
```

- [ ] **Step 3: Add no-token position silent ignore test**

Add a test that connects without token, subscribes, sends `POSITION`, and asserts no frame is received within `NEGATIVE_WAIT_SECONDS`.

- [ ] **Step 4: Add typing broadcast test**

Add a test that connects two member sessions, subscribes both, sends `TYPING` from one, and asserts the other receives:

```text
"TYPING_UPDATE"
"displayId":"user-1001"
"typing":true
```

- [ ] **Step 5: Run focused integration tests**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

---

### Task 3: Verification and Track Update

**Files:**
- Modify: `docs/handover/track-realtime-infra-reset.md`

- [ ] **Step 1: Run Redis/V2 focused suite**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.out.messaging.redis.RedisChatRelayTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

- [ ] **Step 2: Update track**

In `docs/handover/track-realtime-infra-reset.md`, set Step 1 to 완료 with the implementation commit hash after the commit exists, and append:

```markdown
Redis/V2 Stabilize 완료:

- `/ws/v2` handler의 위치/타이핑 실패 정책을 테스트로 고정했다.
- 실제 `/ws/v2` + Redis Pub/Sub 경로에서 게스트 토큰 위치 broadcast, 토큰 없는 위치 silent ignore, 타이핑 broadcast를 검증했다.
- Redis 설정은 Spring Boot 4 `spring.data.redis.*`, Redis 7.2 테스트 컨테이너, exact room channel SUBSCRIBE 기준을 유지한다.
- 남은 리스크: URL query `access_token`, NPC 응답 V2 미전달, 메일 알림 미지원, raw WS client adapter 미구현.
```

- [ ] **Step 3: Commit and push**

Commit implementation and track update:

```powershell
git add backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandlerTest.java backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketV2IntegrationTest.java docs/handover/track-realtime-infra-reset.md
git commit -m "Stabilize redis v2 realtime tests"
git push origin chore/realtime-infra-reset-design
```

---

## Self-Review

- Spec coverage: This plan covers the Step 1 roadmap item by strengthening Redis/V2 tests without changing the operating STOMP path.
- Placeholder scan: The only deferred value is the final implementation commit hash, which is filled after commit creation.
- Type consistency: Test names, helper names, and existing constants match the inspected backend test files.
