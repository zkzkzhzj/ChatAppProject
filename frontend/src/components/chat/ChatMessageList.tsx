'use client';

import type { MouseEvent } from 'react';
import { useEffect, useRef } from 'react';

import { useChatStore } from '@/store/useChatStore';

import ChatBubble from './ChatBubble';

interface ChatMessageListProps {
  height: number;
  onResizeStart: (e: MouseEvent) => void;
}

export default function ChatMessageList({ height, onResizeStart }: ChatMessageListProps) {
  const messages = useChatStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="pointer-events-auto mb-2 flex h-full flex-col">
      <div
        onMouseDown={onResizeStart}
        className="flex h-4 cursor-ns-resize items-center justify-center"
      >
        <div className="h-1 w-10 rounded-full bg-sand/50" />
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto rounded bg-panel/92 px-3 py-2 shadow-inner backdrop-blur-sm"
        style={{ maxHeight: height }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
            <p className="font-display text-base text-ink">아직 대화가 없습니다</p>
            <p className="mt-2 max-w-56 text-xs leading-5 text-ink-soft">
              Enter를 눌러 마을에 말을 남기면 이곳에 기록됩니다.
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
      </div>
    </div>
  );
}
