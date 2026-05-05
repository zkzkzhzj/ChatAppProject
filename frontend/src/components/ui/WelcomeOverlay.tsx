'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'village-welcomed';
const FADE_OUT_AFTER_MS = 2200;
const FADE_DURATION_MS = 800;

export default function WelcomeOverlay() {
  const [phase, setPhase] = useState<'hidden' | 'fading-in' | 'visible' | 'fading-out'>('hidden');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return;

    const fadeIn = window.setTimeout(() => setPhase('visible'), 16);
    const fadeOut = window.setTimeout(() => setPhase('fading-out'), FADE_OUT_AFTER_MS);
    const finish = window.setTimeout(() => {
      setPhase('hidden');
      window.localStorage.setItem(STORAGE_KEY, '1');
    }, FADE_OUT_AFTER_MS + FADE_DURATION_MS);

    setPhase('fading-in');

    return () => {
      window.clearTimeout(fadeIn);
      window.clearTimeout(fadeOut);
      window.clearTimeout(finish);
    };
  }, []);

  if (phase === 'hidden') return null;

  const opacity = phase === 'visible' ? 1 : 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center transition-opacity ease-in-out"
      style={{
        opacity,
        transitionDuration: `${FADE_DURATION_MS}ms`,
        backgroundColor: 'rgba(250, 246, 240, 0.92)',
      }}
    >
      <div className="text-center">
        <p
          className="font-display text-2xl"
          style={{ color: 'var(--color-bark)', letterSpacing: '0.02em' }}
        >
          ghworld에 오신 것을 환영합니다
        </p>
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--color-bark-light)' }}
        >
          말 안 해도 괜찮아요. 천천히 머무세요.
        </p>
      </div>
    </div>
  );
}
