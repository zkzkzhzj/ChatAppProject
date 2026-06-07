# Controlled Cutover Implementation Plan

> 작성일: 2026-06-07
> 범위: realtime-infra-reset Step 4

## Goal

STOMP 운영 경로를 기본값으로 유지하면서, 프론트 실시간 클라이언트가 환경변수로 STOMP/raw WebSocket transport를 선택할 수 있게 한다.

## Non-goals

- 운영 기본값을 raw WS로 바꾸지 않는다.
- STOMP 의존성을 제거하지 않는다.
- NPC 응답 V2 broadcast와 메일 알림 raw WS 대응은 이번 단계에서 구현하지 않는다.

## Design

- `frontend/src/lib/websocket/realtimeTypes.ts`
  - STOMP/raw가 공유하는 `PositionBroadcast`, `TypingBroadcast` 타입을 둔다.
- `frontend/src/lib/websocket/rawWebSocketClient.ts`
  - `/ws/v2` JSON envelope로 connect, subscribe, publish, position, typing을 처리한다.
  - outbound `displayId`는 기존 bridge 호환을 위해 `id`로 매핑한다.
- `frontend/src/lib/websocket/realtimeClient.ts`
  - `NEXT_PUBLIC_REALTIME_TRANSPORT`가 `raw`일 때 raw client를 사용하고, 기본값은 STOMP다.
  - 기존 `sendVillageMessage`, `sendTypingStatus`, `sendPosition`, `sendLeaveVillage` 호출부를 이 facade로 이동한다.
- `useStomp.ts`
  - 이름은 유지하되 내부 connect/subscribe/disconnect는 `realtimeClient` facade를 사용한다.

## Verification

- transport selector 단위 테스트
- raw WS frame mapping 단위 테스트
- 기존 websocket hook/subscription 테스트
- `pnpm.cmd test:run` focused tests
- `pnpm.cmd build`
- `npm.cmd run lint:md`
