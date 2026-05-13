import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from '@/types/chat';

import { emitChatMessage, onChatMessage } from './chatBridge';

function makeMessage(body: string): ChatMessage {
  return {
    id: `m-${body}`,
    participantId: 1,
    senderId: 42,
    senderType: 'USER',
    body,
    createdAt: new Date().toISOString(),
  };
}

describe('chatBridge', () => {
  let unsubs: (() => void)[] = [];

  beforeEach(() => {
    unsubs = [];
  });

  it('emit 시 등록된 모든 리스너 호출', () => {
    const a = vi.fn();
    const b = vi.fn();
    unsubs.push(onChatMessage(a), onChatMessage(b));

    const msg = makeMessage('하이');
    emitChatMessage(msg);

    expect(a).toHaveBeenCalledWith(msg);
    expect(b).toHaveBeenCalledWith(msg);

    unsubs.forEach((u) => {
      u();
    });
  });

  it('unsubscribe 후 emit 으로 호출 X', () => {
    const listener = vi.fn();
    const off = onChatMessage(listener);
    off();

    emitChatMessage(makeMessage('나'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('emit 누적 호출 시 모든 메시지 전달', () => {
    const listener = vi.fn();
    unsubs.push(onChatMessage(listener));

    emitChatMessage(makeMessage('one'));
    emitChatMessage(makeMessage('two'));
    emitChatMessage(makeMessage('three'));

    expect(listener).toHaveBeenCalledTimes(3);

    unsubs.forEach((u) => {
      u();
    });
  });
});
