# ADR-010: STOMP 유지와 raw WebSocket 전환 조건

> 작성일: 2026-06-07
> 상태: Accepted
> 관련 트랙: `realtime-infra-reset`
> 관련 PR: #128

---

## 배경

현재 실시간 경로는 두 개가 병존한다.

| 경로 | 상태 | 용도 |
|------|------|------|
| STOMP `/ws` | 운영 기본 경로 | 채팅, 위치, 타이핑, 메일 알림 |
| raw WebSocket `/ws/v2` | 선택 가능한 후보 경로 | 채팅, 위치, 타이핑, Redis fan-out 검증 |

`realtime-infra-reset` Step 0~4에서 다음 작업을 완료했다.

- 오래된 `ws-redis` Step 3~7 계획을 폐기하고 현재 코드 기준으로 다시 감사했다.
- Redis Pub/Sub과 `/ws/v2`의 기본 동작을 테스트로 보강했다.
- 프론트 `useStomp` 책임을 인증, 구독, lifecycle로 분리했다.
- `/ws/v2`의 위치, 타이핑, 게스트, disconnect leave broadcast parity를 보강했다.
- `NEXT_PUBLIC_REALTIME_TRANSPORT=raw`일 때 raw WebSocket을 선택할 수 있는 프론트 facade를 추가했다.

따라서 이제 결정해야 할 것은 "STOMP를 제거할 것인가"가 아니라, 어떤 조건을 만족해야 제거할 수 있는가다.

---

## 결정

STOMP를 즉시 제거하지 않는다.

현재는 STOMP를 fallback이자 운영 기본 경로로 유지하고, raw WebSocket은 명시적 환경변수로만 선택한다.

```text
NEXT_PUBLIC_REALTIME_TRANSPORT=raw
```

이 값이 없거나 `raw`가 아니면 프론트는 계속 STOMP를 사용한다.

---

## 이유

### 1. 메일 알림은 아직 STOMP 전용이다

현재 프론트는 메일 알림을 STOMP user destination으로 받는다.

```text
/user/queue/mail
```

raw WebSocket V2에는 아직 이에 대응하는 envelope가 없다. STOMP를 제거하면 메일 알림이 누락된다.

### 2. NPC 응답 broadcast는 아직 raw WS에 연결하지 않았다

현재 V2 핸들러는 유저 메시지 publish와 Redis fan-out은 처리하지만, NPC 응답 broadcast는 의도적으로 V2에 붙이지 않았다.

STOMP 제거 전에는 `BroadcastChatMessagePort` 또는 동등한 application-level broadcast 경로를 다시 설계해야 한다.

### 3. 운영 CD 기본값은 아직 STOMP다

현재 배포 설정과 운영 명세는 STOMP `/ws` 기준이다. raw WS는 선택 가능한 코드 경로가 생겼을 뿐 운영 기본값이 아니다.

### 4. raw WS는 수동 운영 검증이 아직 부족하다

로컬/CI 테스트는 통과했지만, 다음 검증이 아직 없다.

- dev 또는 staging에서 `NEXT_PUBLIC_REALTIME_TRANSPORT=raw`로 실제 브라우저 연결 검증
- 실제 nginx 또는 reverse proxy 경로에서 `/ws/v2` upgrade 검증
- 메일 알림을 제외한 채팅, 위치, 타이핑의 사용자 흐름 검증
- reconnect, close, pagehide 동작 검증

---

## STOMP 제거 조건

STOMP 제거는 아래 조건이 모두 만족될 때만 다시 검토한다.

| 조건 | 현재 상태 |
|------|-----------|
| raw WS 채팅 publish/receive 검증 | 테스트 통과, 수동 운영 검증 필요 |
| raw WS 위치/타이핑 검증 | 테스트 통과, 수동 운영 검증 필요 |
| raw WS disconnect leave 검증 | 테스트 통과 |
| 메일 알림 대체 결정 | 미결정 |
| NPC 응답 broadcast 대체 | 미구현 |
| 운영 env/CD raw WS 설정 | 미정 |
| `/ws/v2` reverse proxy upgrade 검증 | 미검증 |
| load test 또는 최소 동시 접속 smoke | 하네스 준비, 대상 실행 필요 |
| rollback 경로 | STOMP fallback 유지 중 |

---

## 메일 알림 선택지

메일 알림은 별도 결정이 필요하다.

