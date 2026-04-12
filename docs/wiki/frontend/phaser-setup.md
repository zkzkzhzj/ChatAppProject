---
title: Phaser.js + Next.js 통합
tags: [frontend, phaser, nextjs, react]
related: [frontend/websocket-client.md, frontend/asset-guide.md]
last-verified: 2026-04-13
---

# Phaser.js + Next.js 통합

## 현재 구조

```
frontend/src/
├── app/
│   ├── page.tsx          ← Next.js 엔트리 — GameLoader 렌더링
│   └── GameLoader.tsx    ← Phaser 동적 로드 (SSR 회피)
└── game/
    ├── config.ts         ← Phaser GameConfig (800x600, FIT)
    ├── PhaserGame.tsx    ← Phaser.Game 인스턴스 관리
    └── scenes/
        └── VillageScene.ts  ← 마을 씬
```

## 핵심 설정

```typescript
// game/config.ts
{
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [VillageScene],
  parent: 'phaser-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}
```

## Next.js + Phaser 통합 주의점

1. **SSR 회피**: Phaser는 브라우저 전용. `GameLoader`에서 동적 import + `ssr: false`
2. **React 상태 연동**: Zustand로 게임 상태 ↔ React UI 연결
3. **HMR 충돌**: Phaser Game 인스턴스 중복 생성 방지 필요

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
- [ ] NPC 클릭 → 채팅 UI 진입
- [ ] 공간 꾸미기 드래그&드롭
