# Realtime Infra Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 폐기된 `ws-redis` Step 3~7 흐름을 정리하고, 현재 STOMP/raw WS/Redis 상태를 기준으로 새 `realtime-infra-reset` 트랙의 Step 0 Audit을 시작한다.

**Architecture:** 이 계획은 운영 경로를 바꾸지 않는다. STOMP 운영 경로와 `/ws/v2` 실험 경로를 문서상 분리하고, 기존 GitHub 이슈를 폐기한 뒤 새 트랙의 감사 문서를 만들어 이후 구현 계획의 기준점으로 삼는다.

**Tech Stack:** Markdown docs, GitHub CLI, Java 21/Spring Boot 4, Redis Pub/Sub, Next.js STOMP client, Gradle test.

---

## File Structure

- Create: `docs/handover/track-realtime-infra-reset.md`
  - 새 트랙의 목적, 이슈 번호, Step 0 Audit 로드맵, 충돌 위험 파일, 다음 세션 확인 사항을 기록한다.
- Create: `docs/reviews/realtime-infra-reset-audit.md`
  - STOMP 운영 경로, `/ws/v2` 실험 경로, Redis 설정, 프론트 책임, 배포/CD, 명세 불일치를 사실 기준으로 표로 정리한다.
- Modify: `docs/handover/INDEX.md`
  - stale 활성 트랙 표를 현재 GitHub 상태에 맞게 정리하고 `realtime-infra-reset`을 활성 트랙으로 추가한다.
- Modify: `docs/specs/websocket.md`
  - 현재 문서가 "운영 STOMP 명세"임을 명시하고 raw WS 후보 명세는 별도 문서에서 다룬다고 표시한다.
- Create: `docs/specs/websocket-raw-v2-draft.md`
  - 현재 `/ws/v2` 구현을 기반으로 후보 명세 초안을 작성한다. 운영 명세가 아니라 draft임을 명시한다.

---

### Task 1: GitHub Issue Reset

**Files:**
- No repository file changes.
- GitHub issues: `#31`, `#32`, `#33`, `#34`, `#35`
- GitHub issue to create: `[Track][realtime-infra-reset] STOMP/raw WS/Redis 현재 상태 감사와 전환 재설계`

- [ ] **Step 1: Confirm stale issue list**

Run:

```powershell
gh issue list --state open --json number,title,labels,url,updatedAt
```

Expected:

```text
Open issues include #31, #32, #33, #34, #35 for track:ws-redis.
No open PRs are required for this task.
```

- [ ] **Step 2: Add closure comment to #31**

Run:

```powershell
gh issue comment 31 --body "폐기합니다. 이 이슈는 하네스 정비 전의 ws-redis Step 3 계획이라 현재 코드/운영 상태와 맞지 않습니다. 현재는 STOMP 운영 경로와 /ws/v2 raw WebSocket + Redis 실험 경로가 병존하고, 프론트/CD/명세는 아직 STOMP 기준입니다. 새 트랙 realtime-infra-reset에서 현재 상태 감사(Audit)부터 다시 진행합니다."
```

Expected:

```text
Comment URL printed by gh.
```

- [ ] **Step 3: Close #31**

Run:

```powershell
gh issue close 31 --reason "not planned"
```

Expected:

```text
✓ Closed issue #31
```

- [ ] **Step 4: Add closure comments to #32-#35**

Run each command:

