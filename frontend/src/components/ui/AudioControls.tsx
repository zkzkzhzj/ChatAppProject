'use client';

import { useEffect, useRef, useState } from 'react';

import { loadMasterVolume, saveMasterVolume } from '@/three/audio/master-volume-store';
import type { SceneManager } from '@/three/SceneManager';

interface Props {
  sceneManager: SceneManager | null;
}

export default function AudioControls({ sceneManager }: Props) {
  const [volume, setVolume] = useState<number>(() => Math.round(loadMasterVolume() * 100));
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sceneManager) return;
    sceneManager.setMasterVolume(volume / 100);
  }, [sceneManager, volume]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, [open]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setVolume(next);
    saveMasterVolume(next / 100);
    sceneManager?.setMasterVolume(next / 100);
  };

  const muted = volume === 0;
  const fabBottom = 144;

  return (
    <div
      ref={panelRef}
      className="fixed z-20"
      style={{
        bottom: `calc(${String(fabBottom)}px + env(safe-area-inset-bottom))`,
        right: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      {open && (
        <div
          className="absolute right-0 bottom-14 flex items-center gap-2 rounded-full bg-cream/95 px-3 py-2 text-bark shadow-lg backdrop-blur-sm"
          role="dialog"
          aria-label="환경음 볼륨 조절"
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={onChange}
            aria-label={`환경음 볼륨 ${String(volume)}%`}
            className="cursor-pointer"
            style={{ width: 120, accentColor: muted ? '#9ca3af' : '#7c6f5a' }}
          />
          <span className="min-w-[28px] text-right text-xs tabular-nums text-bark-muted">
            {volume}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-label={muted ? '환경음 볼륨 (음소거)' : `환경음 볼륨 ${String(volume)}%`}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/95 text-bark shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
      >
        <SpeakerIcon muted={muted} />
      </button>
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <>
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}
