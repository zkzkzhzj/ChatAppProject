'use client';

import dynamic from 'next/dynamic';

import WelcomeOverlay from '@/components/ui/WelcomeOverlay';

const ThreeGame = dynamic(() => import('@/three/ThreeGame'), { ssr: false });

export default function GameLoader() {
  return (
    <>
      <ThreeGame />
      <WelcomeOverlay />
    </>
  );
}
