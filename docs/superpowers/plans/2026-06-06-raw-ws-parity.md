# Raw WS Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ws/v2` raw WebSocket 후보 경로의 채팅/위치/타이핑/게스트 정책을 운영 STOMP `/ws`와 비교 가능한 수준으로 맞춘다.

**Architecture:** STOMP 운영 경로는 유지한다. V2 handler는 Redis Pub/Sub fan-out 경로를 계속 사용하되, V1과 다른 위치 clamp 정책과 퇴장 broadcast 누락을 먼저 고친다. NPC 응답과 메일 알림은 V1/V2 동시 운영 충돌이 있어 이번 Step 3에서 구현하지 않고 명시적 보류로 남긴다.

**Tech Stack:** Java 21, Spring Boot 4, JUnit 5, Mockito, Awaitility, Testcontainers Redis 7.2, raw WebSocket JSON envelope.

---

## File Structure

- Modify: `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandler.java`
  - V2 POSITION clamp를 제거하고 V1처럼 finite 좌표만 검증한다.
  - `afterConnectionClosed`에서 인증 유저의 기존 구독 방에 `POSITION_UPDATE userType=LEAVE`를 broadcast한다.
- Modify: `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/RoomSubscriptionRegistry.java`
  - 세션이 들어 있던 roomId snapshot을 반환하는 메서드를 추가한다.
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandlerTest.java`
  - V2 POSITION이 V1처럼 음수 좌표를 clamp하지 않는지 검증한다.
  - 연결 종료 시 구독 방마다 LEAVE update를 publish하는지 검증한다.
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/RoomSubscriptionRegistryTest.java`
  - 세션별 구독 방 snapshot 반환과 unsubscribeAll cleanup을 검증한다.
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketV2IntegrationTest.java`
  - 실제 `/ws/v2` + Redis 경로에서 disconnect LEAVE broadcast를 검증한다.
- Modify: `docs/specs/websocket-raw-v2-draft.md`
  - V2 outbound position/typing 필드를 실제 구현의 `displayId`로 맞춘다.
  - 이번 Step 3에서 해결된 항목과 남은 보류 항목을 분리한다.
- Modify: `docs/handover/track-realtime-infra-reset.md`
  - Step 3 진행/완료 상태, 검증 결과, 보류 리스크를 기록한다.

---

### Task 1: Room Subscription Snapshot

**Files:**
- Modify: `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/RoomSubscriptionRegistry.java`
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/RoomSubscriptionRegistryTest.java`

- [ ] **Step 1: Add failing registry test**

Add this test:

```java
@Test
void roomsOf는_세션이_구독한_방_id_snapshot을_반환한다() {
    registry.subscribe(10L, "session-A");
    registry.subscribe(11L, "session-A");
    registry.subscribe(11L, "session-B");

    assertThat(registry.roomsOf("session-A")).containsExactlyInAnyOrder(10L, 11L);
    assertThat(registry.roomsOf("session-B")).containsExactly(11L);
    assertThat(registry.roomsOf("session-X")).isEmpty();
}
```

- [ ] **Step 2: Run registry test and verify failure**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.RoomSubscriptionRegistryTest"
```

Expected failure:

```text
cannot find symbol: method roomsOf(String)
```

- [ ] **Step 3: Implement roomsOf**

Add to `RoomSubscriptionRegistry`:

```java
public List<Long> roomsOf(String sessionId) {
    return roomToSessions.entrySet().stream()
            .filter(entry -> entry.getValue().contains(sessionId))
            .map(Map.Entry::getKey)
            .toList();
}
```

This method returns a snapshot list. It must not expose the internal concurrent sets.

- [ ] **Step 4: Run registry test and verify pass**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.RoomSubscriptionRegistryTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

---

### Task 2: V2 Position Parity and Leave Broadcast

**Files:**
- Modify: `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandler.java`
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandlerTest.java`

- [ ] **Step 1: Add failing handler tests**

Add test for V1-compatible unclamped position:

