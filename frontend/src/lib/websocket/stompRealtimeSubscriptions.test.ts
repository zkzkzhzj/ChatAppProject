import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageResponse } from '@/types/chat';

import { subscribeToStompRealtimeChannels } from './stompRealtimeSubscriptions';

const {
  mockEmitChatMessage,
  mockEmitMailRefreshRequested,
  mockEmitPositionUpdate,
  mockEmitTypingUpdate,
  mockSubscribeToChatRoom,
  mockSubscribeToMailNotifications,
  mockSubscribeToPositions,
  mockSubscribeToTyping,
} = vi.hoisted(() => ({
  mockEmitChatMessage: vi.fn(),
  mockEmitMailRefreshRequested: vi.fn(),
  mockEmitPositionUpdate: vi.fn(),
  mockEmitTypingUpdate: vi.fn(),
  mockSubscribeToChatRoom: vi.fn(),
  mockSubscribeToMailNotifications: vi.fn(),
  mockSubscribeToPositions: vi.fn(),
  mockSubscribeToTyping: vi.fn(),
}));

vi.mock('./chatBridge', () => ({
  emitChatMessage: mockEmitChatMessage,
}));

vi.mock('@/lib/scene/mailRefreshBridge', () => ({
  emitMailRefreshRequested: mockEmitMailRefreshRequested,
}));

vi.mock('./positionBridge', () => ({
  emitPositionUpdate: mockEmitPositionUpdate,
  emitTypingUpdate: mockEmitTypingUpdate,
}));

vi.mock('./stompClient', () => ({
  subscribeToChatRoom: mockSubscribeToChatRoom,
  subscribeToMailNotifications: mockSubscribeToMailNotifications,
  subscribeToPositions: mockSubscribeToPositions,
  subscribeToTyping: mockSubscribeToTyping,
}));

function subscription() {
  return { unsubscribe: vi.fn() };
}

function userMessage(): MessageResponse {
  return {
    id: 'message-1',
    participantId: 10,
    senderId: 42,
    body: 'hello',
    createdAt: '2026-04-08T12:00:00.000Z',
  };
}

function systemMessage(): MessageResponse {
  return {
    id: 'system-1',
    participantId: 0,
    senderId: null,
    senderType: 'SYSTEM',
    body: '이웃이 입장하셨습니다.',
    createdAt: '2026-04-08T12:00:01.000Z',
  };
}

describe('subscribeToStompRealtimeChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeToChatRoom.mockReturnValue(subscription());
    mockSubscribeToMailNotifications.mockReturnValue(subscription());
    mockSubscribeToPositions.mockReturnValue(subscription());
    mockSubscribeToTyping.mockReturnValue(subscription());
  });

  it('subscribes to village chat, mail, position, and typing channels', () => {
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
    });

    expect(mockSubscribeToChatRoom).toHaveBeenCalledWith('village', expect.any(Function));
    expect(mockSubscribeToMailNotifications).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSubscribeToPositions).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSubscribeToTyping).toHaveBeenCalledWith(expect.any(Function));
  });

  it('passes user chat messages to the store and Three bridge', () => {
    const addMessage = vi.fn();
    const expectedMessage = {
      id: 'message-1',
      participantId: 10,
      senderId: 42,
      body: 'hello',
      createdAt: '2026-04-08T12:00:00.000Z',
    };
    subscribeToStompRealtimeChannels({
      addMessage,
    });
    const onMessage = mockSubscribeToChatRoom.mock.calls[0][1] as (msg: MessageResponse) => void;

    onMessage(userMessage());

    expect(addMessage).toHaveBeenCalledWith(expectedMessage);
    expect(mockEmitChatMessage).toHaveBeenCalledWith(expectedMessage);
  });

  it('preserves system chat messages so they render as system logs', () => {
    const addMessage = vi.fn();
    const expectedMessage = {
      id: 'system-1',
      participantId: 0,
      senderId: null,
      senderType: 'SYSTEM',
      body: '이웃이 입장하셨습니다.',
      createdAt: '2026-04-08T12:00:01.000Z',
    };
    subscribeToStompRealtimeChannels({
      addMessage,
    });
    const onMessage = mockSubscribeToChatRoom.mock.calls[0][1] as (msg: MessageResponse) => void;

    onMessage(systemMessage());

    expect(addMessage).toHaveBeenCalledWith(expectedMessage);
    expect(mockEmitChatMessage).toHaveBeenCalledWith(expectedMessage);
  });

  it('passes mail, position, and typing events to bridges', () => {
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
    });
    const onMail = mockSubscribeToMailNotifications.mock.calls[0][0] as () => void;
    const onPosition = mockSubscribeToPositions.mock.calls[0][0] as (pos: unknown) => void;
    const onTyping = mockSubscribeToTyping.mock.calls[0][0] as (data: unknown) => void;
    const position = { id: 'user-1', userType: 'MEMBER', x: 1, y: 2 };
    const typing = { id: 'user-1', typing: true };

    onMail();
    onPosition(position);
    onTyping(typing);

    expect(mockEmitMailRefreshRequested).toHaveBeenCalledTimes(1);
    expect(mockEmitPositionUpdate).toHaveBeenCalledWith(position);
    expect(mockEmitTypingUpdate).toHaveBeenCalledWith(typing);
  });

  it('cleanup unsubscribes all subscriptions', () => {
    const subs = [subscription(), subscription(), subscription(), subscription()];
    mockSubscribeToChatRoom.mockReturnValue(subs[0]);
    mockSubscribeToMailNotifications.mockReturnValue(subs[1]);
    mockSubscribeToPositions.mockReturnValue(subs[2]);
    mockSubscribeToTyping.mockReturnValue(subs[3]);

    const cleanup = subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
    });
    cleanup();

    for (const sub of subs) {
      expect(sub.unsubscribe).toHaveBeenCalledTimes(1);
    }
  });
});
