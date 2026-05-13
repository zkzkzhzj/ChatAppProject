'use client';

import { useEffect, useRef } from 'react';

import { onPositionUpdate } from '@/lib/websocket/positionBridge';
import { onDisplayIdChange } from '@/lib/websocket/tokenBridge';

import { SceneManager } from './SceneManager';

/**
 * Three.js 진입점.
 * Step 1.5: STOMP 위치 broadcast 를 SceneManager 에 전달 + 토큰 발급 시 selfId 동기화.
 *
 * STOMP 연결 자체는 GameLoader 의 `useStomp()` 가 책임. 본 컴포넌트는 bridge 구독만.
 */
export default function ThreeGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const manager = new SceneManager(container);

    const unsubPosition = onPositionUpdate((pos) => {
      manager.applyRemotePosition(pos);
    });
    const unsubDisplayId = onDisplayIdChange((id) => {
      manager.setSelfId(id);
    });

    return () => {
      unsubPosition();
      unsubDisplayId();
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
