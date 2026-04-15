'use client';

import type { KeyboardEvent } from 'react';
import { forwardRef, useCallback, useState, useSyncExternalStore } from 'react';

import { sendVillageMessage } from '@/lib/websocket/stompClient';
import { useChatStore } from '@/store/useChatStore';

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('storage', callback);
  };
}

function getTokenSnapshot() {
  return !!localStorage.getItem('accessToken');
}

function getServerSnapshot() {
  return false;
}

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
  const hasToken = useSyncExternalStore(subscribeToStorage, getTokenSnapshot, getServerSnapshot);

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

  const placeholder = connected
    ? hasToken
      ? 'Enter를 눌러 이야기하기...'
      : '로그인 후 대화할 수 있어요'
    : '마을에 연결 중...';

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
        placeholder={placeholder}
        className="flex-1 rounded-2xl border-[1.5px] border-sand/50 bg-cream/92 px-4 py-2.5 text-sm text-bark outline-none backdrop-blur-sm transition-all focus:border-leaf/40"
        maxLength={1000}
      />
      <button
        onClick={handleSend}
        disabled={!draft.trim() || !connected}
        className="rounded-2xl bg-leaf px-4 py-2.5 text-sm font-medium text-cream transition-all hover:bg-leaf-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        전송
      </button>
    </div>
  );
});

export default ChatInput;