| 선택지 | 장점 | 단점 |
|--------|------|------|
| STOMP fallback 유지 | 구현 비용 낮음, 현재 기능 보존 | transport 2개 장기 병존 |
| REST polling | 구현 단순, raw WS envelope 확장 불필요 | 실시간성 저하, polling 비용 |
| raw WS `MAIL_NOTIFICATION` 추가 | transport 단일화 가능 | 사용자별 routing과 인증 정책 설계 필요 |

현재 결정은 보류다. STOMP 제거 전 별도 ADR 또는 후속 Step에서 결정한다.

---

## NPC 응답 broadcast 선택지

| 선택지 | 장점 | 단점 |
|--------|------|------|
| STOMP fallback 유지 | 현재 NPC 흐름 유지 | STOMP 제거 불가 |
| V2 handler 내부 broadcast 추가 | 빠른 연결 | application port 경계가 흐려질 수 있음 |
| application port 재설계 | 헥사고날 경계가 명확함 | STOMP 제거 시점까지 설계 비용 필요 |

현재 결정은 application port 재설계를 선호하되, 구현은 STOMP 제거 직전 단계로 미룬다.

---

## 서버 분리 판단

현재는 WebSocket 서버를 별도 컨테이너나 Gradle 모듈로 분리하지 않는다.

### 분리 가능한 기반

- `/ws`와 `/ws/v2` endpoint가 분리되어 있다.
- `/ws/v2`는 Redis Pub/Sub 기반 fan-out을 사용한다.
- 프론트는 transport facade를 통해 STOMP/raw WS 선택이 가능하다.
- raw WS 경로에 단위/통합 테스트가 있다.

### 아직 부족한 조건

- 별도 Gradle module 또는 별도 runnable jar가 없다.
- 별도 container, health check, deploy workflow가 없다.
- reverse proxy routing, sticky 여부, timeout 설정이 검증되지 않았다.
- 인증, CORS, Redis env를 분리 서버 기준으로 정리하지 않았다.
- load test로 병목이 WS 계층에 있다는 증거가 없다.

### 서버 분리 재검토 트리거

다음 중 하나 이상이 실제로 관측되면 별도 트랙으로 분리한다.

- 단일 애플리케이션 인스턴스에서 WS 연결 수가 병목이 된다.
- HTTP API와 WS lifecycle 배포 주기가 충돌한다.
- raw WS 전환 후 Redis fan-out은 안정적이나 JVM resource 격리가 필요해진다.
- reverse proxy 또는 autoscaling 정책을 WS와 HTTP에 다르게 적용해야 한다.

---

## Consequences

### 긍정적 결과

- 운영 기본 경로를 깨지 않고 raw WS 검증을 계속할 수 있다.
- STOMP 제거 전 누락 기능을 명확히 볼 수 있다.
- 서버 분리를 성급하게 진행하지 않아 배포 복잡도를 억제한다.

### 비용

- STOMP와 raw WS 코드가 당분간 병존한다.
- `useStomp`라는 이름은 facade 도입 후 실제 역할과 완전히 일치하지 않는다.
- 메일 알림과 NPC 응답 결정을 미루므로 STOMP 제거는 다음 단계로 넘어간다.

---

## 다음 단계

1. `loadtest/raw-v2-mixed.js`로 dev 또는 staging `/ws/v2` smoke/load test를 실행한다.
2. dev 또는 staging에서 `NEXT_PUBLIC_REALTIME_TRANSPORT=raw` 수동 검증을 수행한다.
3. 메일 알림 처리 방식을 결정한다.
4. NPC 응답 broadcast를 raw WS로 옮길 application port 설계를 작성한다.
5. 위 조건을 만족하면 STOMP 제거 ADR을 새로 작성한다.

---

## 2026-06-07 Step 6 업데이트

raw WebSocket V2용 k6 시나리오와 실행 계획을 추가했다.

- Script: [loadtest/raw-v2-mixed.js](../../../loadtest/raw-v2-mixed.js)
- Plan: [Raw WebSocket V2 Smoke/Load Plan](../../reports/raw-ws-v2-smoke-load-plan-2026-06-07.md)

이는 실행 가능한 하네스 준비를 의미한다.
아직 dev/staging 또는 운영 대상 실행 결과가 없으므로 STOMP 제거 조건은 충족되지 않았다.
