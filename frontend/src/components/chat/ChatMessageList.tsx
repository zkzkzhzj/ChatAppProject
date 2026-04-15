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
      {/* 리사이즈 핸들 — 위로 드래그하면 채팅 영역이 커진다 */}
      <div
        onMouseDown={onResizeStart}
        className="flex h-3 cursor-ns-resize items-center justify-center"
      >
        <div className="h-0.5 w-10 rounded-full bg-zinc-500/60" />
      </div>
      <div ref={scrollRef} className="overflow-y-auto pr-2" style={{ maxHeight: height }}>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
