import { emitMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';
import type { ChatMessage, MessageResponse } from '@/types/chat';

import { emitChatMessage } from './chatBridge';
import { emitNpcTypingUpdate, emitPositionUpdate, emitTypingUpdate } from './positionBridge';
import {
  subscribeToChatRoom,
  subscribeToMailNotifications,
  subscribeToPositions,
  subscribeToTyping,
} from './stompClient';

const VILLAGE_CHAT_TOPIC = 'village';

interface RealtimeSubscriptionHandlers {
  addMessage: (message: ChatMessage) => void;
  setNpcTyping: (typing: boolean) => void;
}

function toMessage(msg: MessageResponse): ChatMessage {
  return {
    id: msg.id,
    participantId: msg.participantId,
    senderId: msg.senderId,
    senderType: msg.senderType,
    body: msg.body,
    createdAt: msg.createdAt,
  };
}

export function subscribeToStompRealtimeChannels({
  addMessage,
  setNpcTyping,
}: RealtimeSubscriptionHandlers): () => void {
  const chatSub = subscribeToChatRoom(VILLAGE_CHAT_TOPIC, (msg) => {
    console.log('[useStomp] Received message:', msg);
    const chatMsg = toMessage(msg);

    if (chatMsg.senderType === 'NPC') {
      setNpcTyping(false);
      emitNpcTypingUpdate(false);
    }

    addMessage(chatMsg);
    emitChatMessage(chatMsg);
  });

  const mailSub = subscribeToMailNotifications(() => {
    emitMailRefreshRequested();
  });

  const posSub = subscribeToPositions((pos) => {
    emitPositionUpdate(pos);
  });

  const typingSub = subscribeToTyping((data) => {
    emitTypingUpdate(data);
  });

  return () => {
    chatSub.unsubscribe();
    mailSub.unsubscribe();
    posSub.unsubscribe();
    typingSub.unsubscribe();
  };
}