```java
@Test
void POSITION은_V1처럼_유한한_좌표를_clamping_없이_publish한다() throws Exception {
    AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
    sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
    TextMessage frame = new TextMessage("{\"type\":\"POSITION\",\"roomId\":1,\"x\":3000.0,\"y\":-50.0}");

    handler.handleTextMessage(session, frame);

    ArgumentCaptor<OutboundFrame> captor = ArgumentCaptor.forClass(OutboundFrame.class);
    verify(bus).publish(eq(1L), captor.capture());
    PositionUpdateEvent event = (PositionUpdateEvent) captor.getValue();
    assertThat(event.x()).isEqualTo(3000.0);
    assertThat(event.y()).isEqualTo(-50.0);
}
```

Add test for close-time leave:

```java
@Test
void 연결이_종료되면_구독했던_방마다_LEAVE_POSITION_UPDATE를_publish한다() {
    AuthenticatedUser user = new AuthenticatedUser(101L, UserType.MEMBER);
    sessionAttributes.put(JwtHandshakeInterceptor.AUTHENTICATED_USER_KEY, user);
    given(subscriptionRegistry.roomsOf(SESSION_ID)).willReturn(List.of(1L, 2L));

    handler.afterConnectionClosed(session, CloseStatus.NORMAL);

    ArgumentCaptor<OutboundFrame> captor = ArgumentCaptor.forClass(OutboundFrame.class);
    verify(bus).publish(eq(1L), captor.capture());
    verify(bus).publish(eq(2L), captor.capture());
    assertThat(captor.getAllValues())
            .allSatisfy(frame -> {
                PositionUpdateEvent event = (PositionUpdateEvent) frame;
                assertThat(event.displayId()).isEqualTo("user-101");
                assertThat(event.userType()).isEqualTo("LEAVE");
                assertThat(event.x()).isZero();
                assertThat(event.y()).isZero();
            });
    verify(subscriptionRegistry).unsubscribeAll(SESSION_ID);
    verify(sessionRegistry).remove(SESSION_ID);
}
```

Import `java.util.List` if needed.

