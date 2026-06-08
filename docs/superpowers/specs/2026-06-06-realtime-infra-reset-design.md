# Realtime Infra Reset Design

> 작성일: 2026-06-06
> 범위: 기존 `ws-redis` Step 3~7 폐기 후, 현재 코드와 운영 상태를 기준으로 실시간 인프라 전환을 다시 설계한다.
> 상태: 사용자 검토용 설계 초안

---

## 1. 한 줄 결론

기존 `ws-redis` Step 3~7 이슈는 그대로 진행하지 않는다. 먼저 현재 STOMP 운영 경로와 raw WebSocket V2/Redis 구현을 감사하고, 살아있는 구현과 버릴 전제를 분리한 뒤, 작은 전환 단위로 새 트랙을 시작한다.

---

## 2. 왜 다시 잡는가

기존 `ws-redis` Step 3는 하네스 세팅 전 계획이라 다음 문제가 섞여 있다.

- 프론트 raw WebSocket 전환, Gradle 모듈 분리, WS 서버 분리, 운영 배포, 부하 재측정이 한 흐름에 묶여 있다.
- 문서는 raw WS 전환을 말하지만 운영/CD는 여전히 STOMP `/ws`를 배포한다.
- 프론트는 `useStomp` 한 훅이 토큰 발급, 자기 displayId 동기화, 히스토리 로드, 채팅, 메일 알림, 위치, 타이핑을 모두 담당한다.
- 백엔드에는 `/ws/v2` raw WebSocket과 Redis Pub/Sub 구현이 이미 들어와 있으나, 운영 명세는 STOMP 기준이다.
- Redis 설정이 의심되지만, 현재 제한된 통합 테스트 범위에서는 Redis relay와 `/ws/v2`가 동작한다.

따라서 지금 필요한 것은 구현 착수가 아니라, 현재 상태를 기준으로 새 SSoT를 만드는 것이다.

---

## 3. 현재 상태 감사 결과

### 3.1 백엔드 운영 경로

현재 운영 주 경로는 STOMP다.

- 설정: `backend/src/main/java/com/maeum/gohyang/global/config/WebSocketConfig.java`
- 엔드포인트: `/ws`
- 클라이언트 송신: `/app/chat/village`, `/app/village/position`, `/app/village/typing`
- 서버 broadcast: `/topic/chat/village`, `/topic/village/positions`, `/topic/village/typing`
- 인증: `StompAuthChannelInterceptor`

### 3.2 백엔드 V2 실험 경로

raw WebSocket V2 구현도 존재한다.

- 설정: `backend/src/main/java/com/maeum/gohyang/global/config/WebSocketV2Config.java`
- 엔드포인트: `/ws/v2`
- 핸들러: `ChatWebSocketHandler`
- 로컬 세션 레지스트리: `WebSocketSessionRegistry`
- 방 구독 레지스트리: `RoomSubscriptionRegistry`
- Redis relay: `RedisChatRelay`
- Redis 채널: `chat:room:{roomId}`

검증 결과:

- `RedisChatRelayTest` 통과
- `ChatWebSocketV2IntegrationTest` 통과

해석:

- Redis 설정과 V2 코드가 전부 깨진 것은 아니다.
- 다만 테스트는 제한된 단일 JVM + Testcontainers 범위다.
- 운영 배포, 프론트 전환, STOMP/V2 병존 정책, NPC 응답 broadcast, 메일 알림, 위치 퇴장 정책은 아직 새 기준으로 검증되지 않았다.

### 3.3 프론트 상태

프론트는 STOMP 중심이다.

- `frontend/src/lib/websocket/stompClient.ts`
- `frontend/src/lib/websocket/useStomp.ts`
- `@stomp/stompjs`
- `sockjs-client`

`useStomp`가 담당하는 책임:

- 게스트 토큰 발급
- 만료 토큰 처리
- displayId bridge 동기화
- 채팅 히스토리 로드
- 채팅 구독과 송신
- 메일 알림 구독
- 위치 구독과 송신
- 타이핑 구독과 송신
- reconnect 제어

따라서 프론트 전환의 첫 작업은 raw WS 교체가 아니라 실시간 클라이언트 책임 분리다.

### 3.4 배포/CD 상태

운영 배포는 STOMP `/ws` 기준이다.

- `deploy/docker-compose.yml`
  - `PUBLIC_WS_URL` 기본값: `http://localhost:8080/ws`
- `.github/workflows/deploy.yml`
  - `NEXT_PUBLIC_WS_URL` 기본값: `https://ghworld.co/ws`