```powershell
gh issue comment 32 --body "폐기합니다. 기존 ws-redis Step 4 계획은 현재 하네스 기준의 감사 없이 RPC 경계와 통합 테스트 마이그레이션을 전제합니다. 새 트랙 realtime-infra-reset에서 STOMP/raw WS/Redis 현재 상태를 먼저 고정한 뒤 다시 계획합니다."
gh issue comment 33 --body "폐기합니다. 기존 ws-redis Step 5 계획은 WS 서버 컨테이너 분리를 너무 이른 목표로 둡니다. 새 트랙 realtime-infra-reset에서는 운영 경로를 끊지 않고 Audit → Stabilize → Controlled cutover 순서로 재설계합니다."
gh issue comment 34 --body "폐기합니다. 기존 ws-redis Step 6 부하 재측정은 전환 구조가 안정화된 뒤 수행해야 합니다. 새 트랙 realtime-infra-reset에서 현재 구현 감사와 cutover 기준을 먼저 확정합니다."
gh issue comment 35 --body "폐기합니다. 기존 ws-redis Step 7 블로그/마무리 계획은 Step 3~6 전제가 폐기되어 유효하지 않습니다. 새 트랙 realtime-infra-reset 결과를 기준으로 학습노트와 블로그 주제를 다시 잡습니다."
```

Expected:

```text
Each command prints a comment URL.
```

- [ ] **Step 5: Close #32-#35**

Run each command:

```powershell
gh issue close 32 --reason "not planned"
gh issue close 33 --reason "not planned"
gh issue close 34 --reason "not planned"
gh issue close 35 --reason "not planned"
```

Expected:

```text
✓ Closed issue #32
✓ Closed issue #33
✓ Closed issue #34
✓ Closed issue #35
```

- [ ] **Step 6: Create replacement issue**

Run:

```powershell
gh issue create --title "[Track][realtime-infra-reset] STOMP/raw WS/Redis 현재 상태 감사와 전환 재설계" --label "enhancement" --body "## 배경

기존 ws-redis Step 3~7 이슈는 하네스 세팅 전 계획이라 현재 코드/운영 상태와 맞지 않습니다.

현재 상태:
- 운영 프론트/CD/명세는 STOMP /ws 기준입니다.
- 백엔드에는 /ws/v2 raw WebSocket + Redis Pub/Sub 실험 경로가 이미 존재합니다.
- Redis relay와 /ws/v2 제한 통합 테스트는 통과하지만 운영 전환 가능성을 단정할 수 없습니다.
- useStomp는 토큰, 채팅, 메일, 위치, 타이핑, reconnect 책임이 한 곳에 묶여 있습니다.

## 목표

Step 0 Audit으로 현재 STOMP/raw WS/Redis/프론트/CD/명세 상태를 사실 기준으로 고정하고, 이후 Stabilize와 Controlled cutover 계획을 새로 수립합니다.

## 완료 기준

- 기존 #31~#35 폐기 완료
- docs/handover/track-realtime-infra-reset.md 생성
- docs/reviews/realtime-infra-reset-audit.md 생성
- docs/specs/websocket.md가 운영 STOMP 명세임을 명시
- docs/specs/websocket-raw-v2-draft.md 생성
- Redis/V2 보존 후보와 폐기 전제가 표로 분리됨"
```

Expected:

```text
https://github.com/zkzkzhzj/ChatAppProject/issues/<new-number>
```

- [ ] **Step 7: Record the new issue number**

Write down the created issue number. Use it as `{ISSUE_NUMBER}` in later tasks.

---

### Task 2: Track File Start

**Files:**
- Create: `docs/handover/track-realtime-infra-reset.md`

- [ ] **Step 1: Create track file**

Create `docs/handover/track-realtime-infra-reset.md` with this content, replacing `{ISSUE_NUMBER}` with the issue number from Task 1:

