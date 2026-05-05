'use client';

import dynamic from 'next/dynamic';

import WelcomeOverlay from '@/components/ui/WelcomeOverlay';

const PhaserGame = dynamic(() => import('@/game/PhaserGame'), { ssr: false });

export default function GameLoader() {
  return (
    <>
      <PhaserGame />
      <WelcomeOverlay />
    </>
  );
}
