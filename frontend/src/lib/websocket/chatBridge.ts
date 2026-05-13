import type { ChatMessage } from '@/types/chat';

/**
 * STOMP ↔ Three.js Scene 채팅 메시지 브릿지 (Step 1.7).
 *
 * `useStomp` 가 채팅방 message 수신 시 `emitChatMessage` 호출 →
 * Three.js SceneManager 가 `onChatMessage` 구독 → 해당 displayId 의 캐릭터에 SpeechBubble attach.
 *
 * positionBridge / tokenBridge 와 동일 패턴 (Set 기반 다중 리스너, unsubscribe 함수 반환).
 *
 * 자기 메시지도 동일 채널로 전달 — SceneManager 가 displayId 비교해 자기·다른 유저 구분.
 */
type ChatMessageListener = (msg: ChatMessage) => void;

const listeners = new Set<ChatMessageListener>();

export function onChatMessage(callback: ChatMessageListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function emitChatMessage(msg: ChatMessage): void {
  for (const listener of listeners) {
    listener(msg);
  }
}