```markdown
# Track: realtime-infra-reset

> 작업 영역: `backend/src/main/java/com/maeum/gohyang/global/config/`, `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/`, `backend/src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/`, `frontend/src/lib/websocket/`, `deploy/`, `docs/specs/`
> 시작일: 2026-06-06
> Issue: #{ISSUE_NUMBER}
> 브랜치: `chore/realtime-infra-reset-design` 이후 Step별 브랜치 분기
> Spec: [docs/superpowers/specs/2026-06-06-realtime-infra-reset-design.md](../superpowers/specs/2026-06-06-realtime-infra-reset-design.md)

---

## 0. 한 줄 요약

기존 `ws-redis` Step 3~7을 폐기하고, 현재 STOMP 운영 경로와 `/ws/v2` raw WebSocket + Redis 실험 경로를 감사한 뒤 우리 서비스에 맞는 전환 계획을 다시 세운다.

---

## 0.5 Acceptance Criteria

- [ ] 기존 GitHub 이슈 #31~#35가 폐기 코멘트와 함께 close 됐다.
- [ ] STOMP 운영 경로와 raw WS V2 실험 경로가 감사 문서에서 분리됐다.
- [ ] Redis 설정과 V2 구현의 보존 후보/검증 부족 항목이 표로 정리됐다.
- [ ] 프론트 `useStomp` 책임이 기능 단위로 분리되어 다음 리팩터 범위가 명확해졌다.
- [ ] 운영 STOMP 명세와 raw WS 후보 명세가 분리됐다.
- [ ] 다음 구현 Step이 `Frontend Client Split`인지, `Redis/V2 Stabilize`인지 결정 가능하다.

---

## 1. 배경 / 왜

기존 `ws-redis` Step 3 계획은 하네스 도입 전 작성되어 현재 코드, 운영 배포, 프론트 구조와 맞지 않는다.

현재 운영은 STOMP `/ws` 기준이다. 반면 백엔드에는 `/ws/v2` raw WebSocket과 Redis Pub/Sub 구현이 이미 들어와 있다. 테스트 일부는 통과하지만 운영 전환 가능성을 단정할 수 없고, 프론트는 여전히 STOMP 중심이다.

관련 설계:

- [Realtime Infra Reset Design](../superpowers/specs/2026-06-06-realtime-infra-reset-design.md)
- [ws-redis 기존 트랙](./track-ws-redis.md)
- [WebSocket 운영 명세](../specs/websocket.md)

---

## 2. 전체 로드맵

| Step | 내용 | 상태 | 이슈 | Commit |
|------|------|------|------|--------|
| 0 | Audit — STOMP/raw WS/Redis/프론트/CD/명세 현재 상태 고정 | 🔧 진행 | #{ISSUE_NUMBER} | TBD |
| 1 | Stabilize Redis/V2 — Redis 설정과 V2 실패 케이스 테스트 보강 | 대기 | TBD | TBD |
| 2 | Frontend Client Split — STOMP 유지 상태에서 실시간 클라이언트 책임 분리 | 대기 | TBD | TBD |
| 3 | Raw WS Parity — 채팅/위치/타이핑/게스트 정책 parity 확보 | 대기 | TBD | TBD |
| 4 | Controlled Cutover — env/client adapter로 raw WS 선택 가능 | 대기 | TBD | TBD |
| 5 | STOMP Decision — 제거 또는 fallback 유지 결정 | 대기 | TBD | TBD |
| 6 | Load Test + ADR — 병목 재측정과 ADR 업데이트 | 대기 | TBD | TBD |

---

## 3. 현재 단계 상세

Step 0은 구현 변경을 하지 않는다.

작업:

- 기존 #31~#35 폐기
- 감사 문서 작성
- `docs/handover/INDEX.md` stale 활성 트랙 정리
- STOMP 운영 명세와 raw WS 후보 명세 분리
- 다음 구현 Step 후보를 판단 가능한 상태로 만든다.

---

## 4. 충돌 위험 파일

| 파일/디렉터리 | 이유 |
|---------------|------|
| `docs/handover/INDEX.md` | 활성 트랙 표 갱신 |
| `docs/specs/websocket.md` | 운영 STOMP 명세 표기 |
| `docs/specs/websocket-raw-v2-draft.md` | 신규 후보 명세 |
| `frontend/src/lib/websocket/` | 다음 Step에서 클라이언트 책임 분리 대상 |
| `backend/src/main/java/com/maeum/gohyang/global/config/` | STOMP/V2/Redis 설정 |
| `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/` | V1/V2 websocket handler |
| `backend/src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/` | Redis relay |
| `deploy/docker-compose.yml` | WS URL과 Redis 운영 설정 |
| `.github/workflows/deploy.yml` | Next.js build arg의 WS URL |

---

## 5. 다음 세션 착수 전 확인 사항

- `git status --short --branch`로 작업 브랜치와 미추적 파일을 확인한다.
- `gh issue list --state open`으로 새 트랙 이슈만 열려 있는지 확인한다.
- `./gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.out.messaging.redis.RedisChatRelayTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"`로 현재 V2/Redis baseline을 확인한다.
- 구현 변경 전 감사 문서를 먼저 완성한다.

