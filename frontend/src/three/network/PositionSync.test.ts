import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HEARTBEAT_MS,
  POSITION_EPSILON,
  type PositionSender,
  PositionSync,
  THROTTLE_MS,
} from './PositionSync';

describe('PositionSync', () => {
  let sender: ReturnType<typeof vi.fn<PositionSender>>;
  let sync: PositionSync;

  beforeEach(() => {
    sender = vi.fn<PositionSender>();
    sync = new PositionSync(sender);
  });

  describe('sendIfChanged', () => {
    it('첫 호출은 송신', () => {
      expect(sync.sendIfChanged(1, 2, 0, 0)).toBe(true);
      expect(sender).toHaveBeenCalledWith(1, 2, 0);
    });

    it('THROTTLE_MS 미만 재호출 안 보냄', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      expect(sync.sendIfChanged(2, 3, 0, THROTTLE_MS - 1)).toBe(false);
      expect(sender).toHaveBeenCalledTimes(1);
    });

    it('THROTTLE_MS 이상 + 위치 변화 통과 시 송신', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      expect(sync.sendIfChanged(2, 3, 0, THROTTLE_MS)).toBe(true);
      expect(sender).toHaveBeenLastCalledWith(2, 3, 0);
    });

    it('THROTTLE_MS 통과해도 위치 변화 임계값 미만이면 안 보냄', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      const tinyDelta = POSITION_EPSILON / 2;
      expect(sync.sendIfChanged(1 + tinyDelta, 2 + tinyDelta, 0, 200)).toBe(false);
      expect(sender).toHaveBeenCalledTimes(1);
    });

    it('Three.js z 를 그대로 백엔드 y 인자로 매핑', () => {
      sync.sendIfChanged(5, -7, 0, 0);
      expect(sender).toHaveBeenCalledWith(5, -7, 0);
    });

    it('sends when only jump height changes', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      expect(sync.sendIfChanged(1, 2, 0.5, THROTTLE_MS)).toBe(true);
      expect(sender).toHaveBeenLastCalledWith(1, 2, 0.5);
    });
  });

  describe('heartbeat (idle visibility 보강)', () => {
    it('변화 없음 + HEARTBEAT_MS 미만 = 송신 X', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      expect(sync.sendIfChanged(1, 2, 0, HEARTBEAT_MS - 1)).toBe(false);
      expect(sender).toHaveBeenCalledTimes(1);
    });

    it('변화 없음 + HEARTBEAT_MS 도래 = 강제 송신 (idle user broadcast)', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      expect(sync.sendIfChanged(1, 2, 0, HEARTBEAT_MS)).toBe(true);
      expect(sender).toHaveBeenCalledTimes(2);
      expect(sender).toHaveBeenLastCalledWith(1, 2, 0);
    });

    it('HEARTBEAT_MS 후 또 HEARTBEAT_MS 후 = 또 송신 (주기적 박힘)', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      sync.sendIfChanged(1, 2, 0, HEARTBEAT_MS);
      expect(sync.sendIfChanged(1, 2, 0, HEARTBEAT_MS * 2)).toBe(true);
      expect(sender).toHaveBeenCalledTimes(3);
    });
  });

  describe('shouldRender (self filter)', () => {
    it('selfId 없으면 모든 broadcast render', () => {
      expect(sync.shouldRender({ id: 'anyone', userType: 'MEMBER', x: 0, y: 0 })).toBe(true);
    });

    it('selfId 일치하면 render X', () => {
      sync.setSelfId('me');
      expect(sync.shouldRender({ id: 'me', userType: 'MEMBER', x: 0, y: 0 })).toBe(false);
    });

    it('selfId 다르면 render', () => {
      sync.setSelfId('me');
      expect(sync.shouldRender({ id: 'other', userType: 'GUEST', x: 0, y: 0 })).toBe(true);
    });

    it('setSelfId(null) 호출하면 다시 모두 render', () => {
      sync.setSelfId('me');
      sync.setSelfId(null);
      expect(sync.shouldRender({ id: 'me', userType: 'MEMBER', x: 0, y: 0 })).toBe(true);
    });
  });

  describe('reset', () => {
    it('reset 후 같은 위치라도 다시 첫 송신처럼 동작', () => {
      sync.sendIfChanged(1, 2, 0, 0);
      sync.reset();
      // throttle + lastX 모두 초기화돼야 함 — 같은 위치·같은 now 도 통과
      expect(sync.sendIfChanged(1, 2, 0, 0)).toBe(true);
      expect(sender).toHaveBeenCalledTimes(2);
    });
  });
});
