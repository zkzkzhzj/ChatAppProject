# Raw WebSocket V2 Smoke/Load Plan — 2026-06-07

> Track: `realtime-infra-reset`
> Related ADR: [ADR-010](../architecture/decisions/010-realtime-stomp-retention-and-raw-ws-cutover.md)
> Script: [loadtest/raw-v2-mixed.js](../../loadtest/raw-v2-mixed.js)

---

## 목적

raw WebSocket `/ws/v2`가 STOMP 제거 후보가 되려면 단위/통합 테스트만으로는 부족하다.
최소한 실제 WebSocket upgrade, 인증 query, Redis fan-out, 클라이언트 관점 지연과 에러율을 같은 시나리오로 재측정해야 한다.

이번 Step 6에서는 실행 가능한 k6 시나리오와 판정 기준을 추가했다.
실제 dev/staging 또는 운영 대상 실행 결과는 아직 기록하지 않는다.

---

## 시나리오

`loadtest/raw-v2-mixed.js`는 VU마다 다음 흐름을 수행한다.

1. `RAW_WS_URL?access_token=<JWT>`로 WebSocket 연결
2. `{ "type": "SUBSCRIBE", "roomId": 1 }`
3. 500ms 기준 jitter로 `POSITION` 전송
4. 5초 기준 jitter로 `TYPING` 전송
5. 15~30초 랜덤 간격으로 `PUBLISH` 전송
6. 세션 종료 시 `UNSUBSCRIBE` 후 close

수신 메시지는 `MESSAGE`, `POSITION_UPDATE`, `TYPING_UPDATE`, `ERROR`, `PONG` 기준으로 집계한다.
`POSITION_UPDATE.userType === "LEAVE"`는 disconnect leave fan-out 관찰용으로 별도 집계한다.

---

## 실행 명령

토큰 발급:

```bash
BASE_URL=https://ghworld.co COUNT=10 node loadtest/prepare-tokens.js
```

스모크:

```bash
BASE_URL=https://ghworld.co RAW_WS_URL=wss://ghworld.co/ws/v2 \
  k6 run --vus 1 --duration 30s loadtest/raw-v2-mixed.js
```

소규모 ramping:

```bash
BASE_URL=https://ghworld.co RAW_WS_URL=wss://ghworld.co/ws/v2 \
  k6 run \
  --stage 30s:10 --stage 1m:50 --stage 1m:100 --stage 30s:0 \
  --summary-export=loadtest/raw-v2-summary.json \
  loadtest/raw-v2-mixed.js
```

---

## 통과 기준

- WebSocket handshake check 100%
- `raw_ws_errors` threshold 통과
- `raw_ws_connect_latency` p95 < 3000ms
- `raw_ws_position_sent`와 `raw_ws_position_received` 증가
- `raw_ws_typing_sent`와 `raw_ws_typing_received` 증가
- 30초 이상 실행 시 `raw_ws_chat_sent`와 `raw_ws_chat_received` 증가
- 수동 브라우저 관찰에서 위치 이동과 채팅이 보임

---

## 현재 판정

실행 가능한 raw V2 k6 하네스는 준비됐다.

다만 STOMP 제거 조건은 아직 충족되지 않았다.

- dev/staging에서 `NEXT_PUBLIC_REALTIME_TRANSPORT=raw` 브라우저 검증이 필요하다.
- nginx 또는 reverse proxy의 `/ws/v2` upgrade 검증이 필요하다.
- 메일 알림 대체가 없다.
- NPC 응답 broadcast 대체가 없다.
- 이 문서의 k6 시나리오를 실제 대상에 실행한 결과가 아직 없다.

따라서 현재 결론은 ADR-010과 동일하다.
STOMP는 운영 기본값으로 유지하고, raw WS는 명시적 환경변수로만 선택한다.
