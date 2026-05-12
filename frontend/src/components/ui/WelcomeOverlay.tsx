'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'village-welcomed';
const FADE_OUT_AFTER_MS = 2200;
const FADE_DURATION_MS = 800;

type Phase = 'hidden' | 'fading-in' | 'visible' | 'fading-out';

export default function WelcomeOverlay() {
  // SSR/CSR 양쪽 결 같은 초기값 — hydration mismatch 차단.
  // localStorage 접근 / fade 시작은 useEffect 안 (브라우저 only).
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    // SSR mismatch 차단 결 mount 후 1회 fade-in 진입 — re-render 1회 비용은 의도적.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('fading-in');

    const fadeIn = window.setTimeout(() => {
      setPhase('visible');
    }, 16);
    const fadeOut = window.setTimeout(() => {
      setPhase('fading-out');
    }, FADE_OUT_AFTER_MS);
    const finish = window.setTimeout(() => {
      setPhase('hidden');
      window.localStorage.setItem(STORAGE_KEY, '1');
    }, FADE_OUT_AFTER_MS + FADE_DURATION_MS);

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
        transitionDuration: `${String(FADE_DURATION_MS)}ms`,
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
        <p className="mt-3 text-sm" style={{ color: 'var(--color-bark-light)' }}>
          말 안 해도 괜찮아요. 천천히 머무세요.
        </p>
      </div>
    </div>
  );
}