- `frontend/.env.local.example`
  - `NEXT_PUBLIC_WS_URL=http://localhost:8080/ws`

### 3.5 명세 상태

`docs/specs/websocket.md`는 STOMP 명세다.

문제:

- 문서는 Phase 3 STOMP를 설명한다.
- 지식 베이스와 handover는 raw WS + Redis를 Active 방향으로 설명한다.
- 코드에는 STOMP와 raw WS가 병존한다.

새 트랙의 첫 산출물은 "현재 운영 명세"와 "전환 후보 명세"를 분리하는 것이다.

---

## 4. 폐기할 전제

다음 전제는 폐기한다.

1. 기존 GitHub 이슈 #31~#35를 그대로 이어서 Step 3~7로 진행한다.
2. `@stomp/stompjs` 제거를 바로 첫 구현 목표로 둔다.
3. Gradle 모듈 분리를 raw WS 전환의 필수 선행 작업으로 둔다.
4. WS 서버 분리 컨테이너를 지금 트랙의 당연한 목표로 둔다.
5. Redis Pub/Sub 구현이 이미 충분히 검증됐다고 간주한다.
6. `/ws/v2`가 있으니 프론트만 바꾸면 된다고 간주한다.

---

## 5. 보존 후보

다음은 바로 버리지 않는다.

1. `RedisChatRelay`
   - 방 단위 exact subscribe 구조는 유지 후보.
   - O(MxN) 회피 의도도 맞다.
2. `RoomSubscriptionRegistry`
   - 로컬 세션이 있는 방만 Redis 구독하는 구조는 유지 후보.
3. `/ws/v2` protocol records
   - envelope 기반 분기 자체는 유지 후보.
   - 단, `version` 필드는 현재 없다.
4. `ChatWebSocketV2IntegrationTest`
   - 제한적이지만 회귀 안전망으로 보존 후보.
5. 기존 STOMP 경로
   - 운영 주 경로라 전환 완료 전까지 유지한다.

---

## 6. 새 진행 원칙

### 6.1 먼저 감사한다

새 트랙의 Step 0은 구현이 아니라 감사다.

감사 대상:

- STOMP 운영 경로
- `/ws/v2` raw WS 경로
- Redis 설정과 운영 compose
- 프론트 실시간 클라이언트 책임
- 명세와 handover 불일치
- V2가 V1 정책을 실제로 대체할 수 있는지

### 6.2 운영 경로를 끊지 않는다

STOMP는 전환 완료 전까지 유지한다.

이유:

- 현재 프론트와 운영 배포가 STOMP 기준이다.
- raw WS V2는 테스트상 동작하지만 운영 클라이언트가 없다.
- NPC 응답, 메일 알림, 위치 퇴장처럼 V1과 V2의 정책 차이가 남아 있다.

### 6.3 작은 전환 단위로 나눈다

새 트랙은 다음 순서로 진행한다.

1. Audit
2. Stabilize
3. Frontend client split
4. Raw WS feature parity
5. Controlled cutover
6. STOMP removal or keep decision
7. Load test and ADR update

### 6.4 WS 서버 분리는 뒤로 미룬다

현재 목표는 "raw WS가 우리 서비스에 맞는가"를 검증하는 것이다.

별도 컨테이너/Gradle 모듈/ALB sticky는 raw WS 전환의 성공 조건이 아니다. cutover 후 운영 가치가 분명할 때 별도 트랙으로 다룬다.

---

## 7. 새 트랙 제안

트랙 ID 후보:

- `realtime-infra-reset`

기존 이슈 처리:

- #31~#35는 닫는다.
- 닫을 때 "하네스 도입 전 계획이라 폐기. 새 트랙에서 현재 상태 기준으로 재설계"라고 남긴다.

새 이슈 제안:

- `[Track][realtime-infra-reset] STOMP/raw WS/Redis 현재 상태 감사와 전환 재설계`

---

## 8. 새 로드맵

| Step | 이름 | 목표 | 산출물 |
|------|------|------|--------|
| 0 | Audit | 현재 STOMP/V2/Redis/프론트/CD/명세 상태를 사실 기준으로 고정 | 감사 문서, 폐기/보존 표 |
| 1 | Stabilize Redis/V2 | Redis 설정과 V2 테스트 범위를 운영 전환 가능 수준으로 보강 | Redis 설정 점검, 실패 케이스 테스트 |
| 2 | Frontend Client Split | `useStomp` 책임을 실시간 클라이언트 인터페이스와 bridge로 분리 | STOMP 동작 유지한 리팩터 |
| 3 | Raw WS Parity | raw WS가 채팅/위치/타이핑/게스트 정책을 V1과 맞춘다 | V2 parity 테스트 |
| 4 | Controlled Cutover | env flag 또는 client adapter 교체로 raw WS 경로를 선택 가능하게 한다 | 프론트 raw WS adapter, dev 검증 |
| 5 | STOMP Decision | STOMP 제거 또는 fallback 유지 결정 | ADR 업데이트 |
| 6 | Load Test | 기존 병목과 비교 가능한 부하 재측정 | k6 리포트, learning note |

