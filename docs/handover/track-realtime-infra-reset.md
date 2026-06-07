# Track: realtime-infra-reset

> 작업 영역: `backend/src/main/java/com/maeum/gohyang/global/config/`, `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/websocket/`, `backend/src/main/java/com/maeum/gohyang/communication/adapter/out/messaging/redis/`, `frontend/src/lib/websocket/`, `deploy/`, `docs/specs/`
> 시작일: 2026-06-06
> Issue: #127
> 브랜치: `chore/realtime-infra-reset-design` 이후 Step별 브랜치 분기
> Spec: [docs/superpowers/specs/2026-06-06-realtime-infra-reset-design.md](../superpowers/specs/2026-06-06-realtime-infra-reset-design.md)

---

## 0. 요약

기존 `ws-redis` Step 3~7을 폐기하고, 현재 STOMP 운영 경로와 `/ws/v2` raw WebSocket + Redis 스파이크 경로를 감사한 뒤 서비스에 맞는 전환 계획을 다시 세운다.

---

## 0.5 Acceptance Criteria

- [ ] 기존 GitHub 이슈 #31~#35가 폐기 코멘트와 함께 close 된다.
- [ ] STOMP 운영 경로와 raw WS V2 스파이크 경로가 감사 문서에서 분리된다.
- [ ] Redis 설정과 V2 구현의 보존 후보/검증 부족 항목이 표로 정리된다.
- [ ] 프론트 `useStomp` 책임이 기능 단위로 분리되어 다음 리팩터 범위가 명확해진다.
- [ ] 운영 STOMP 명세와 raw WS 후보 명세가 분리된다.
- [ ] 다음 구현 Step을 `Frontend Client Split`으로 할지, `Redis/V2 Stabilize`로 할지 결정 가능하다.

---

## 1. 배경 / 왜

기존 `ws-redis` Step 3 계획은 세부 설계 전 작성되어 현재 코드, 운영 배포, 프론트 구조와 맞지 않는다.

현재 운영은 STOMP `/ws` 기준이다. 반면 백엔드에는 `/ws/v2` raw WebSocket과 Redis Pub/Sub 구현이 이미 들어와 있다. 테스트 일부는 통과하지만 운영 전환 가능성은 판정되지 않았고, 프론트는 여전히 STOMP 중심이다.

관련 문서:

- [Realtime Infra Reset Design](../superpowers/specs/2026-06-06-realtime-infra-reset-design.md)
- [ws-redis 기존 트랙](./track-ws-redis.md)
- [WebSocket 운영 명세](../specs/websocket.md)

---

## 2. 전체 로드맵

| Step | 내용 | 상태 | 이슈 | Commit |
|------|------|------|------|--------|
| 0 | Audit: STOMP/raw WS/Redis/프론트/CD/명세 현재 상태 고정 | 완료 | #127 | 3b30100 |
| 1 | Stabilize Redis/V2: Redis 설정과 V2 실패 케이스 테스트 보강 | 완료 | #127 | ff63113 |
| 2 | Frontend Client Split: STOMP 유지 상태에서 실시간 클라이언트 책임 분리 | 완료 | #127 | 60baca9 |
| 3 | Raw WS Parity: 채팅/위치/타이핑/게스트 정책 parity 확보 | 완료 | #127 | 77bb913 |
| 4 | Controlled Cutover: env/client adapter로 raw WS 선택 가능 | 대기 | 미정 | 미정 |
| 5 | STOMP Decision: 제거 또는 fallback 유지 결정 | 대기 | 미정 | 미정 |
| 6 | Load Test + ADR: 병목 재측정과 ADR 업데이트 | 대기 | 미정 | 미정 |

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
- Gradle 멀티모듈 분리는 raw WS 전환 성공 뒤 별도 판단한다.
- 메일 알림(`/user/queue/mail`)은 raw WS 1차 전환 범위에서 제외할 수 있다.
