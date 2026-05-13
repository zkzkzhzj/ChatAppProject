'use client';

import { useEffect, useRef, useState } from 'react';

import type { SceneManager } from './SceneManager';

interface VirtualJoystickProps {
  /** SceneManager 결로 setJoystickInput(dx, dz) 호출. null = 비활성. */
  sceneManager: SceneManager | null;
}

const BASE_SIZE = 120; // 외곽 원 px
const STICK_SIZE = 56; // 안쪽 스틱 px
const MAX_RADIUS = (BASE_SIZE - STICK_SIZE) / 2; // 스틱이 외곽 밖으로 안 나가게
const DEAD_ZONE = 0.15; // 정규화 거리 미만 결 입력 무시 (의도치 않은 미세 이동 차단)

/**
 * 가상 조이스틱 (Step 1.7 모바일 hybrid, 토글 ON 결만 표시).
 *
 * 좌측 하단 floating. pointerdown 결 시작 → pointermove 결 stick 위치 갱신 →
 * pointerup/leave 결 stick 복귀 + 입력 0 결로 release.
 * 데드존(0.15) 안 = 입력 0 결로 InputState 결 전달 — 미세 흔들림 결 캐릭터 떠는 결 차단.
 *
 * 옛 learning 50 결 거부 결정 (가상 조이스틱)은 "상시 표시" 결 가정 결로 박힘.
 * 본 결 토글 옵션(localStorage) — 사용자 명시 결로 ON 결만 표시, D11 안식처 톤 정합.
 */
export default function VirtualJoystick({ sceneManager }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const base = baseRef.current;
    if (!base || !sceneManager) return undefined;

    let active = false;

    const handlePointerDown = (e: PointerEvent) => {
      active = true;
      setDragging(true);
      base.setPointerCapture(e.pointerId);
      updateStick(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!active) return;
      updateStick(e.clientX, e.clientY);
    };

    const handlePointerEnd = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      setDragging(false);
      base.releasePointerCapture(e.pointerId);
      setStickPos({ x: 0, y: 0 });
      sceneManager.setJoystickInput(0, 0);
    };

    const updateStick = (clientX: number, clientY: number) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }
      setStickPos({ x: dx, y: dy });

      // 정규화 (-1 ~ 1) + 데드존
      const nx = dx / MAX_RADIUS;
      const ny = dy / MAX_RADIUS;
      const normDist = Math.hypot(nx, ny);
      if (normDist < DEAD_ZONE) {
        sceneManager.setJoystickInput(0, 0);
      } else {
        // y(screen) → z(world) 방향 동일 (위로 밀면 dz=-1, 위쪽 화면 결과 정합)
        sceneManager.setJoystickInput(nx, ny);
      }
    };

    base.addEventListener('pointerdown', handlePointerDown);
    base.addEventListener('pointermove', handlePointerMove);
    base.addEventListener('pointerup', handlePointerEnd);
    base.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      base.removeEventListener('pointerdown', handlePointerDown);
      base.removeEventListener('pointermove', handlePointerMove);
      base.removeEventListener('pointerup', handlePointerEnd);
      base.removeEventListener('pointercancel', handlePointerEnd);
      sceneManager.setJoystickInput(0, 0);
    };
  }, [sceneManager]);

  return (
    <div
      ref={baseRef}
      aria-label="가상 조이스틱"
      style={{
        position: 'fixed',
        left: 24,
        bottom: 24,
        width: BASE_SIZE,
        height: BASE_SIZE,
        borderRadius: '50%',
        background: 'rgba(252, 248, 240, 0.55)',
        border: '2px solid rgba(58, 38, 21, 0.18)',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
        zIndex: 25,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: STICK_SIZE,
          height: STICK_SIZE,
          marginLeft: -STICK_SIZE / 2,
          marginTop: -STICK_SIZE / 2,
          borderRadius: '50%',
          background: 'rgba(74, 124, 69, 0.85)',
          transform: `translate(${String(stickPos.x)}px, ${String(stickPos.y)}px)`,
          transition: dragging ? 'none' : 'transform 0.15s ease-out',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
