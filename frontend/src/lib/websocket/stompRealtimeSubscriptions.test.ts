import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageResponse } from '@/types/chat';

import { subscribeToStompRealtimeChannels } from './stompRealtimeSubscriptions';

const {
  mockEmitChatMessage,
  mockEmitMailRefreshRequested,
  mockEmitNpcTypingUpdate,
  mockEmitPositionUpdate,
  mockEmitTypingUpdate,
  mockSubscribeToChatRoom,
  mockSubscribeToMailNotifications,
  mockSubscribeToPositions,
  mockSubscribeToTyping,
} = vi.hoisted(() => ({
  mockEmitChatMessage: vi.fn(),
  mockEmitMailRefreshRequested: vi.fn(),
  mockEmitNpcTypingUpdate: vi.fn(),
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
  emitNpcTypingUpdate: mockEmitNpcTypingUpdate,
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
    senderType: 'USER',
    body: '안녕',
    createdAt: '2026-04-08T12:00:00.000Z',
  };
}

function npcMessage(): MessageResponse {
  return {
    ...userMessage(),
    id: 'message-2',
    senderId: null,
    senderType: 'NPC',
    body: '어서 와',
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

  it('마을 채팅, 메일, 위치, 타이핑 채널을 구독한다', () => {
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping: vi.fn(),
    });

    expect(mockSubscribeToChatRoom).toHaveBeenCalledWith('village', expect.any(Function));
    expect(mockSubscribeToMailNotifications).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSubscribeToPositions).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSubscribeToTyping).toHaveBeenCalledWith(expect.any(Function));
  });

  it('USER 채팅 메시지를 store와 Three bridge로 전달한다', () => {
    const addMessage = vi.fn();
    const expectedMessage = {
      id: 'message-1',
      participantId: 10,
      senderId: 42,
      senderType: 'USER',
      body: '안녕',
      createdAt: '2026-04-08T12:00:00.000Z',
    };
    subscribeToStompRealtimeChannels({
      addMessage,
      setNpcTyping: vi.fn(),
    });
    const onMessage = mockSubscribeToChatRoom.mock.calls[0][1] as (msg: MessageResponse) => void;

    onMessage(userMessage());

    expect(addMessage).toHaveBeenCalledWith(expectedMessage);
    expect(mockEmitChatMessage).toHaveBeenCalledWith(expectedMessage);
  });

  it('NPC 채팅 메시지는 NPC typing 상태를 해제하고 메시지도 전달한다', () => {
    const addMessage = vi.fn();
    const setNpcTyping = vi.fn();
    const expectedMessage = {
      id: 'message-2',
      participantId: 10,
      senderId: null,
      senderType: 'NPC',
      body: '어서 와',
      createdAt: '2026-04-08T12:00:00.000Z',
    };
    subscribeToStompRealtimeChannels({
      addMessage,
      setNpcTyping,
    });
    const onMessage = mockSubscribeToChatRoom.mock.calls[0][1] as (msg: MessageResponse) => void;

    onMessage(npcMessage());

    expect(setNpcTyping).toHaveBeenCalledWith(false);
    expect(mockEmitNpcTypingUpdate).toHaveBeenCalledWith(false);
    expect(addMessage).toHaveBeenCalledWith(expectedMessage);
    expect(mockEmitChatMessage).toHaveBeenCalledWith(expectedMessage);
  });

  it('메일, 위치, 타이핑 이벤트를 bridge로 전달한다', () => {
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping: vi.fn(),
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

  it('cleanup은 모든 구독을 해제한다', () => {
    const subs = [subscription(), subscription(), subscription(), subscription()];
    mockSubscribeToChatRoom.mockReturnValue(subs[0]);
    mockSubscribeToMailNotifications.mockReturnValue(subs[1]);
    mockSubscribeToPositions.mockReturnValue(subs[2]);
    mockSubscribeToTyping.mockReturnValue(subs[3]);

    const cleanup = subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping: vi.fn(),
    });
    cleanup();

    for (const sub of subs) {
      expect(sub.unsubscribe).toHaveBeenCalledTimes(1);
    }
  });
});
