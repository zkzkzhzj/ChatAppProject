'use client';

import { useEffect, useRef } from 'react';

import { SceneManager } from './SceneManager';

/**
 * Three.js 진입점 — Phaser PhaserGame 결과 동등.
 * Step 1 PoC: 마을 + 도서관 두 Scene + 캐릭터 + 점프 + 페이드 전환.
 * WebSocket·캐릭터 동기화는 Step 결 결로 박음 (옛 트랙 코드 참고).
 */
export default function ThreeGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const manager = new SceneManager(container);
    return () => {
      manager.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  );
}
