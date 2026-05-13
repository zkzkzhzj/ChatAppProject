'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';

import ChatDrawer from '@/components/chat/ChatDrawer';
import WelcomeOverlay from '@/components/ui/WelcomeOverlay';
import { useStomp } from '@/lib/websocket/useStomp';
import { useChatStore } from '@/store/useChatStore';
import ChatInputAnchor from '@/three/chat/ChatInputAnchor';
import type { SceneManager } from '@/three/SceneManager';

const ThreeGame = dynamic(() => import('@/three/ThreeGame'), { ssr: false });

export default function GameLoader() {
  // STOMP 연결 단일 진입점 — 마을 진입과 동시에 연결, 위치·채팅 둘 다 의존.
  // Step 1 마이그 시 ChatOverlay 내부에서만 호출되던 결을 위로 끌어올림 (Step 1.5).
  useStomp();

  // Step 1.7 — SceneManager 결 ChatInputAnchor 결로 hoist. ThreeGame.onReady 결로 받음.
  const [manager, setManager] = useState<SceneManager | null>(null);
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);

  return (
    <>
      <ThreeGame onReady={setManager} />
      <WelcomeOverlay />
      <ChatInputAnchor
        sceneManager={manager}
        onLoginRequired={() => {
          setLoginRequired(true);
        }}
      />
      <ChatDrawer />
    </>
  );
}
