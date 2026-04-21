---
title: Phaser.js + Next.js 통합
tags: [frontend, phaser, nextjs, react]
related: [frontend/websocket-client.md, frontend/asset-guide.md]
last-verified: 2026-04-13
---

# Phaser.js + Next.js 통합

## 현재 구조

```text
frontend/src/
├── app/
│   ├── page.tsx          ← Next.js 엔트리 — fullscreen 레이아웃 + ChatOverlay
│   ├── GameLoader.tsx    ← Phaser 동적 로드 (SSR 회피)
│   └── layout.tsx        ← 전역 레이아웃
├── game/
│   ├── config.ts         ← Phaser GameConfig (RESIZE 풀스크린, noAudio)
│   ├── PhaserGame.tsx    ← Phaser.Game 인스턴스 관리 (absolute inset-0)
│   └── scenes/
│       └── VillageScene.ts  ← 마을 씬 (document.activeElement 포커스 감지, addCapture/removeCapture)
├── components/chat/
│   ├── ChatOverlay.tsx   ← 좌측 하단 오버레이 컨테이너
│   ├── ChatInput.tsx     ← 채팅 입력 (forwardRef)
│   ├── ChatBubble.tsx    ← 메시지 말풍선
│   ├── ChatMessageList.tsx ← 스크롤 메시지 목록
│   └── LoginPrompt.tsx   ← 로그인/회원가입 팝업
├── store/
│   └── useChatStore.ts   ← Zustand — Phaser↔React 브릿지
├── lib/
│   ├── api/chatApi.ts    ← REST 채팅 API 래퍼
│   └── websocket/
│       ├── stompClient.ts    ← STOMP 클라이언트 (JWT 인증 + 위치 공유)
│       ├── useStomp.ts       ← STOMP lifecycle hook (채팅 + 위치 구독)
│       └── positionBridge.ts ← STOMP↔Phaser 위치 데이터 콜백 브릿지
└── types/
    └── chat.ts           ← ChatMessage, ChatRoom 타입
```

## 핵심 설정

```typescript
// game/config.ts — 풀스크린 RESIZE 모드
{
  type: Phaser.AUTO,
  scene: [VillageScene],
  parent: 'phaser-container',
  backgroundColor: '#87c05a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  audio: { noAudio: true },  // AudioContext suspend 에러 방지
}
```

## 레이아웃 구조

```text
┌─────────────────────────────────┐
│         Phaser Game             │ ← absolute inset-0, 100vw x 100vh
│         (Scale.RESIZE)          │
│                                 │
│  ┌────────────────┐             │
│  │  ChatOverlay   │             │ ← absolute bottom-0 left-0, z-10
│  │  (좌측 하단)    │             │   pointer-events-none (children만 auto)
│  └────────────────┘             │
└─────────────────────────────────┘
```

## Phaser ↔ React 통신

- **키보드 제어**: VillageScene의 `movePlayer()`에서 매 프레임 `document.activeElement`를 체크한다. `HTMLInputElement` 또는 `HTMLTextAreaElement`에 포커스가 있으면 `releaseKeys()`로 WASD 캡처를 해제하고, 그렇지 않으면 `captureKeys()`로 다시 캡처한다.
- **캔버스 클릭 시 blur**: Phaser `pointerdown` 이벤트에서 `document.activeElement.blur()`를 호출하여, 채팅 입력 필드에서 캔버스를 클릭하면 자동으로 포커스를 빼앗고 WASD 이동이 복원된다.
- **NPC 클릭**: 현재 `onNpcClick()`은 콘솔 로그만 출력. NPC 1:1 대화(Conversation) 구현 시 활성화 예정.

## Next.js + Phaser 통합 주의점

1. **SSR 회피**: Phaser는 브라우저 전용. `GameLoader`에서 동적 import
2. **React 상태 연동**: Zustand로 채팅 상태 관리 (useChatStore)
3. **HMR 충돌**: Phaser Game 인스턴스 중복 생성 방지 필요
4. **키보드 충돌**: `document.activeElement` 기반 포커스 감지 + `addCapture()/removeCapture()` 방식으로 WASD 키 캡처를 동적 토글
5. **AudioContext**: `audio: { noAudio: true }`로 탭 비활성 시 에러 방지

## 기술 스택

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| Next.js | 16.2.2 | React 프레임워크 |
| React | 19.2.4 | UI |
| Phaser | 3.90.0 | 2D 게임 엔진 |
| Zustand | 5.x | 상태 관리 |
| Tailwind CSS | 4.x | 스타일링 |

## 향후 구현 항목

- [ ] Tiled 맵 로드 + 타일 렌더링
- [ ] 캐릭터 스프라이트 + 이동 애니메이션
- [x] 마을 공개 채팅 UI (ChatOverlay + useStomp + /topic/chat/village)
- [ ] 공간 꾸미기 드래그&드롭
- [ ] 미사용 `game/config/gameConfig.ts` 삭제
