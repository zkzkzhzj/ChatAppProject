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
interface ChatDrawerProps {
  onOpenChange?: (open: boolean) => void;
}

export default function ChatDrawer({ onOpenChange }: ChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(600);
  const loginRequired = useChatStore((s) => s.loginRequired);
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

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
        aria-label={open ? '채팅 내역 닫기' : '채팅 내역 열기'}
        className="fixed right-4 bottom-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-cream/70 bg-ink/90 text-cream shadow-lg backdrop-blur-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-mist"
      >
        <span className="text-sm font-semibold">{open ? '닫기' : '대화'}</span>
      </button>

      {open && (
        <button
          type="button"
          aria-label="채팅 내역 닫기"
          onClick={() => {
            setOpen(false);
          }}
          className="fixed inset-0 z-20 cursor-default bg-ink/18 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        className="fixed right-0 top-0 z-30 flex h-full max-w-[100vw] flex-col border-l border-sand/60 bg-panel/96 px-3 py-4 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out"
        style={{
          width: `min(100vw, ${String(DRAWER_WIDTH)}px)`,
          transform: open ? 'translateX(0)' : `translateX(${String(DRAWER_WIDTH)}px)`,
        }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-sand/60 pb-3">
          <div>
            <h2 className="font-display text-lg text-ink">마을 대화</h2>
            <p className="text-xs text-ink-soft">이웃과 남긴 말들이 모입니다</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand/70 text-sm font-semibold text-ink-soft hover:bg-panel-strong hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
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
