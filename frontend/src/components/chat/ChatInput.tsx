'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import apiClient from '@/lib/api/client';
import { emitMyTypingUpdate, emitNpcTypingUpdate } from '@/lib/websocket/positionBridge';
import { sendTypingStatus, sendVillageMessage } from '@/lib/websocket/stompClient';
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

interface Mentionable {
  id: number;
  name: string;
  type: string;
}

interface ChatInputProps {
  onLoginRequired: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(function ChatInput(
  { onLoginRequired },
  ref,
) {
  const [draft, setDraft] = useState('');
  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredItems, setFilteredItems] = useState<Mentionable[]>([]);
  const [atIndex, setAtIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const setInputFocused = useChatStore((s) => s.setInputFocused);
  const setNpcTyping = useChatStore((s) => s.setNpcTyping);
  const hasToken = useSyncExternalStore(subscribeToStorage, getTokenSnapshot, getServerSnapshot);
  const connected = connectionStatus === 'connected';

  // 멘션 대상 로드
  useEffect(() => {
    if (!hasToken) return;
    apiClient
      .get<Mentionable[]>('/api/v1/chat/mentionables')
      .then(({ data }) => {
        console.log('[ChatInput] mentionables loaded:', data);
        setMentionables(data);
      })
      .catch((err: unknown) => {
        console.warn('[ChatInput] mentionables 로드 실패', err);
      });
  }, [hasToken]);

  const insertMention = useCallback(
    (item: Mentionable) => {
      const before = draft.slice(0, atIndex);
      const markup = `@[${item.name}](${item.type}:${String(item.id)}) `;
      const newDraft = before + markup;
      setDraft(newDraft);
      setShowDropdown(false);
      // 입력창에 포커스 유지
      setTimeout(() => {
        const input = inputRef.current;
        if (input) {
          input.focus();
          input.setSelectionRange(newDraft.length, newDraft.length);
        }
      }, 0);
    },
    [draft, atIndex],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setDraft(value);

      // IME 조합 중에는 멘션 매칭을 스킵한다 — 미확정 음절로 매칭하면 부정확.
      // 조합 종료 후 다음 onChange 에서 정상 매칭됨. 이미 열려있던 드롭다운은
      // 조합 동안 stale 후보를 보여주지 않도록 함께 닫는다.
      const native = e.nativeEvent as { isComposing?: boolean };
      if (native.isComposing) {
        setShowDropdown(false);
        setAtIndex(-1);
        return;
      }

      // @ 감지 — 커서 위치 기준으로 가장 가까운 @를 찾음
      const cursorPos = e.target.selectionStart ?? value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAt = textBeforeCursor.lastIndexOf('@');

      if (lastAt >= 0 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
        const query = textBeforeCursor.slice(lastAt + 1);
        // 이미 완성된 멘션 마크업 안이면 스킵
        if (query.includes('[') || query.includes(']') || query.includes('(')) {
          setShowDropdown(false);
          return;
        }
        // 공백 제거하여 유연하게 매칭
        const normalized = query.replace(/\s/g, '');
        const matches = mentionables.filter((m) => m.name.replace(/\s/g, '').includes(normalized));
        setAtIndex(lastAt);
        setFilteredItems(matches);
        setShowDropdown(matches.length > 0);
      } else {
        setShowDropdown(false);
      }
    },
    [mentionables],
  );

  const hasMentionMarkup = (text: string) => /@\[[^\]]+\]\([^)]+\)/.test(text);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    if (!hasToken) {
      onLoginRequired();
      return;
    }
    if (!connected) return;

    const mentioning = hasMentionMarkup(text);

    sendTypingStatus(false);
    emitMyTypingUpdate(false);
    sendVillageMessage(text, () => {
      if (mentioning) {
        setNpcTyping(true);
        emitNpcTypingUpdate(true);
      }
    });
    setDraft('');
    setShowDropdown(false);
  }, [draft, connected, hasToken, onLoginRequired, setNpcTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    // IME 조합 중인 키 입력은 무시한다 (F-3 macOS 한글 IME 마지막 음절 중복 입력 방지).
    // 모던 브라우저는 `e.nativeEvent.isComposing` 으로 충분하다.
    const native = e.nativeEvent as { isComposing?: boolean };
    if (native.isComposing) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // 드롭다운이 열려있으면 첫 번째 항목 선택
      if (showDropdown && filteredItems.length > 0) {
        insertMention(filteredItems[0]);
        return;
      }

      // 일반 전송
      if (draft.trim()) {
        handleSend();
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }

    if (e.key === 'Escape') {
      if (showDropdown) {
        setShowDropdown(false);
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }

    // Tab으로도 멘션 선택
    if (e.key === 'Tab' && showDropdown && filteredItems.length > 0) {
      e.preventDefault();
      insertMention(filteredItems[0]);
    }
  };

  const placeholder = connected
    ? hasToken
      ? '@마을 주민 으로 NPC에게 말걸기'
      : '로그인 후 대화할 수 있어요'
    : '마을에 연결 중...';

  const handleGuestClick = () => {
    if (!hasToken) {
      onLoginRequired();
    }
  };

  // ref 합성 (forwardRef + 내부 ref)
  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <div className="relative flex gap-2">
      {/* 멘션 드롭다운 */}
      {showDropdown && (
        <div className="absolute bottom-full left-0 mb-1 w-52 rounded-xl border border-sand bg-cream p-1 shadow-lg">
          {filteredItems.map((item) => (
            <button
              key={`${item.type}-${String(item.id)}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // blur 방지
                insertMention(item);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-bark transition-colors hover:bg-sand/30"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-leaf" />
              <span className="font-medium">{item.name}</span>
              <span className="ml-auto text-[10px] text-bark-muted">
                {item.type === 'npc' ? 'NPC' : '유저'}
              </span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={setRefs}
        type="text"
        value={draft}
        onChange={handleChange}
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
