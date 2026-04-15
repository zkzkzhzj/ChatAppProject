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
  const isNpc = message.senderType === 'NPC';
  const isMine = !isNpc && message.senderId === myUserId;

  if (isNpc)
    return {
      isMine: false,
      name: '마을 주민',
      nameClass: 'text-leaf',
      bubbleClass: 'bg-bubble-npc',
    };
  if (isMine)
    return {
      isMine: true,
      name: '나',
      nameClass: 'text-bark-light',
      bubbleClass: 'bg-bubble-user',
    };
  return {
    isMine: false,
    name: '이웃',
    nameClass: 'text-neighbor',
    bubbleClass: 'bg-bubble-neighbor',
  };
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const myUserId = getUserIdFromToken();
  const { name, nameClass, bubbleClass, isMine } = resolveSender(message, myUserId);

  return (
    <div className={`mb-2 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
      <span className={`mb-0.5 text-[11px] font-medium ${nameClass}`}>{name}</span>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed text-bark ${bubbleClass} ${
          isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
      >
        {message.body}
      </div>
      <span className="mt-0.5 text-[10px] text-bark-muted">{formatTime(message.createdAt)}</span>
    </div>
  );
}
