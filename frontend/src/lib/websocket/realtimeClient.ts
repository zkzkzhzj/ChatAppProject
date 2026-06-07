import type { IFrame } from '@stomp/stompjs';

import type { ChatMessage } from '@/types/chat';

import {
  connectRawWebSocket,
  disconnectRawWebSocket,
  sendRawLeaveVillage,
  sendRawPosition,
  sendRawTypingStatus,
  sendRawVillageMessage,
  subscribeToRawRealtimeChannels,
} from './rawWebSocketClient';
import {
  connectWithAuth,
  disconnectStomp,
  sendLeaveVillage as sendStompLeaveVillage,
  sendPosition as sendStompPosition,
  sendTypingStatus as sendStompTypingStatus,
  sendVillageMessage as sendStompVillageMessage,
} from './stompClient';
import { subscribeToStompRealtimeChannels } from './stompRealtimeSubscriptions';

export type RealtimeTransport = 'stomp' | 'raw';

interface RealtimeSubscriptionHandlers {
  addMessage: (message: ChatMessage) => void;
  setNpcTyping: (typing: boolean) => void;
}

export function resolveRealtimeTransport(): RealtimeTransport {
  return process.env.NEXT_PUBLIC_REALTIME_TRANSPORT === 'raw' ? 'raw' : 'stomp';
}

export function connectRealtime(
  token: string,
  onConnected: () => void,
  onError?: (err: IFrame) => void,
): void {
  if (resolveRealtimeTransport() === 'raw') {
    connectRawWebSocket(token, onConnected, onError);
    return;
  }
  connectWithAuth(token, onConnected, onError);
}

export function disconnectRealtime(): void {
  if (resolveRealtimeTransport() === 'raw') {
    disconnectRawWebSocket();
    return;
  }
  disconnectStomp();
}

export function subscribeToRealtimeChannels(handlers: RealtimeSubscriptionHandlers): () => void {
  if (resolveRealtimeTransport() === 'raw') {
    return subscribeToRawRealtimeChannels(handlers);
  }
  return subscribeToStompRealtimeChannels(handlers);
}

export function sendVillageMessage(body: string, onSent?: () => void): void {
  if (resolveRealtimeTransport() === 'raw') {
    sendRawVillageMessage(body, onSent);
    return;
  }
  sendStompVillageMessage(body, onSent);
}

export function sendTypingStatus(typing: boolean): void {
  if (resolveRealtimeTransport() === 'raw') {
    sendRawTypingStatus(typing);
    return;
  }
  sendStompTypingStatus(typing);
}

export function sendPosition(x: number, y: number): void {
  if (resolveRealtimeTransport() === 'raw') {
    sendRawPosition(x, y);
    return;
  }
  sendStompPosition(x, y);
}

export function sendLeaveVillage(): void {
  if (resolveRealtimeTransport() === 'raw') {
    sendRawLeaveVillage();
    return;
  }
  sendStompLeaveVillage();
}
