# Track: realtime-infra-reset — ✅ 종료 (2026-06-11)

> 종료 시점 결정: [ADR-010](../architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md) — STOMP 유지 + raw WS 옵트인. 잔여 리스크는 §6 보류 메모 참조 (후속 트랙 의제).
> 학습노트: [87 (STOMP 유지 + raw WS 컷오버 조건)](../learning/87-stomp-retention-raw-ws-cutover-conditions.md)
>
> 작업 영역: `backend/src/main/java/com/maeum/gohyang/global/config/`, `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/`, `backend/src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/`, `frontend/src/lib/websocket/`, `deploy/`, `docs/specs/`
> 시작일: 2026-06-06
> Issue: #127
> 브랜치: `chore/realtime-infra-reset-design` 이후 Step별 브랜치 분기
> Spec: [WebSocket 운영 명세](../specs/websocket.md) / [Raw WebSocket V2 Draft](../specs/websocket-raw-v2-draft.md)

---

## 0. 요약

기존 `ws-redis` Step 3~7을 폐기하고, 현재 STOMP 운영 경로와 `/ws/v2` raw WebSocket + Redis 스파이크 경로를 감사한 뒤 서비스에 맞는 전환 계획을 다시 세운다.

---

## 0.5 Acceptance Criteria

- [x] 기존 GitHub 이슈 #31~#35가 폐기 코멘트와 함께 close 된다. (Step 0)
- [x] STOMP 운영 경로와 raw WS V2 스파이크 경로가 감사 문서에서 분리된다. (Step 0)
- [x] Redis 설정과 V2 구현의 보존 후보/검증 부족 항목이 표로 정리된다. (Step 0·1)
- [x] 프론트 `useStomp` 책임이 기능 단위로 분리되어 다음 리팩터 범위가 명확해진다. (Step 2 — realtimeAuth / stompRealtimeSubscriptions 분리)
- [x] 운영 STOMP 명세와 raw WS 후보 명세가 분리된다. (`docs/specs/websocket.md` / `websocket-raw-v2-draft.md`)
- [x] 다음 구현 Step을 `Frontend Client Split`으로 할지, `Redis/V2 Stabilize`로 할지 결정 가능하다. (둘 다 수행 — Step 1·2, 이후 Step 3~6으로 확장)

---

## 1. 배경 / 왜

기존 `ws-redis` Step 3 계획은 세부 설계 전 작성되어 현재 코드, 운영 배포, 프론트 구조와 맞지 않는다.

현재 운영은 STOMP `/ws` 기준이다. 반면 백엔드에는 `/ws/v2` raw WebSocket과 Redis Pub/Sub 구현이 이미 들어와 있다. 테스트 일부는 통과하지만 운영 전환 가능성은 판정되지 않았고, 프론트는 여전히 STOMP 중심이다.

관련 문서:

- [ADR-010: STOMP 유지와 raw WebSocket 전환 조건](../architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md)
- [Learning 87: STOMP 유지 + raw WS 컷오버 조건](../learning/87-stomp-retention-raw-ws-cutover-conditions.md)
- ws-redis 기존 트랙 결정 이력 (learning/ADR/spec에 보존)
- [WebSocket 운영 명세](../specs/websocket.md)
- [Raw WebSocket V2 Draft](../specs/websocket-raw-v2-draft.md)

---

## 2. 전체 로드맵

| Step | 내용 | 상태 | 이슈 | Commit |
|------|------|------|------|--------|
| 0 | Audit: STOMP/raw WS/Redis/프론트/CD/명세 현재 상태 고정 | 완료 | #127 | 3b30100 |
| 1 | Stabilize Redis/V2: Redis 설정과 V2 실패 케이스 테스트 보강 | 완료 | #127 | ff63113 |
| 2 | Frontend Client Split: STOMP 유지 상태에서 실시간 클라이언트 책임 분리 | 완료 | #127 | 60baca9 |
| 3 | Raw WS Parity: 채팅/위치/타이핑/게스트 정책 parity 확보 | 완료 | #127 | 77bb913 |
| 4 | Controlled Cutover: env/client adapter로 raw WS 선택 가능 | 완료 | #127 | 771afb2 |
| 5 | STOMP Decision: 제거 또는 fallback 유지 결정 | 완료 | #127 | a5231c5 |
| 6 | Load Test + ADR: 병목 재측정과 ADR 업데이트 | 완료 | #127 | 2aa55d2 |