---

## 9. Step 0 상세

Step 0에서 해야 할 일:

1. 현재 파일 목록을 기반으로 STOMP 경로와 V2 경로를 표로 분리한다.
2. Redis 설정을 로컬, 테스트, compose, 운영 env 관점에서 점검한다.
3. V1과 V2 정책 차이를 표로 만든다.
4. 프론트 `useStomp` 책임을 기능별로 나눈다.
5. `docs/specs/websocket.md`를 "현재 운영 STOMP 명세"로 명확히 표기한다.
6. 새 raw WS 후보 명세 파일을 별도로 만든다.
7. #31~#35 폐기 코멘트 초안을 작성한다.

Step 0 완료 기준:

- 사용자가 현재 운영 경로와 실험 경로를 한눈에 구분할 수 있다.
- 다음 구현 Step이 "무엇을 바꾸는지"와 "무엇을 아직 안 바꾸는지"가 명확하다.
- Redis 설정 의심 항목이 추측이 아니라 체크리스트로 정리된다.

---

## 10. 주요 리스크

### 10.1 V2가 NPC 응답을 아직 대체하지 못할 수 있음

현재 V2 핸들러 주석상 NPC 응답은 의도적으로 V2로 보내지 않는다. STOMP 제거 전에 `BroadcastChatMessagePort` 경로를 다시 설계해야 한다.

### 10.2 메일 알림은 V2 범위 밖일 수 있음

프론트는 `/user/queue/mail`을 STOMP로 구독한다. raw WS cutover가 채팅/위치/타이핑만 다룰지, 메일까지 다룰지 분리해야 한다.

권장:

- 첫 raw WS 전환 범위는 채팅/위치/타이핑만.
- 메일 알림은 STOMP fallback 또는 REST polling으로 별도 결정.

### 10.3 인증 정책이 V1/V2에서 다름

V1 STOMP는 CONNECT에 Authorization을 요구한다. V2는 토큰 없는 handshake를 통과시키고 publish에서 거부한다.

이 차이는 게스트 정책과 충돌할 수 있으므로 Step 0에서 명시 결정해야 한다.

### 10.4 위치 퇴장 처리 차이

V1은 STOMP disconnect listener와 명시적 leave를 사용한다. V2는 현재 close 시 subscription cleanup 중심이며, LEAVE broadcast parity가 필요하다.

### 10.5 Redis Pub/Sub의 한계

Redis Pub/Sub은 메시지 내구성이 없다. 채팅 메시지 영속성은 Cassandra가 담당하므로 가능하지만, 위치/타이핑처럼 ephemeral event만 Redis fan-out에 싣는다는 전제가 명확해야 한다.

---

## 11. 이번 설계에서 하지 않는 것

- 바로 프론트에서 STOMP 제거하지 않는다.
- 바로 `/ws/v2`를 운영 기본 경로로 만들지 않는다.
- 바로 Gradle 멀티모듈을 만들지 않는다.
- 바로 WS 서버 별도 컨테이너를 만들지 않는다.
- 바로 부하 테스트로 성능 결론을 내리지 않는다.

---

## 12. 다음 사용자 결정

이 설계가 맞다면 다음 순서로 진행한다.

1. GitHub 이슈 #31~#35 폐기 코멘트 작성 및 close
2. 새 이슈 `realtime-infra-reset` 생성
3. `docs/handover/INDEX.md`의 stale 활성 트랙 정리
4. Step 0 감사 문서 작성
5. Step 0 결과를 바탕으로 구현 계획 작성

---

## 13. Self-review

- Placeholder 없음.
- 기존 Step 3~7을 그대로 이어가지 않는다는 결론이 명시되어 있음.
- 현재 운영 STOMP와 V2 실험 경로가 분리되어 있음.
- Redis 설정 의심을 "전부 깨짐"으로 단정하지 않고 테스트 결과와 남은 검증 범위로 분리함.
- 구현 작업과 설계/감사 작업의 경계를 명확히 둠.
