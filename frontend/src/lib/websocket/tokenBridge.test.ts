import { describe, expect, it, vi } from 'vitest';

import { emitDisplayIdChange, onDisplayIdChange } from './tokenBridge';

/**
 * #28 fix — useStomp 의 토큰 발급/갱신을 VillageScene 의 myDisplayId 에 동기화하는 채널.
 * positionBridge 와 같은 다중 리스너 + unsubscribe 컨벤션을 따른다.
 */

describe('tokenBridge — displayId 동기화 (#28 fix)', () => {
  it('emit 시 등록된 모든 리스너가 호출된다', () => {
    // Given: 두 리스너 등록 (예: VillageScene + 잠재 다른 구독자)
    const a = vi.fn();
    const b = vi.fn();
    const offA = onDisplayIdChange(a);
    const offB = onDisplayIdChange(b);

    // When
    emitDisplayIdChange('user-42');

    // Then
    expect(a).toHaveBeenCalledWith('user-42');
    expect(b).toHaveBeenCalledWith('user-42');

    offA();
    offB();
  });

  it('unsubscribe 후에는 리스너가 더 호출되지 않는다 (씬 SHUTDOWN 정리)', () => {
    // Given
    const listener = vi.fn();
    const off = onDisplayIdChange(listener);

    // When
    off();
    emitDisplayIdChange('guest-x');

    // Then
    expect(listener).not.toHaveBeenCalled();
  });

  it('null emit 으로 displayId 해제를 전파할 수 있다 (cleanup)', () => {
    // Given: useStomp cleanup 시 myDisplayId 를 null 로 되돌리는 시나리오
    const listener = vi.fn();
    const off = onDisplayIdChange(listener);

    // When
    emitDisplayIdChange(null);

    // Then
    expect(listener).toHaveBeenCalledWith(null);

    off();
  });
});