---

## 6. 보류 메모

- WS 서버 별도 컨테이너 분리는 이번 트랙의 즉시 목표가 아니다.
- Gradle 멀티모듈 분리는 raw WS 전환 성공 후 별도 판단한다.
- 메일 알림(`/user/queue/mail`)은 raw WS 1차 전환 범위에서 제외할 수 있다.
```

- [ ] **Step 2: Review track file for forbidden markers**

Run:

```powershell
rg -n "TBD|FIX|\\?\\?" docs/handover/track-realtime-infra-reset.md
```

Expected:

```text
Only roadmap future issue/commit cells may contain TBD.
No repair markers or question-mark placeholders appear.
```

---

### Task 3: Handover Index Update

**Files:**
- Modify: `docs/handover/INDEX.md`

- [ ] **Step 1: Replace active track table**

In `docs/handover/INDEX.md`, replace the current Active table rows with this single row, replacing `{ISSUE_NUMBER}`:

```markdown
| `realtime-infra-reset` | [track-realtime-infra-reset.md](./track-realtime-infra-reset.md) | STOMP 운영 경로 + `/ws/v2` raw WebSocket + Redis Pub/Sub 현재 상태 감사와 전환 재설계 | 🔧 Step 0 Audit 진행 | #{ISSUE_NUMBER} | 2026-06-06 |
```

Also replace the explanatory notes below the active table with:

```markdown
> 기존 `ws-redis` Step 3~7 이슈는 하네스 정비 전 계획이라 폐기했다. 현재는 `realtime-infra-reset`에서 STOMP 운영 경로와 raw WS V2 실험 경로를 감사한 뒤 새 전환 계획을 세운다.
```

- [ ] **Step 2: Move stale active tracks to note if needed**

If the old active table listed `library-confession-mvp`, `harden-village-ops`, or `village-3d-audio-improvements`, do not keep them as active unless GitHub has matching open PRs or issues. Add this note under Recently Closed if context preservation is needed:

```markdown
> 2026-06-06 점검: 이전 Active 표에 남아 있던 `library-confession-mvp`, `harden-village-ops`, `village-3d-audio-improvements`는 현재 열린 PR 목록에 없고 이번 작업 범위와 충돌하지 않으므로 활성 트랙에서 제거했다. 필요 시 각 트랙 파일을 별도 재개한다.
```

- [ ] **Step 3: Verify index mentions new track**

Run:

```powershell
rg -n "realtime-infra-reset|library-confession-mvp|harden-village-ops|village-3d-audio-improvements" docs/handover/INDEX.md
```

Expected:

```text
realtime-infra-reset appears in Active.
Old stale tracks do not appear in Active rows.
```

---

### Task 4: Audit Document

**Files:**
- Create: `docs/reviews/realtime-infra-reset-audit.md`

- [ ] **Step 1: Create audit document**

Create `docs/reviews/realtime-infra-reset-audit.md` with this content:

```markdown
# Realtime Infra Reset Audit

> 작성일: 2026-06-06
> 목적: 실시간 인프라 전환 전 현재 STOMP/raw WS/Redis/프론트/CD/명세 상태를 사실 기준으로 고정한다.

---

## 1. 결론

