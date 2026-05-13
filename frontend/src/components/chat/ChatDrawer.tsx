'use client';

import { useEffect, useState } from 'react';

import { useChatStore } from '@/store/useChatStore';

import ChatMessageList from './ChatMessageList';
import LoginPrompt from './LoginPrompt';

const DRAWER_WIDTH = 360;

/**
 * 우측 사이드 채팅 내역 드로우어 (Step 1.7, spec D14).
 *
 * 화면 우측 가장자리 토글 버튼 → 클릭 시 슬라이드 인.
 * 옛 ChatOverlay 의 ChatMessageList 결 그대로 재사용. ChatInput 은 ChatInputAnchor 결로 분리됨.
 * 입력은 머리 위 인라인 결로, 내역만 여기서 확인.
 *
 * loginRequired 플래그는 옛 ChatOverlay 결과 동일하게 LoginPrompt 자동 표시.
 */
export default function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(600);
  const loginRequired = useChatStore((s) => s.loginRequired);
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);

  useEffect(() => {
    const handler = () => {
      setDrawerHeight(window.innerHeight - 120);
    };
    handler();
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-label="채팅 내역 토글"
        className="fixed right-4 bottom-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-leaf/90 text-cream shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
      >
        <span className="text-xl">💬</span>
      </button>

      <aside
        className="fixed right-0 top-0 z-30 flex h-full flex-col border-l border-sand/50 bg-cream/95 px-3 py-4 shadow-xl backdrop-blur-md transition-transform duration-300 ease-in-out"
        style={{
          width: DRAWER_WIDTH,
          transform: open ? 'translateX(0)' : `translateX(${String(DRAWER_WIDTH)}px)`,
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-bark">대화 내역</h2>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            aria-label="닫기"
            className="text-bark-muted hover:text-bark"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatMessageList height={drawerHeight} onResizeStart={() => undefined} />
        </div>
      </aside>

      {loginRequired && (
        <LoginPrompt
          onClose={() => {
            setLoginRequired(false);
          }}
        />
      )}
    </>
  );
}
