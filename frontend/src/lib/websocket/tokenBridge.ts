type DisplayIdListener = (displayId: string | null) => void;

/**
 * STOMP ↔ Three.js displayId 동기화 브릿지.
 *
 * useStomp 가 토큰을 발급/사용할 때마다 emitDisplayIdChange 를 호출한다.
 * Three.js Scene 은 onDisplayIdChange 로 구독해 self 인식을 갱신.
 *
 * 현재 displayId 를 module-level state 로 보존한다. dynamic import 된 ThreeGame 의
 * 마운트가 useStomp 의 emit 보다 늦으면, late subscriber 는 emit 을 놓친다.
 * 그 결로 self filter 가 동작 X → 자기 broadcast 가 자기 placeholder 로 렌더됨.
 * subscribe 시점에 현재 값을 즉시 한 번 호출해 이 race 를 해소한다 (#28 회귀 방지).
 */
let currentDisplayId: string | null = null;
const listeners = new Set<DisplayIdListener>();

export function onDisplayIdChange(callback: DisplayIdListener): () => void {
  listeners.add(callback);
  callback(currentDisplayId);
  return () => {
    listeners.delete(callback);
  };
}

export function emitDisplayIdChange(displayId: string | null): void {
  currentDisplayId = displayId;
  for (const listener of listeners) {
    listener(displayId);
  }
}