현재 운영 경로는 STOMP `/ws`다. 백엔드에는 `/ws/v2` raw WebSocket + Redis Pub/Sub 실험 경로가 있지만, 프론트/CD/운영 명세는 아직 STOMP 기준이다. Redis/V2 테스트 일부는 통과하므로 전부 폐기하지 않는다. 다만 운영 전환 전에는 정책 parity와 프론트 책임 분리가 필요하다.

---

## 2. STOMP 운영 경로

| 항목 | 현재 값 | 파일 |
|------|---------|------|
| Endpoint | `/ws` | `backend/src/main/java/com/maeum/gohyang/global/config/WebSocketConfig.java` |
| Protocol | STOMP over WebSocket + SockJS | `frontend/src/lib/websocket/stompClient.ts` |
| Auth | CONNECT `Authorization: Bearer <token>` | `backend/src/main/java/com/maeum/gohyang/global/config/StompAuthChannelInterceptor.java` |
| Chat send | `/app/chat/village` | `frontend/src/lib/websocket/stompClient.ts` |
| Chat receive | `/topic/chat/village` | `frontend/src/lib/websocket/stompClient.ts` |
| Position send | `/app/village/position` | `frontend/src/lib/websocket/stompClient.ts` |
| Position receive | `/topic/village/positions` | `frontend/src/lib/websocket/stompClient.ts` |
| Typing send | `/app/village/typing` | `frontend/src/lib/websocket/stompClient.ts` |
| Typing receive | `/topic/village/typing` | `frontend/src/lib/websocket/stompClient.ts` |
| Mail receive | `/user/queue/mail` | `frontend/src/lib/websocket/stompClient.ts` |

---

## 3. Raw WS V2 실험 경로

| 항목 | 현재 값 | 파일 |
|------|---------|------|
| Endpoint | `/ws/v2` | `backend/src/main/java/com/maeum/gohyang/global/config/WebSocketV2Config.java` |
| Handler | `ChatWebSocketHandler` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/ChatWebSocketHandler.java` |
| Auth | query param `access_token` | `backend/src/main/java/com/maeum/gohyang/global/config/JwtHandshakeInterceptor.java` |
| Subscribe | `{"type":"SUBSCRIBE","roomId":1}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/SubscribeFrame.java` |
| Publish | `{"type":"PUBLISH","roomId":1,"body":"..."}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/PublishFrame.java` |
| Position | `{"type":"POSITION","roomId":1,"x":0,"y":0}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/PositionFrame.java` |
| Typing | `{"type":"TYPING","roomId":1,"typing":true}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/v2/protocol/TypingFrame.java` |
| Redis channel | `chat:room:{roomId}` | `backend/src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/RoomChannelNaming.java` |

---

## 4. Redis 상태

| 항목 | 현재 값 | 판단 |
|------|---------|------|
| Dependency | `spring-boot-starter-data-redis` | 유지 후보 |
| Local/Prod image | `redis:7.2-alpine` | Redis 8 license 회피 기준과 정합 |
| Test container | `GenericContainer(redis:7.2-alpine)` | 동작 가능, 전용 module 없음 |
| App property | `spring.data.redis.host/port/password` | Spring Boot 4 기준 OK |
| Health | `HEALTH_REDIS_ENABLED=false` 기본 | 운영에서 의도적으로 꺼둔 상태 |
| Pub/Sub pattern | exact `SUBSCRIBE`, 방당 1채널 | 유지 후보 |

검증:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.out.messaging.redis.RedisChatRelayTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

결과:

```text
BUILD SUCCESSFUL
```

---

## 5. V1/V2 정책 차이

| 정책 | STOMP V1 | raw WS V2 | 조치 |
|------|----------|-----------|------|
| 인증 없음 | CONNECT 거부 | handshake 허용, publish 거부 | 결정 필요 |
| 게스트 채팅 | 서버에서 거부 | 서버에서 거부 | 유지 |
| 게스트 위치 | 가능 | 가능 | parity 테스트 필요 |
| NPC 응답 | STOMP broadcast | V2로 보내지 않음 | cutover 전 필수 설계 |
| 메일 알림 | `/user/queue/mail` | 없음 | 1차 범위 제외 또는 별도 설계 |
| 퇴장 broadcast | STOMP disconnect/leave | subscription cleanup 중심 | parity 필요 |
| Envelope version | 없음 | 없음 | V2 후보 명세에 추가 검토 |

---

## 6. 프론트 책임 분리 대상

`frontend/src/lib/websocket/useStomp.ts`의 현재 책임:

- access token 결정
- 게스트 토큰 발급
- 멤버 만료 처리
- displayId bridge 동기화
- reconnect 제어
- 채팅 히스토리 로드
- 채팅 수신과 송신
- 메일 알림 수신
- 위치 수신과 송신
- 타이핑 수신과 송신

다음 구현 Step의 첫 리팩터 후보:

| 새 단위 | 책임 |
|---------|------|
| `realtimeAuth.ts` | 토큰 결정, 게스트 발급, displayId 추출 |
| `stompRealtimeClient.ts` | 기존 STOMP connect/subscribe/publish 유지 |
| `realtimeBridge.ts` | chat/position/typing/mail event를 React/Three bridge로 전달 |
| `useRealtimeConnection.ts` | hook orchestration |

---

## 7. 배포/CD 상태

| 항목 | 현재 값 | 파일 |
|------|---------|------|
| local frontend WS URL | `http://localhost:8080/ws` | `frontend/.env.local.example` |
| compose frontend WS URL | `${PUBLIC_WS_URL:-http://localhost:8080/ws}` | `deploy/docker-compose.yml` |
| CD frontend WS URL | `${{ vars.NEXT_PUBLIC_WS_URL || 'https://ghworld.co/ws' }}` | `.github/workflows/deploy.yml` |

