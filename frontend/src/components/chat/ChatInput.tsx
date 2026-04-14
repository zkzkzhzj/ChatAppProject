'use client';

import type { KeyboardEvent } from 'react';
import { forwardRef, useCallback, useState } from 'react';

import { sendVillageMessage } from '@/lib/websocket/stompClient';
import { useChatStore } from '@/store/useChatStore';

interface ChatInputProps {
  onLoginRequired: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(function ChatInput(
  { onLoginRequired },
  ref,
) {
  const [draft, setDraft] = useState('');
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const setInputFocused = useChatStore((s) => s.setInputFocused);

  const connected = connectionStatus === 'connected';

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      onLoginRequired();
      return;
    }

    if (!connected) return;

    sendVillageMessage(text);
    setDraft('');
  }, [draft, connected, onLoginRequired]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) {
        handleSend();
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setInputFocused(true);
        }}
        onBlur={() => {
          setInputFocused(false);
        }}
        placeholder={
          connected
            ? localStorage.getItem('accessToken')
              ? 'Enter를 눌러 채팅하기'
              : '로그인 후 채팅할 수 있어요'
            : '연결 중...'
        }
        className="flex-1 rounded-lg bg-black/60 px-3 py-2 text-sm text-white placeholder-zinc-400 outline-none backdrop-blur-sm focus:ring-1 focus:ring-blue-500"
        maxLength={1000}
      />
      <button
        onClick={handleSend}
        disabled={!draft.trim() || !connected}
        className="rounded-lg bg-blue-600/80 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        전송
      </button>
    </div>
  );
});

export default ChatInput;
