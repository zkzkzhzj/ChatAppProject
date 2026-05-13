'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import * as THREE from 'three';

import ChatInput from '@/components/chat/ChatInput';

import type { SceneManager } from '../SceneManager';

interface ChatInputAnchorProps {
  /** SceneManager 인스턴스 — camera·자기 character 위치 접근용. null 일 때 비활성. */
  sceneManager: SceneManager | null;
  onLoginRequired: () => void;
}

/** 캐릭터 머리 위 anchor 오프셋 (world y). Character.bodyHeight(1.4) + 머리(0.6) + 여유. */
const HEAD_OFFSET_Y = 2.6;
/** 화면 가장자리 결로 입력창 잘리지 않게 margin. */
const SCREEN_MARGIN_X = 180;
const SCREEN_MARGIN_Y = 80;
/** 모바일 분기 — 이하 폭 결 하단 도크 결로. 옛 learning 50 결 동일 기준. */
const MOBILE_BREAKPOINT = 768;

/**
 * 머리 위 인라인 채팅 입력 (Step 1.7, spec D13).
 *
 * Enter 결로 열림 → 캐릭터 머리 위 input 표시 + focus.
 * Escape / 전송 결로 닫힘 → input hidden, 캐릭터 이동 키(WASD) 다시 동작.
 *
 * 비활성 결로 input 자체가 DOM 결 X → 키 이벤트 캐릭터 이동 그대로 통과.
 * 활성 결로 input.onFocus 결 useChatStore.setInputFocused(true) 호출되어 캐릭터 이동 차단
 * (옛 ChatOverlay 결과 동일 결).
 *
 * 매 프레임 Vector3→screen coords 변환 (입력창 1개라 비용 영향 미미).
 */
function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

export default function ChatInputAnchor({ sceneManager, onLoginRequired }: ChatInputAnchorProps) {
  const [active, setActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 모바일 분기 — resize 결로 반응형
  useEffect(() => {
    const update = () => {
      setIsMobile(detectMobile());
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  // Enter / Escape 토글
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 이미 input 결 focus 상태면 통과 (ChatInput 내부 keydown 결 처리)
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Enter' && !active) {
        e.preventDefault();
        setActive(true);
        // mount 직후 focus
        requestAnimationFrame(() => inputRef.current?.focus());
      } else if (e.key === 'Escape' && active) {
        setActive(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [active]);

  // 매 프레임 Vector3→screen coords 변환 (데스크탑 결만 — 모바일은 고정 도크)
  useEffect(() => {
    if (!active || !sceneManager || isMobile) return undefined;

    let rafId = 0;
    const worldPos = new THREE.Vector3();
    const tick = () => {
      const container = containerRef.current;
      const camera = sceneManager.getCamera();
      const charPos = sceneManager.getMyCharacterPosition();
      if (!container || !camera || !charPos) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      worldPos.set(charPos.x, charPos.y + HEAD_OFFSET_Y, charPos.z);
      worldPos.project(camera);

      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      const x = worldPos.x * halfW + halfW;
      const y = -worldPos.y * halfH + halfH;

      // 화면 가장자리 clamp — 입력창 잘리지 않게
      const clampedX = Math.max(SCREEN_MARGIN_X, Math.min(window.innerWidth - SCREEN_MARGIN_X, x));
      const clampedY = Math.max(SCREEN_MARGIN_Y, Math.min(window.innerHeight - 200, y));

      container.style.left = `${String(clampedX)}px`;
      container.style.top = `${String(clampedY)}px`;

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [active, sceneManager, isMobile]);

  const handleSent = useCallback(() => {
    setActive(false);
    // 전송 직후 input release — 캐릭터 이동 키 stuck 방지
    inputRef.current?.blur();
  }, []);

  if (!active) return null;

  // 모바일 = 하단 고정 도크 (가상 키보드 결 가려질 위험 회피, 리서치 권고).
  // 데스크탑 = 캐릭터 머리 위 인라인 (Vector3→screen 매 프레임 갱신).
  const style: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        width: 'min(92vw, 480px)',
        zIndex: 30,
        pointerEvents: 'auto',
      }
    : {
        position: 'fixed',
        transform: 'translate(-50%, -100%)',
        width: 320,
        zIndex: 30,
        pointerEvents: 'auto',
      };

  return (
    <div ref={containerRef} style={style}>
      <ChatInput ref={inputRef} onLoginRequired={onLoginRequired} onSent={handleSent} />
    </div>
  );
}
