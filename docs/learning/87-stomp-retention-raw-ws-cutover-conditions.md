# 87. STOMP 유지 + raw WebSocket 컷오버 조건 — "제거할 것인가"가 아니라 "언제 제거 가능한가"

> 트랙: `realtime-infra-reset` (Issue #127) · 원 결정: [ADR-010](../architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md)
> 관련: [44 (외부 Broker 선택)](./44-spring-stomp-external-broker-choice.md) · [45 (raw WS + Redis 설계서)](./45-websocket-redis-pubsub-redesign.md) · [59 (WS 서버 분리 vs 모놀리스)](./59-ws-server-separation-vs-monolith.md)

---

## 1. 배경 — 질문이 바뀐 지점

learning 44·45 시절의 질문은 "STOMP Simple Broker 병목을 무엇으로 대체할 것인가"였다.
`realtime-infra-reset` Step 0~4 를 거치며 `/ws/v2` raw WS + Redis Pub/Sub 경로가
테스트로 보강되고 프론트 facade 까지 생기자, 질문이 바뀌었다.

**"STOMP 를 제거할 것인가" → "어떤 조건을 만족해야 제거할 수 있는가".**

기능이 동작한다는 것과 운영 기본 경로를 바꿀 수 있다는 것은 다른 명제다.
이 노트는 그 간극을 조건 목록으로 만든 과정의 기록이다.

---

## 2. 선택지 비교

| 선택지 | 장점 | 단점 | 판정 |
|--------|------|------|------|
| ① STOMP 즉시 제거, raw WS 일원화 | 코드 단일화, 유지보수 표면 축소 | 메일 알림(`/user/queue/mail`)·NPC 응답 broadcast 가 STOMP 전용 → 기능 누락. 운영 검증 0회 상태에서 기본 경로 교체 | ❌ |
| ② STOMP 기본 유지 + raw WS env 옵트인 | 운영 무중단. raw WS 를 운영과 같은 코드로 계속 검증 가능. rollback = env 제거 | transport 2개 병존 비용 (코드·명세·테스트 이중화) | ✅ 채택 |
| ③ 듀얼 transport 영구 유지 | 결정 회피 가능 | 병존 비용이 영구화. "전환 중" 상태가 목적지가 됨 | ❌ — ②는 제거 조건 명시로 ③과 구분 |

②가 ③으로 부패하지 않도록 한 장치가 핵심이다: **제거 조건 9개를 ADR 에 표로 박고,
각 조건의 현재 상태를 기록**했다. 조건 없는 "나중에 제거"는 ③과 같다.

```text
NEXT_PUBLIC_REALTIME_TRANSPORT=raw   # 이 env 가 있을 때만 raw WS. 없으면 STOMP.
```

---

## 3. 제거 조건 — 기능 parity 가 아니라 운영 parity

테스트 통과(기능 parity)와 별개로 운영 parity 조건이 남는다는 게 이 결정의 교훈이다.

| 분류 | 조건 | Step 6 종료 시점 상태 |
|------|------|----------------------|
| 기능 | 채팅/위치/타이핑/disconnect LEAVE | 테스트 통과 |
| 기능 | 메일 알림 대체 | **미결정** (STOMP user destination 전용) |
| 기능 | NPC 응답 broadcast 대체 | **미구현** (application port 재설계 선호) |
| 운영 | `/ws/v2` reverse proxy upgrade 검증 | 미검증 |
| 운영 | dev/staging 수동 브라우저 검증 | 미수행 |
| 운영 | 운영 env/CD 의 raw WS 설정 | 미정 |
| 운영 | smoke/load test | 하네스만 준비 (`loadtest/raw-v2-mixed.js`, 실측 X) |
| 운영 | rollback 경로 | STOMP fallback 유지 중 ✅ |

"테스트 통과"가 8개 조건 중 1개에 불과하다. 단위·통합 테스트는 코드의 약속을
검증하지만, reverse proxy 의 upgrade 헤더 처리나 CD 빌드 arg 의 env 주입은
테스트 밖 세계다.

---

## 4. 파생 결정 두 개

### 4.1 메일 알림 — transport 단일화 vs 구현 비용

| 선택지 | 트레이드오프 |
|--------|-------------|
| STOMP fallback 유지 | 비용 0, 그러나 transport 병존 영구화의 핑계가 됨 |
| REST polling | envelope 확장 불필요, 실시간성 포기 |
| raw WS `MAIL_NOTIFICATION` envelope 추가 | 단일화 가능, 사용자별 routing + 인증 설계 필요 |

보류. STOMP user destination(`/user/queue/...`)은 세션-사용자 매핑을 프레임워크가
해주지만, raw WS 에서는 그 매핑을 직접 설계해야 한다 — 이게 "STOMP 가 공짜로 주던 것"의 실체다.

### 4.2 서버 분리 — 트리거 기반 보류

learning 59 의 결론(토폴로지 ③ — 모놀리스 + Redis)을 유지하되, 재검토 트리거를
관측 가능한 신호로 명시했다: WS 연결 수 병목, HTTP/WS 배포 주기 충돌,
JVM resource 격리 필요, proxy/autoscaling 정책 분화. **"미리 분리"가 아니라
"신호가 오면 분리"** — Critical Rule #9 (YAGNI) 의 인프라 버전.

---

## 5. 시야 확장 — 이 패턴의 일반형

- **Strangler Fig**: 옛 경로를 유지한 채 새 경로를 옆에 세우고, 트래픽을 점진 이전 후 제거. 여기서는 env 플래그가 이전 스위치다.
- **Dark launch / feature flag cutover**: 운영 코드에 새 경로를 배포하되 기본값은 옛 경로. 검증은 운영과 동일한 빌드로 한다 — 별도 브랜치 검증보다 신뢰도가 높다.
- 반례 경계: 플래그가 1년 살아남으면 그것은 전환이 아니라 기술 부채다. 제거 조건 표 + 후속 트랙(`realtime-raw-ws-cutover` 후보)이 만료 장치다.

---

## 6. 회고 질문

1. raw WS 전환의 남은 작업 중 가장 비싼 것은 무엇인가? (힌트: 코드가 아니라 user-destination routing 설계와 운영 검증)
2. STOMP 가 공짜로 주던 것 3가지를 말할 수 있는가? (user destination 매핑, SockJS fallback, 클라이언트 라이브러리의 reconnect — learning 60 참조)
3. 제거 조건 표가 없었다면 이 결정은 ②와 ③ 중 어느 쪽으로 부패했을까?
