'use client';

import type { KeyboardEvent } from 'react';
import { forwardRef, useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { isTokenExpired } from '@/lib/auth';
import { emitMyTypingUpdate } from '@/lib/websocket/positionBridge';
import { sendTypingStatus, sendVillageMessage } from '@/lib/websocket/realtimeClient';
import { useChatStore } from '@/store/useChatStore';

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('storage', callback);
  };
}

function getTokenSnapshot() {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  if (isTokenExpired(token)) return false;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role !== 'GUEST';
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

interface ChatInputProps {
  onLoginRequired: () => void;
  onSent?: () => void;
  onCancel?: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(function ChatInput(
  { onLoginRequired, onSent, onCancel },
  ref,
) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const setInputFocused = useChatStore((s) => s.setInputFocused);
  const hasToken = useSyncExternalStore(subscribeToStorage, getTokenSnapshot, getServerSnapshot);
  const connected = connectionStatus === 'connected';

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    if (!hasToken) {
      onLoginRequired();
      return;
    }
    if (!connected) return;

    sendTypingStatus(false);
    emitMyTypingUpdate(false);
    sendVillageMessage(text);
    setDraft('');
    onSent?.();
  }, [draft, connected, hasToken, onLoginRequired, onSent]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    const native = e.nativeEvent as { isComposing?: boolean };
    if (native.isComposing) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) {
        handleSend();
      } else {
        (e.target as HTMLInputElement).blur();
        onCancel?.();
      }
    }

    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).blur();
      onCancel?.();
    }
  };

  const placeholder =
    connectionStatus === 'error'
      ? hasToken
        ? '연결이 끊겼어요. 잠시 후 다시 시도합니다.'
        : '연결이 끊겼어요. 다시 로그인해 주세요.'
      : connected
        ? hasToken
          ? 'Enter로 전송'
          : '로그인하면 대화할 수 있어요'
        : '마을에 연결 중...';

  const handleGuestClick = () => {
    if (!hasToken) {
      onLoginRequired();
    }
  };

  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <div className="relative">
      <input
        ref={setRefs}
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onClick={handleGuestClick}
        readOnly={!hasToken}
        onFocus={() => {
          if (!hasToken) return;
          setInputFocused(true);
          emitMyTypingUpdate(true);
          sendTypingStatus(true);
        }}
        onBlur={() => {
          setInputFocused(false);
          emitMyTypingUpdate(false);
          sendTypingStatus(false);
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border-[1.5px] border-sand/50 bg-cream/92 px-4 py-2.5 text-sm text-bark outline-none backdrop-blur-sm transition-all focus:border-leaf/40"
        maxLength={1000}
      />
    </div>
  );
});

export default ChatInput;
