'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useResize } from '@/hooks/useResize';
import { useChatStore } from '@/store/useChatStore';

import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import LoginPrompt from './LoginPrompt';

const CHAT_HEIGHT = { min: 100, max: 600, initial: 240 };
// 큰 모니터(4K~5K) 에서 width 400 은 화면 비율 7~10% → 사용자 인지 어려움.
// initial 700 + max 1200 으로 늘려 큰 화면에서도 채팅창이 한눈에 보이게 한다.
// 드래그로 사용자가 자기 모니터에 맞게 추가 조정 가능 (useResize).
const CHAT_WIDTH = { min: 360, max: 1200, initial: 700 };

export default function ChatOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const isInputFocused = useChatStore((s) => s.isInputFocused);
  const loginRequired = useChatStore((s) => s.loginRequired);
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);

  const [chatHeight, startResizeY] = useResize('y', CHAT_HEIGHT);
  const [chatWidth, startResizeX] = useResize('x', CHAT_WIDTH);

  // STOMP 연결은 GameLoader 의 useStomp() 가 단일 책임 (Step 1.5 결로 끌어올림)

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    },
    [isInputFocused],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  return (
    <>
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-10 flex flex-col p-4"
        style={{ width: chatWidth }}
      >
        <ChatMessageList height={chatHeight} onResizeStart={startResizeY} />
        <div className="pointer-events-auto">
          <ChatInput
            ref={inputRef}
            onLoginRequired={() => {
              setShowLoginPrompt(true);
            }}
          />
        </div>
        {/* 오른쪽 리사이즈 핸들 */}
        <div
          onMouseDown={startResizeX}
          className="pointer-events-auto absolute right-0 top-0 flex h-full w-2 cursor-ew-resize items-center justify-center"
        >
          <div className="h-8 w-0.5 rounded-full bg-bark-muted/60" />
        </div>
      </div>
      {(showLoginPrompt || loginRequired) && (
        <LoginPrompt
          onClose={() => {
            setShowLoginPrompt(false);
            setLoginRequired(false);
          }}
        />
      )}
    </>
  );
}