판단:

- 운영 cutover 전에는 `/ws/v2`를 기본 URL로 바꾸지 않는다.
- raw WS adapter를 만들더라도 env flag 또는 separate variable로 선택해야 한다.

---

## 8. 다음 결정

추천 다음 Step:

1. `docs/specs/websocket.md`를 운영 STOMP 명세로 고정한다.
2. `docs/specs/websocket-raw-v2-draft.md`를 후보 명세로 작성한다.
3. 그 다음 구현은 `Frontend Client Split`으로 시작한다.
```

- [ ] **Step 2: Verify audit references exact files**

Run:

```powershell
rg -n "WebSocketConfig|WebSocketV2Config|RedisChatRelay|useStomp|deploy.yml|docker-compose" docs/reviews/realtime-infra-reset-audit.md
```

Expected:

```text
Each major implementation area appears at least once.
```

---

### Task 5: Spec Separation

**Files:**
- Modify: `docs/specs/websocket.md`
- Create: `docs/specs/websocket-raw-v2-draft.md`

- [ ] **Step 1: Add STOMP operation notice**

At the top of `docs/specs/websocket.md`, under the title, add:

```markdown
> 현재 운영 명세다. 프론트/CD/운영 배포는 아직 STOMP `/ws` 기준이다.
> raw WebSocket `/ws/v2`는 전환 후보이며 [websocket-raw-v2-draft.md](./websocket-raw-v2-draft.md)에 별도로 기록한다.
```

- [ ] **Step 2: Create raw WS draft spec**

Create `docs/specs/websocket-raw-v2-draft.md`:

```markdown
# Raw WebSocket V2 후보 명세 — 마음의 고향

> 이 문서는 운영 명세가 아니다.
> 현재 백엔드 `/ws/v2` 실험 구현을 기준으로 작성한 전환 후보 명세다.
> 운영 경로는 아직 [websocket.md](./websocket.md)의 STOMP `/ws`다.

---

## 연결

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `/ws/v2` |
| 프로토콜 | raw WebSocket JSON envelope |
| 인증 | query param `access_token` |
| 토큰 없음 | 현재 구현은 handshake 허용, publish 거부 |

