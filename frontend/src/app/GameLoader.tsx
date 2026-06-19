'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import ChatDrawer from '@/components/chat/ChatDrawer';
import LibraryOverlay from '@/components/library/LibraryOverlay';
import FloatingActionMenu from '@/components/ui/FloatingActionMenu';
import WelcomeOverlay from '@/components/ui/WelcomeOverlay';
import { useStomp } from '@/lib/websocket/useStomp';
import { useChatStore } from '@/store/useChatStore';
import ChatInputAnchor from '@/three/chat/ChatInputAnchor';
import type { SceneManager } from '@/three/SceneManager';
import VirtualJoystick from '@/three/VirtualJoystick';

const ThreeGame = dynamic(() => import('@/three/ThreeGame'), { ssr: false });

const MOBILE_BREAKPOINT = 768;

export default function GameLoader() {
  // STOMP 연결 단일 진입점 — 마을 진입과 동시에 연결, 위치·채팅 둘 다 의존.
  useStomp();

  const [manager, setManager] = useState<SceneManager | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const loginRequired = useChatStore((s) => s.loginRequired);
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);

  // 모바일 분기 — resize 결로 반응형
  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!loginRequired) return;
    manager?.saveLoginReturnPosition();
  }, [loginRequired, manager]);

  return (
    <>
      <ThreeGame onReady={setManager} />
      <WelcomeOverlay />
      <ChatInputAnchor
        sceneManager={manager}
        onLoginRequired={() => {
          setLoginRequired(true);
        }}
      />
      <ChatDrawer
        open={chatDrawerOpen}
        onOpenRequest={setChatDrawerOpen}
        onOpenChange={setChatDrawerOpen}
        hideTrigger
      />
      <FloatingActionMenu
        sceneManager={manager}
        chatOpen={chatDrawerOpen}
        onChatOpenChange={setChatDrawerOpen}
      />
      <LibraryOverlay />
      {/* 모바일 결 조이스틱 상시 노출 — tap-to-move 결 거부, 조이스틱 only (사용자 결정 2026-05-13). */}
      {isMobile && <VirtualJoystick sceneManager={manager} />}
    </>
  );
}
