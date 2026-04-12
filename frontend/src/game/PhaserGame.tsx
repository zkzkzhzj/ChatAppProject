'use client';

import { useEffect, useRef } from 'react';

import Phaser from 'phaser';

import { gameConfig } from './config';

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game(gameConfig);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="phaser-container" className="rounded-lg overflow-hidden shadow-2xl" />;
}
