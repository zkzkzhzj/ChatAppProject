'use client';

import dynamic from 'next/dynamic';

import WelcomeOverlay from '@/components/ui/WelcomeOverlay';
import { useStomp } from '@/lib/websocket/useStomp';

const ThreeGame = dynamic(() => import('@/three/ThreeGame'), { ssr: false });

export default function GameLoader() {
  // STOMP 연결 단일 진입점 — 마을 진입과 동시에 연결, 위치·채팅 둘 다 의존.
  // Step 1 마이그 시 ChatOverlay 내부에서만 호출되던 결을 위로 끌어올림 (Step 1.5).
  useStomp();
  return (
    <>
      <ThreeGame />
      <WelcomeOverlay />
    </>
  );
}
