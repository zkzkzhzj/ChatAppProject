'use client';

import { useEffect, useState } from 'react';

import { loadMasterVolume, saveMasterVolume } from '@/three/audio/master-volume-store';
import type { SceneManager } from '@/three/SceneManager';

interface Props {
  sceneManager: SceneManager | null;
}

/**
 * 마스터 음량 컨트롤 (spec village-3d-audio-improvements §4).
 *
 * - 상단 우측 (데스크탑·모바일 공통, safe-area-inset 적용)
 * - 슬라이더 1개 (0~100). 0 = 자동 음소거 (별도 토글 X — D1)
 * - localStorage 영속 (D3)
 * - D11 가드 — 100% = 기존 zone maxVolume(≤ 0.3) 유지
 */
export default function AudioControls({ sceneManager }: Props) {
  // 0~100 정수 — slider value (UI 친화)
  const [volume, setVolume] = useState<number>(() => Math.round(loadMasterVolume() * 100));

  // sceneManager 마운트되면 현재 volume 값 동기화 (Strict Mode 결로 unmount/remount 대비)
  useEffect(() => {
    if (!sceneManager) return;
    sceneManager.setMasterVolume(volume / 100);
  }, [sceneManager, volume]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setVolume(next);
    saveMasterVolume(next / 100);
    sceneManager?.setMasterVolume(next / 100);
  };

  const muted = volume === 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'rgba(20, 20, 20, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 999,
        color: '#f5f5f5',
        fontSize: 12,
        userSelect: 'none',
      }}
      aria-label="환경음 음량 조절"
    >
      <SpeakerIcon muted={muted} />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        onChange={onChange}
        aria-label={`환경음 음량 ${String(volume)}%`}
        style={{
          width: 88,
          accentColor: muted ? '#9ca3af' : '#e5e7eb',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  // 음량 0이면 X 표시(음소거 시각), 아니면 일반 스피커 — D1 통합 UI
  return (
    <svg
      width={16}
      height={16}
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