- [ ] **Step 2: Run handler test and verify failure**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest"
```

Expected failures:

```text
expected 3000.0 but was 2400.0
Wanted but not invoked: bus.publish(...)
```

- [ ] **Step 3: Implement handler parity**

In `ChatWebSocketHandler`:

1. Remove `maxX` and `maxY` fields.
2. In `handlePosition`, publish `frame.x()` and `frame.y()` directly after `Double.isFinite` validation.
3. In `afterConnectionClosed`, before `unsubscribeAll`, capture `subscriptionRegistry.roomsOf(session.getId())` and publish a `PositionUpdateEvent` with `userType="LEAVE"`, `x=0`, `y=0` for each room if `principalOf(session.getAttributes())` returns an authenticated user.

Implementation shape:

```java
@Override
public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    AuthenticatedUser user = JwtHandshakeInterceptor.principalOf(session.getAttributes());
    if (user != null) {
        for (Long roomId : subscriptionRegistry.roomsOf(session.getId())) {
            bus.publish(roomId, PositionUpdateEvent.of(roomId, user.displayId(), "LEAVE", 0, 0));
        }
    }
    subscriptionRegistry.unsubscribeAll(session.getId());
    sessionRegistry.remove(session.getId());
}
```

- [ ] **Step 4: Run handler test and verify pass**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

---

### Task 3: V2 Integration Leave Broadcast

**Files:**
- Modify: `backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketV2IntegrationTest.java`

- [ ] **Step 1: Add failing integration test**

Add a test:

```java
@Test
void 구독_세션이_disconnect되면_같은_방_다른_세션은_LEAVE_POSITION_UPDATE를_받는다() throws Exception {
    long roomId = 1L;
    String tokenA = issueTokenPort.issueMemberToken(1001L);
    String tokenB = issueTokenPort.issueMemberToken(2002L);

    BlockingQueue<String> queueA = new LinkedBlockingQueue<>();
    BlockingQueue<String> queueB = new LinkedBlockingQueue<>();
    WebSocketSession sessionA = connect(tokenA, queueA);
    WebSocketSession sessionB = connect(tokenB, queueB);

    sessionA.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
    sessionB.sendMessage(new TextMessage("{\"type\":\"SUBSCRIBE\",\"roomId\":" + roomId + "}"));
    awaitSessionCount(roomId, 2);
    drain(queueB);

    sessionA.close();

    String received = queueB.poll(RECEIVE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
    assertThat(received)
            .contains("\"POSITION_UPDATE\"")
            .contains("\"displayId\":\"user-1001\"")
            .contains("\"userType\":\"LEAVE\"")
            .contains("\"x\":0.0")
            .contains("\"y\":0.0");
    awaitSessionCount(roomId, 1);
}
```

- [ ] **Step 2: Run integration test and verify pass after Task 2 implementation**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

---

### Task 4: Spec and Track Update

**Files:**
- Modify: `docs/specs/websocket-raw-v2-draft.md`
- Modify: `docs/handover/track-realtime-infra-reset.md`

- [ ] **Step 1: Fix raw V2 draft field names and resolved gaps**

Update `POSITION_UPDATE` and `TYPING_UPDATE` examples to use `displayId`, not `id`.

Add a section:

```markdown
## Step 3 Parity 상태

- 채팅 USER 메시지: V2 Redis Pub/Sub 경로 검증됨.
- 게스트 채팅 거부: V1과 동일하게 거부됨.
- 위치/타이핑: 게스트 포함 인증 유저 broadcast 가능.
- 위치 좌표: V1과 동일하게 finite 검증만 수행하고 clamp하지 않음.
- 퇴장 위치 broadcast: disconnect 시 `POSITION_UPDATE` with `userType="LEAVE"` 발행.
```

Keep unresolved:

```markdown
- NPC 응답은 아직 V2로 broadcast되지 않는다.
- 메일 알림(`/user/queue/mail`) 대응이 없다.
- query param `access_token` 운영 리스크가 남아 있다.
```

- [ ] **Step 2: Update track**

Set Step 3 to 완료 after implementation commit exists:

```markdown
| 3 | Raw WS Parity: 채팅/위치/타이핑/게스트 정책 parity 확보 | 완료 | #127 | <implementation-commit-sha> |
```

Append:

```markdown
Raw WS Parity 완료:

- V2 위치 좌표 정책을 V1과 맞춰 finite 검증만 수행하고 clamp하지 않도록 했다.
- V2 disconnect 시 구독 방마다 `POSITION_UPDATE userType=LEAVE`를 Redis Pub/Sub으로 broadcast한다.
- raw V2 후보 명세의 `POSITION_UPDATE`/`TYPING_UPDATE` 필드를 실제 구현의 `displayId`와 맞췄다.
- 보류: NPC 응답 V2 broadcast, 메일 알림, query param token 운영 정책.
```

---

### Task 5: Verification and Commit

**Files:**
- All modified files from Tasks 1-4.

- [ ] **Step 1: Run focused backend V2 suite**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.RoomSubscriptionRegistryTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

- [ ] **Step 2: Run markdown lint**

Run:

```powershell
npm.cmd run lint:md
```

Expected:

```text
Summary: 0 error(s)
```

- [ ] **Step 3: Commit and push**

Commit:

```powershell
git add backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandler.java backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/RoomSubscriptionRegistry.java backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandlerTest.java backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/RoomSubscriptionRegistryTest.java backend/src/test/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketV2IntegrationTest.java docs/specs/websocket-raw-v2-draft.md docs/handover/track-realtime-infra-reset.md
git commit -m "Align raw websocket v2 parity"
git push origin chore/realtime-infra-reset-design
```

---

## Self-Review

- Spec coverage: This plan addresses Step 3 parity for chat baseline, position, typing, guest policy, and leave/cleanup behavior. It intentionally excludes NPC and mail because those require a separate broadcast-port/user-queue design.
- Placeholder scan: The only deferred value is the implementation commit hash in the track row, which is filled after commit creation.
- Type consistency: V2 events use existing `PositionUpdateEvent.displayId()` and `TypingUpdateEvent.displayId()` names, matching current code.
