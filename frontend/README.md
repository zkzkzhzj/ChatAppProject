# ghworld frontend

Next.js App Router 기반 클라이언트다. Three.js로 마을/도서관 씬을 렌더링하고, STOMP를 운영 기본 실시간 경로로 사용한다. raw WebSocket `/ws/v2`는 전환 후보로 남겨둔다.

## Stack

| 항목 | 버전/역할 |
|------|-----------|
| Next.js | 16.2.6 |
| React | 19.2.6 |
| Three.js | 3D 마을/도서관 렌더링 |
| Howler.js | 환경음 |
| Zustand | 클라이언트 상태 |
| Vitest | 단위 테스트 |

## Local

```bash
npm install
npm run dev
```

기본 개발 주소는 `http://localhost:3000`이다.

## Scripts

```bash
npm run lint
npm run format:check
npm run build
npm run test:run
```

## Structure

```text
src/app/              App Router 진입점
src/components/chat/  채팅 UI
src/components/library/ 도서관/고백 UI
src/lib/websocket/    STOMP/raw WebSocket 클라이언트
src/three/            Three.js 씬, 캐릭터, 오디오, 말풍선
src/types/            API/UI 타입
```
