'use client';

import { useEffect, useRef } from 'react';

import { useChatStore } from '@/store/useChatStore';

import ChatBubble from './ChatBubble';

export default function ChatMessageList() {
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
    <div ref={scrollRef} className="pointer-events-auto mb-2 max-h-60 overflow-y-auto">
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
