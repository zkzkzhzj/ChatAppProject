'use client';

import { useEffect, useRef } from 'react';

import { onChatMessage } from '@/lib/websocket/chatBridge';
import { onPositionUpdate } from '@/lib/websocket/positionBridge';
import { onDisplayIdChange } from '@/lib/websocket/tokenBridge';

import { SceneManager } from './SceneManager';

interface ThreeGameProps {
  /** Step 1.7 — GameLoader 가 ChatInputAnchor 에 SceneManager 결 hoist 결로 받음. */
  onReady?: (manager: SceneManager) => void;
}

/**
 * Three.js 진입점.
 * Step 1.5: STOMP 위치 broadcast 를 SceneManager 에 전달 + 토큰 발급 시 selfId 동기화.
 * Step 1.7: 채팅 메시지 결도 SceneManager 에 전달 (머리 위 말풍선) + onReady 결로 manager 노출.
 *
 * STOMP 연결 자체는 GameLoader 의 `useStomp()` 가 책임. 본 컴포넌트는 bridge 구독만.
 */
export default function ThreeGame({ onReady }: ThreeGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const manager = new SceneManager(container);
    onReady?.(manager);

    const unsubPosition = onPositionUpdate((pos) => {
      manager.applyRemotePosition(pos);
    });
    const unsubDisplayId = onDisplayIdChange((id) => {
      manager.setSelfId(id);
    });
    const unsubChat = onChatMessage((msg) => {
      manager.applyChatMessage(msg);
    });

    return () => {
      unsubPosition();
      unsubDisplayId();
      unsubChat();
      manager.destroy();
    };
  }, [onReady]);

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
