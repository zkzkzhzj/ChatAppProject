import type { PositionBroadcast, TypingBroadcast } from './stompClient';

type PositionListener = (pos: PositionBroadcast) => void;
type TypingListener = (data: TypingBroadcast) => void;

/**
 * STOMP ↔ Phaser 위치 데이터 브릿지.
 *
 * React(useStomp)가 STOMP에서 수신한 위치 데이터를 Phaser(VillageScene)에 전달한다.
 * Phaser는 React 컴포넌트가 아니므로 Zustand 대신 콜백 기반 브릿지를 사용한다.
 * Set 기반으로 다중 리스너를 지원하여 React StrictMode 재마운트에도 안전하다.
 */
const listeners = new Set<PositionListener>();

export function onPositionUpdate(callback: PositionListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function emitPositionUpdate(pos: PositionBroadcast): void {
  for (const listener of listeners) {
    listener(pos);
  }
}

// --- 타이핑 브릿지 ---

const typingListeners = new Set<TypingListener>();

export function onTypingUpdate(callback: TypingListener): () => void {
  typingListeners.add(callback);
  return () => {
    typingListeners.delete(callback);
  };
}

export function emitTypingUpdate(data: TypingBroadcast): void {
  for (const listener of typingListeners) {
    listener(data);
  }
}

// --- 내 타이핑 브릿지 (chat input focus → phaser) ---

const myTypingListeners = new Set<(typing: boolean) => void>();

export function onMyTypingUpdate(callback: (typing: boolean) => void): () => void {
  myTypingListeners.add(callback);
  return () => {
    myTypingListeners.delete(callback);
  };
}

export function emitMyTypingUpdate(typing: boolean): void {
  for (const listener of myTypingListeners) {
    listener(typing);
  }
}

// --- NPC 타이핑 브릿지 (chat → phaser) ---

const npcTypingListeners = new Set<(typing: boolean) => void>();

export function onNpcTypingUpdate(callback: (typing: boolean) => void): () => void {
  npcTypingListeners.add(callback);
  return () => {
    npcTypingListeners.delete(callback);
  };
}

export function emitNpcTypingUpdate(typing: boolean): void {
  for (const listener of npcTypingListeners) {
    listener(typing);
  }
}