---

## 3. 현재 단계 상세

Step 0은 구현 변경 없이 현재 상태를 감사하고 문서 기준선을 다시 세웠다.

작업:

- 기존 #31~#35 폐기
- 감사 문서 작성
- `docs/handover/INDEX.md` stale 활성 트랙 정리
- STOMP 운영 명세와 raw WS 후보 명세 분리
- 다음 구현 Step 후보를 판단 가능한 상태로 만든다.

Frontend Client Split 완료:

- `useStomp`는 React lifecycle orchestration, 연결 상태, 히스토리 로드, 인증 에러 분기만 담당한다.
- 토큰 결정은 `frontend/src/lib/websocket/realtimeAuth.ts`로 분리했다.
- STOMP 채널 구독과 bridge fan-out은 `frontend/src/lib/websocket/stompRealtimeSubscriptions.ts`로 분리했다.
- 운영 경로는 여전히 STOMP `/ws`이며 raw WS 전환은 하지 않았다.
- 검증: `pnpm.cmd test:run src/lib/websocket/realtimeAuth.test.ts src/lib/websocket/stompRealtimeSubscriptions.test.ts src/lib/websocket/useStomp.test.tsx` 통과, 3 files / 17 tests.
- 제한: `pnpm.cmd build`와 `npx tsc --noEmit`은 현재 `frontend/node_modules/three`, `frontend/node_modules/howler` 미설치 상태로 실패했다. 이번 변경 파일의 테스트는 통과했고, 의존성 설치 후 전체 빌드를 다시 확인해야 한다.

Redis/V2 Stabilize 완료:

- `/ws/v2` handler의 위치/타이핑 실패 정책을 테스트로 고정했다.
- 실제 `/ws/v2` + Redis Pub/Sub 경로에서 게스트 토큰 위치 broadcast, 토큰 없는 위치 silent ignore, 타이핑 broadcast를 검증했다.
- Redis 설정은 Spring Boot 4 `spring.data.redis.*`, Redis 7.2 테스트 컨테이너, exact room channel `SUBSCRIBE` 기준을 유지한다.
- 검증: `.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.out.messaging.redis.RedisChatRelayTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"` 통과.
- 남은 리스크: URL query `access_token`, NPC 응답 V2 미전달, 메일 알림 미지원, raw WS client adapter 미구현.

---

Raw WS Parity 완료:

- `RoomSubscriptionRegistry.roomsOf(sessionId)`로 disconnect 직전 구독 방 snapshot을 읽을 수 있게 했다.
- `/ws/v2` disconnect 시 구독했던 각 room에 `POSITION_UPDATE` `userType: "LEAVE"`를 broadcast한 뒤 구독과 session registry를 정리한다.
- `/ws/v2` `POSITION`은 STOMP V1과 맞춰 좌표 clamp를 제거하고 finite 좌표만 그대로 broadcast한다.
- Raw V2 draft spec의 `POSITION_UPDATE`, `TYPING_UPDATE` 사용자 식별 필드를 구현 기준 `displayId`로 정정했다.
- 검증: `.\gradlew.bat --no-daemon test --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.RoomSubscriptionRegistryTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketHandlerTest" --tests "com.maeum.gohyang.communication.adapter.in.websocket.v2.ChatWebSocketV2IntegrationTest"` 통과.
- 검증: `npm.cmd run lint:md` 통과.
- 잔여 리스크: NPC 응답 V2 broadcast, 메일 알림(`/user/queue/mail`), URL query `access_token` 정책, raw WS frontend adapter는 다음 단계에서 별도 결정한다.

Controlled Cutover 완료:

- `realtimeClient.ts` facade를 추가해 `NEXT_PUBLIC_REALTIME_TRANSPORT=raw`일 때만 raw WebSocket client를 선택한다.
- 기본값은 STOMP로 유지한다. env를 지정하지 않은 운영/로컬 경로는 기존 `/ws` STOMP 경로를 계속 사용한다.
- `rawWebSocketClient.ts`는 `/ws/v2` JSON envelope로 `SUBSCRIBE`, `PUBLISH`, `POSITION`, `TYPING`, `UNSUBSCRIBE`를 처리한다.
- raw inbound `displayId`는 기존 Three bridge 호환을 위해 `id`로 매핑한다.
- `ChatInput`, `PositionSync`, `SceneManager`, `useStomp`는 직접 STOMP send/connect를 호출하지 않고 realtime facade를 거친다.
- 검증: `pnpm.cmd test:run src/lib/websocket/realtimeClient.test.ts src/lib/websocket/rawWebSocketClient.test.ts src/lib/websocket/stompRealtimeSubscriptions.test.ts src/lib/websocket/useStomp.test.tsx src/components/chat/ChatInput.test.tsx` 통과.
- 검증: `pnpm.cmd lint`, `pnpm.cmd build`, `npm.cmd run lint:md` 통과.
- 잔여 리스크: raw WS 선택 시 메일 알림은 아직 STOMP `/user/queue/mail` 대응이 없으므로 별도 결정이 필요하다.

STOMP Decision 완료:

- ADR: [ADR-010: STOMP 유지와 raw WebSocket 전환 조건](../architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md)
- 결정: STOMP를 즉시 제거하지 않는다.
- 현재 기본값은 STOMP `/ws`이고, raw WS는 `NEXT_PUBLIC_REALTIME_TRANSPORT=raw`로만 선택한다.
- STOMP 제거 전 필수 조건은 메일 알림 대체, NPC 응답 broadcast 대체, `/ws/v2` reverse proxy 검증, dev/staging 수동 검증, 최소 smoke/load test다.
- 서버 분리는 지금 하지 않는다. raw WS가 운영 후보로 검증되고 WS 연결 수, 배포 주기, resource 격리, proxy/autoscaling 정책 중 하나가 실제 병목으로 관측될 때 별도 트랙으로 분리한다.
- 검증: `npm.cmd run lint:md` 통과.

Load Test + ADR 완료:

- raw WebSocket V2용 k6 시나리오 `loadtest/raw-v2-mixed.js`를 추가했다.
- 시나리오는 `/ws/v2?access_token=<JWT>` handshake, `SUBSCRIBE`, `POSITION`, `TYPING`, `PUBLISH`, `UNSUBSCRIBE` 흐름을 검증한다.
- 실행 계획과 통과 기준은 [Raw WebSocket V2 Smoke/Load Plan](../reports/raw-ws-v2-smoke-load-plan-2026-06-07.md)에 기록했다.
- 현재 STOMP/raw V2 소스 흐름과 MSA 대응 관점을 [Realtime Source Flow Map](../reports/realtime-source-flow-map-2026-06-08.html)에 정리했다.
- `loadtest/README.md`에 STOMP와 raw V2 실행 명령을 분리했다.
- ADR-010의 load test 상태를 "하네스 준비, 대상 실행 필요"로 갱신했다.
- 현재 로컬에는 `loadtest/tokens.json`이 없어 실제 k6 대상 실행은 하지 않았다.
- 검증: `npm.cmd run lint:md`, `node --check loadtest/raw-v2-mixed.js`, `git diff --check` 통과.

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

## 6. 보류 메모 (→ 후속 트랙 의제 — ADR-010 의 미충족 제거 조건 + 서버 분리·멀티모듈 보류)

- WS 서버 별도 컨테이너 분리는 이번 트랙의 즉시 목표가 아니다. 재검토 트리거는 ADR-010 §서버 분리 판단 참조.
- Gradle 멀티모듈 분리는 raw WS 전환 성공 뒤 별도 판단한다.
- 메일 알림(`/user/queue/mail`)은 raw WS 1차 전환 범위에서 제외할 수 있다 — STOMP 제거 전 별도 결정 필요 (ADR-010 §메일 알림 선택지).
- NPC 응답 broadcast 의 raw WS 대체는 application port 재설계 선호, STOMP 제거 직전 단계로 보류.
- k6 raw V2 시나리오(`loadtest/raw-v2-mixed.js`)는 하네스만 준비됨 — dev/staging 대상 실측 미실행 (`loadtest/tokens.json` 필요).
- `/ws/v2` reverse proxy upgrade 검증 + `NEXT_PUBLIC_REALTIME_TRANSPORT=raw` 수동 운영 검증 미수행.
