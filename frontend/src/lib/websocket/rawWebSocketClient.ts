import type { IFrame } from '@stomp/stompjs';

import type { ChatMessage } from '@/types/chat';

import { emitChatMessage } from './chatBridge';
import { emitNpcTypingUpdate, emitPositionUpdate, emitTypingUpdate } from './positionBridge';
import type { PositionBroadcast, TypingBroadcast } from './realtimeTypes';

const PUBLIC_ROOM_ID = 1;

interface RawRealtimeHandlers {
  addMessage: (message: ChatMessage) => void;
  setNpcTyping: (typing: boolean) => void;
}

type RawInboundFrame =
  | {
      type: 'MESSAGE';
      message: ChatMessage;
    }
  | {
      type: 'POSITION_UPDATE';
      displayId: string;
      userType: PositionBroadcast['userType'];
      x: number;
      y: number;
    }
  | {
      type: 'TYPING_UPDATE';
      displayId: string;
      typing: boolean;
    }
  | {
      type: 'ERROR';
      code: string;
      message: string;
    }
  | {
      type: 'PONG';
    };

let socket: WebSocket | null = null;
let handlers: RawRealtimeHandlers | null = null;

function rawWsUrl(token: string): string {
  const configured = process.env.NEXT_PUBLIC_RAW_WS_URL;
  const fallbackWs = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080/ws';
  const base = configured ?? fallbackWs.replace(/^http/, 'ws').replace(/\/ws$/, '/ws/v2');
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}access_token=${encodeURIComponent(token)}`;
}

function sendRawFrame(frame: unknown): void {
  if (socket?.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(frame));
}

function subscribePublicRoom(): void {
  sendRawFrame({ type: 'SUBSCRIBE', roomId: PUBLIC_ROOM_ID });
}

function mapPosition(
  frame: Extract<RawInboundFrame, { type: 'POSITION_UPDATE' }>,
): PositionBroadcast {
  return {
    id: frame.displayId,
    userType: frame.userType,
    x: frame.x,
    y: frame.y,
  };
}

function mapTyping(frame: Extract<RawInboundFrame, { type: 'TYPING_UPDATE' }>): TypingBroadcast {
  return {
    id: frame.displayId,
    typing: frame.typing,
  };
}

function handleRawMessage(payload: string): void {
  let frame: RawInboundFrame;
  try {
    frame = JSON.parse(payload) as RawInboundFrame;
  } catch {
    return;
  }

  if (frame.type === 'MESSAGE') {
    if (frame.message.senderType === 'NPC') {
      handlers?.setNpcTyping(false);
      emitNpcTypingUpdate(false);
    }
    handlers?.addMessage(frame.message);
    emitChatMessage(frame.message);
    return;
  }

  if (frame.type === 'POSITION_UPDATE') {
    emitPositionUpdate(mapPosition(frame));
    return;
  }

  if (frame.type === 'TYPING_UPDATE') {
    emitTypingUpdate(mapTyping(frame));
  }
}

export function connectRawWebSocket(
  token: string,
  onConnected: () => void,
  onError?: (err: IFrame) => void,
): void {
  disconnectRawWebSocket();
  socket = new WebSocket(rawWsUrl(token));
  socket.onopen = () => {
    onConnected();
    subscribePublicRoom();
  };
  socket.onmessage = (event) => {
    if (typeof event.data === 'string') {
      handleRawMessage(event.data);
    }
  };
  socket.onerror = () => {
    onError?.({
      command: 'ERROR',
      headers: { message: 'Raw WebSocket error' },
    } as unknown as IFrame);
  };
  socket.onclose = () => {
    socket = null;
  };
}

export function disconnectRawWebSocket(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    sendRawFrame({ type: 'UNSUBSCRIBE', roomId: PUBLIC_ROOM_ID });
  }
  socket?.close();
  socket = null;
}

export function subscribeToRawRealtimeChannels(nextHandlers: RawRealtimeHandlers): () => void {
  handlers = nextHandlers;
  subscribePublicRoom();
  return () => {
    if (handlers === nextHandlers) {
      handlers = null;
    }
  };
}

export function sendRawVillageMessage(body: string, onSent?: () => void): void {
  sendRawFrame({ type: 'PUBLISH', roomId: PUBLIC_ROOM_ID, body });
  onSent?.();
}

export function sendRawTypingStatus(typing: boolean): void {
  sendRawFrame({ type: 'TYPING', roomId: PUBLIC_ROOM_ID, typing });
}

export function sendRawPosition(x: number, y: number): void {
  sendRawFrame({ type: 'POSITION', roomId: PUBLIC_ROOM_ID, x, y });
}

export function sendRawLeaveVillage(): void {
  sendRawFrame({ type: 'POSITION', roomId: PUBLIC_ROOM_ID, x: 0, y: 0 });
}
