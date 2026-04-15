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

  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-auto mb-2 flex flex-col">
      <div
        onMouseDown={onResizeStart}
        className="flex h-4 cursor-ns-resize items-center justify-center"
      >
        <div className="h-1 w-10 rounded-full bg-sand/50" />
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-2xl bg-cream/88 px-3 py-2 backdrop-blur-sm"
        style={{ maxHeight: height }}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
