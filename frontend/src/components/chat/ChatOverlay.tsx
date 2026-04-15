'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useStomp } from '@/lib/websocket/useStomp';
import { useChatStore } from '@/store/useChatStore';

import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import LoginPrompt from './LoginPrompt';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 240;
const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 400;

export default function ChatOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [chatHeight, setChatHeight] = useState(DEFAULT_HEIGHT);
  const [chatWidth, setChatWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const isInputFocused = useChatStore((s) => s.isInputFocused);

  useStomp();

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

  const startResizeY = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startY = e.clientY;
      const startHeight = chatHeight;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = startY - ev.clientY;
        setChatHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta)));
      };

      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [chatHeight],
  );

  const startResizeX = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = chatWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = ev.clientX - startX;
        setChatWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
      };

      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [chatWidth],
  );

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
          <div className="h-8 w-0.5 rounded-full bg-zinc-500/60" />
        </div>
      </div>
      {showLoginPrompt && (
        <LoginPrompt
          onClose={() => {
            setShowLoginPrompt(false);
          }}
        />
      )}
    </>
  );
}
