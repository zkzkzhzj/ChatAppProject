import type { PositionBroadcast, TypingBroadcast } from './realtimeTypes';

type PositionListener = (pos: PositionBroadcast) => void;
type TypingListener = (data: TypingBroadcast) => void;

/**
 * WebSocket 위치 데이터 브릿지.
 *
 * React WebSocket 구독 계층이 수신한 위치 데이터를 Three.js SceneManager 계층에 전달한다.
 * 렌더링 엔진과 React 컴포넌트 생명주기가 달라서 콜백 기반 브릿지를 사용한다.
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

// --- 내 타이핑 브릿지 (chat input focus → scene input) ---

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
