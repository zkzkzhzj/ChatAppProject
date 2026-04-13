'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useStomp } from '@/lib/websocket/useStomp';
import { useChatStore } from '@/store/useChatStore';

import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import LoginPrompt from './LoginPrompt';

export default function ChatOverlay() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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

  return (
    <>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-[400px] max-w-[50vw] flex-col p-4">
        <ChatMessageList />
        <div className="pointer-events-auto">
          <ChatInput
            ref={inputRef}
            onLoginRequired={() => {
              setShowLoginPrompt(true);
            }}
          />
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
