'use client';

import { useEffect, useRef, useState } from 'react';

import { loadMasterVolume, saveMasterVolume } from '@/three/audio/master-volume-store';
import type { SceneManager } from '@/three/SceneManager';

interface Props {
  sceneManager: SceneManager | null;
}

/**
 * 마스터 음량 컨트롤 (spec village-3d-audio-improvements §4).
 *
 * UI 정합:
 * - 채팅 FAB(💬, ✏️) 결로 같은 동그라미 패턴 (rounded-full · cream · shadow-lg)
 * - 위치: 모바일 = ✏️(bottom 80) 바로 위, 데스크탑 = 💬(bottom 16) 바로 위
 * - 닫힌 상태 = 동그라미 아이콘만, 클릭 시 슬라이더 위쪽으로 펼침
 * - 0 = 자동 음소거 (별도 토글 X — D1)
 * - localStorage 영속 (D3)
 * - D11 가드 — 100% = 기존 zone maxVolume(≤ 0.3) 유지
 */
export default function AudioControls({ sceneManager }: Props) {
  const [volume, setVolume] = useState<number>(() => Math.round(loadMasterVolume() * 100));
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 모바일 분기 (GameLoader 결로 동일 breakpoint 768)
  // sceneManager 마운트되면 현재 volume 값 동기화
  useEffect(() => {
    if (!sceneManager) return;
    sceneManager.setMasterVolume(volume / 100);
  }, [sceneManager, volume]);

  // 외부 클릭 시 닫기
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
  // FAB 위치 — 모바일은 ✏️(80) 위, 데스크탑은 💬(16) 위
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
      {/* 슬라이더 패널 — 동그라미 위쪽으로 펼침 */}
      {open && (
        <div
          className="absolute right-0 bottom-14 flex items-center gap-2 rounded-full bg-cream/95 px-3 py-2 text-bark shadow-lg backdrop-blur-sm"
          role="dialog"
          aria-label="환경음 음량 조절"
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={onChange}
            aria-label={`환경음 음량 ${String(volume)}%`}
            className="cursor-pointer"
            style={{ width: 120, accentColor: muted ? '#9ca3af' : '#7c6f5a' }}
          />
          <span className="min-w-[28px] text-right text-xs tabular-nums text-bark-muted">
            {volume}
          </span>
        </div>
      )}

      {/* FAB 동그라미 */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-label={muted ? '환경음 음량 (음소거)' : `환경음 음량 ${String(volume)}%`}
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
