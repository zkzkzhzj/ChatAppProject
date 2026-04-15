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

/** 멘션 마크업을 하이라이트된 @이름으로 렌더링 */
function renderBody(body: string) {
  const parts = body.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = /@\[([^\]]+)\]\([^)]+\)/.exec(part);
    if (match) {
      return (
        <span key={i} className="font-semibold text-leaf">
          @{match[1]}
        </span>
      );
    }
    return part;
  });
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  // 시스템 메시지 (입장/퇴장)
  if (message.senderType === 'SYSTEM') {
    return (
      <div className="mb-2 flex justify-center">
        <span className="rounded-full bg-sand/30 px-3 py-1 text-[11px] text-bark-muted">
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
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed text-bark ${bubbleClass} ${
          isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
      >
        {renderBody(message.body)}
      </div>
      <span className="mt-0.5 text-[10px] text-bark-muted">{formatTime(message.createdAt)}</span>
    </div>
  );
}