예시:

```text
ws://localhost:8080/ws/v2?access_token=<token>
```

---

## Inbound Frames

### SUBSCRIBE

```json
{"type":"SUBSCRIBE","roomId":1}
```

### UNSUBSCRIBE

```json
{"type":"UNSUBSCRIBE","roomId":1}
```

### PUBLISH

```json
{"type":"PUBLISH","roomId":1,"body":"안녕하세요"}
```

### POSITION

```json
{"type":"POSITION","roomId":1,"x":120.5,"y":340.0}
```

### TYPING

```json
{"type":"TYPING","roomId":1,"typing":true}
```

### PING

```json
{"type":"PING"}
```

---

## Outbound Frames

### MESSAGE

```json
{
  "type": "MESSAGE",
  "roomId": 1,
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "participantId": 1,
    "senderId": 42,
    "senderType": "USER",
    "body": "안녕하세요",
    "createdAt": "2026-04-08T12:00:00.000Z"
  }
}
```

### POSITION_UPDATE

```json
{"type":"POSITION_UPDATE","roomId":1,"id":"user-42","userType":"MEMBER","x":120.5,"y":340.0}
```

### TYPING_UPDATE

```json
{"type":"TYPING_UPDATE","roomId":1,"id":"user-42","typing":true}
```

### ERROR

```json
{"type":"ERROR","code":"COMM_003","message":"게스트는 채팅을 보낼 수 없습니다."}
```

### PONG

```json
{"type":"PONG"}
```

---

## 현재 미해결

- envelope `version` 필드가 없다.
- NPC 응답은 아직 V2로 broadcast되지 않는다.
- 메일 알림(`/user/queue/mail`) 대응이 없다.
- STOMP V1과 인증 없음 정책이 다르다.
- 명시적 leave와 disconnect 퇴장 broadcast parity가 필요하다.
```

- [ ] **Step 3: Verify specs are separated**

Run:

```powershell
rg -n "운영 명세|후보 명세|/ws/v2|STOMP" docs/specs/websocket.md docs/specs/websocket-raw-v2-draft.md
```

Expected:

```text
websocket.md says it is current operation STOMP spec.
websocket-raw-v2-draft.md says it is not operation spec.
```

---

### Task 6: Verification and Commit

**Files:**
- All files changed in Tasks 2-5

- [ ] **Step 1: Run focused Redis/V2 baseline tests**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.out.messaging.redis.RedisChatRelayTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"
```

Expected:

```text
BUILD SUCCESSFUL
```

- [ ] **Step 2: Check repository status**

Run:

```powershell
git status --short --branch
```

Expected:

```text
Modified/added docs only, plus any pre-existing untracked backend/.gradle-user/ ignored by this task.
```

- [ ] **Step 3: Review doc diffs**

Run:

```powershell
git diff -- docs/handover/track-realtime-infra-reset.md docs/handover/INDEX.md docs/reviews/realtime-infra-reset-audit.md docs/specs/websocket.md docs/specs/websocket-raw-v2-draft.md
```

Expected:

```text
Diff contains only realtime infra reset docs and spec separation.
No production code changes.
```

- [ ] **Step 4: Commit Step 0 docs**

Run:

```powershell
git add docs/handover/track-realtime-infra-reset.md docs/handover/INDEX.md docs/reviews/realtime-infra-reset-audit.md docs/specs/websocket.md docs/specs/websocket-raw-v2-draft.md
git commit -m "Start realtime infra reset audit"
```

Expected:

```text
[branch <sha>] Start realtime infra reset audit
```

---

## Self-Review

- Spec coverage: The plan covers issue reset, new track start, audit document, spec separation, and verification from the approved design.
- Placeholder scan: `TBD` appears only in future roadmap issue/commit cells in the track template, where the future issue/commit does not exist yet.
- Type consistency: No production code types are introduced. File names and commands match the current repository paths.
