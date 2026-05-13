import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitDisplayIdChange, onDisplayIdChange } from './tokenBridge';

/**
 * #28 fix — useStomp 의 토큰 발급/갱신을 Three.js Scene 의 selfId 에 동기화하는 채널.
 * positionBridge 와 같은 다중 리스너 + unsubscribe 컨벤션을 따른다.
 *
 * Step 1.5 변경: subscribe 시 현재 displayId 를 즉시 한 번 호출 — late subscriber
 * (dynamic import 된 ThreeGame) 가 emit 을 놓쳐 self filter 가 죽는 #28 회귀 방지.
 */

describe('tokenBridge — displayId 동기화 (#28 fix)', () => {
  beforeEach(() => {
    // module-level currentDisplayId 가 다른 테스트에서 박힌 값으로 leak 되지 않도록 reset
    emitDisplayIdChange(null);
  });

  it('emit 시 등록된 모든 리스너가 호출된다', () => {
    // Given: 두 리스너 등록 (subscribe 결로 callback(null) 즉시 1회 호출됨)
    const a = vi.fn();
    const b = vi.fn();
    const offA = onDisplayIdChange(a);
    const offB = onDisplayIdChange(b);

    // When
    emitDisplayIdChange('user-42');

    // Then — 마지막 호출이 'user-42' 결로 박혔는지
    expect(a).toHaveBeenLastCalledWith('user-42');
    expect(b).toHaveBeenLastCalledWith('user-42');

    offA();
    offB();
  });

  it('unsubscribe 후에는 emit 으로 리스너가 더 호출되지 않는다', () => {
    // Given
    const listener = vi.fn();
    const off = onDisplayIdChange(listener);
    // subscribe 결로 즉시 1회 호출됨
    expect(listener).toHaveBeenCalledTimes(1);

    // When
    off();
    emitDisplayIdChange('guest-x');

    // Then — off 이후 emit 은 더 이상 listener 를 호출 X
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('null emit 으로 displayId 해제를 전파할 수 있다 (cleanup)', () => {
    // Given: useStomp 결로 emit('user-1') 박힌 결 가정
    emitDisplayIdChange('user-1');
    const listener = vi.fn();
    const off = onDisplayIdChange(listener);
    // subscribe 결로 현재 값 'user-1' 결로 즉시 호출
    expect(listener).toHaveBeenLastCalledWith('user-1');

    // When
    emitDisplayIdChange(null);

    // Then
    expect(listener).toHaveBeenLastCalledWith(null);

    off();
  });

  it('subscribe 시점에 현재 displayId 를 즉시 1회 호출 (late subscriber 보강)', () => {
    // Given: useStomp 결로 emit 결로 박힌 결로 ThreeGame mount 늦은 시나리오
    emitDisplayIdChange('late-user');

    // When
    const listener = vi.fn();
    const off = onDisplayIdChange(listener);

    // Then — subscribe 결로 현재 값 즉시 받음
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('late-user');

    off();
  });
});
