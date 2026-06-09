'use client';

import { getUserIdFromToken } from '@/lib/auth';
import type { ChatMessage } from '@/types/chat';

interface ChatBubbleProps {
  message: ChatMessage;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function resolveSender(message: ChatMessage, myUserId: number | null) {
  const isMine = myUserId !== null && message.senderId === myUserId;

  if (isMine)
    return {
      isMine: true,
      name: '나',
      nameClass: 'text-moss',
      bubbleClass: 'bg-bubble-user',
    };
  return {
    isMine: false,
    name: '이웃',
    nameClass: 'text-ink-soft',
    bubbleClass: 'bg-bubble-neighbor',
  };
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  if (message.senderType === 'SYSTEM') {
    return (
      <div className="mb-2 flex justify-center">
        <span className="rounded-full bg-mist/70 px-3 py-1 text-[11px] text-ink-soft">
          {message.body}
        </span>
      </div>
    );
  }

  const myUserId = getUserIdFromToken();
  const { name, nameClass, bubbleClass, isMine } = resolveSender(message, myUserId);

  return (
    <div className={`mb-2 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
      <span className={`mb-0.5 text-[11px] font-medium ${nameClass}`}>{name}</span>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed text-ink shadow-sm ${bubbleClass} ${
          isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
      >
        {message.body}
      </div>
      <span className="mt-0.5 text-[10px] text-ink-soft">{formatTime(message.createdAt)}</span>
    </div>
  );
}
