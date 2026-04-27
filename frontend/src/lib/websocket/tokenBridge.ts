type DisplayIdListener = (displayId: string | null) => void;

/**
 * STOMP ↔ Phaser displayId 동기화 브릿지.
 *
 * useStomp 가 토큰을 발급/사용할 때마다 emitDisplayIdChange 를 호출한다.
 * VillageScene 은 onDisplayIdChange 로 구독해 myDisplayId 를 갱신,
 * 자기 broadcast 를 정확히 자기로 인식한다 (#28 fix 핵심).
 */
const listeners = new Set<DisplayIdListener>();

export function onDisplayIdChange(callback: DisplayIdListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function emitDisplayIdChange(displayId: string | null): void {
  for (const listener of listeners) {
    listener(displayId);
  }
}
