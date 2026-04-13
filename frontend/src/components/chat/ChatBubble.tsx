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

export default function ChatBubble({ message }: ChatBubbleProps) {
  const myUserId = getUserIdFromToken();
  const isNpc = message.senderType === 'NPC';
  const isMine = !isNpc && message.senderId === myUserId;

  const nameLabel = isNpc ? '마을 주민' : isMine ? '나' : '이웃';
  const nameColor = isNpc ? 'text-yellow-300' : isMine ? 'text-blue-300' : 'text-green-300';

  return (
    <div className="mb-1 flex items-start gap-2">
      <span className={`text-xs font-semibold ${nameColor}`}>{nameLabel}</span>
      <span className="text-sm text-white drop-shadow-md">{message.body}</span>
      <span className="ml-auto shrink-0 text-[10px] text-zinc-400">
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}
