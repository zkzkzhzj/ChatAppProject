import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InputState } from './input';

describe('InputState', () => {
  let input: InputState;

  beforeEach(() => {
    input = new InputState();
  });

  afterEach(() => {
    input.destroy();
  });

  it('keydown 으로 keys set 에 코드 박힘', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(input.read()).toEqual({ dx: 0, dz: -1, jump: false });
  });

  it('keyup 으로 keys set 에서 코드 빠짐', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });
  });

  it('input·textarea 포커스 시 키 입력 무시', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = new KeyboardEvent('keydown', { code: 'KeyW' });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);
    expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });
    document.body.removeChild(textarea);
  });

  describe('release on focus loss', () => {
    it('window blur 발생 시 keys 전부 clear', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      expect(input.read()).toEqual({ dx: 1, dz: -1, jump: false });

      window.dispatchEvent(new Event('blur'));
      expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });
    });

    it('document.hidden = true + visibilitychange 발생 시 keys 전부 clear', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(input.read()).toEqual({ dx: 0, dz: 1, jump: true });

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });

      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });

    it('document.hidden = false + visibilitychange 는 release 호출 X', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));

      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(input.read()).toEqual({ dx: -1, dz: 0, jump: false });
    });

    it('contextmenu 발생 시 keys 전부 clear (우클릭 메뉴 시나리오)', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(input.read()).toEqual({ dx: -1, dz: 0, jump: false });

      window.dispatchEvent(new Event('contextmenu'));
      expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });
    });

    it('release() 직접 호출도 keys 전부 clear', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      input.release();
      expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });
    });
  });

  describe('destroy', () => {
    it('destroy 후 keydown 무시', () => {
      input.destroy();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(input.read()).toEqual({ dx: 0, dz: 0, jump: false });
    });

    it('destroy 후 blur 발생해도 keys 그대로 (리스너 제거 검증)', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(input.read().dz).toBe(-1);
      input.destroy();
      // destroy 자체는 release 호출 X — keydown/keyup 리스너만 제거. keys 결박 결박 결박 결박.
      expect(input.read().dz).toBe(-1);
      // blur 발생 — 리스너 제거됐으면 release 안 호출 = keys 그대로
      window.dispatchEvent(new Event('blur'));
      expect(input.read().dz).toBe(-1);
    });

    it('destroy 두 번 호출 멱등', () => {
      input.destroy();
      expect(() => {
        input.destroy();
      }).not.toThrow();
    });
  });

  describe('camera orbit pointer input', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      input.bindCameraElement(canvas);
    });

    afterEach(() => {
      document.body.removeChild(canvas);
    });

    it('mouse left pointer drag는 orbit delta를 만들지 않는다', () => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          isPrimary: true,
          pointerType: 'mouse',
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }),
      );

      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
    });

    it('mouse right pointer drag delta를 누적한 뒤 consume 시 0으로 초기화한다', () => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 2,
          isPrimary: true,
          pointerType: 'mouse',
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }),
      );
      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 30, pitch: -15 });
      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
    });

    it('touch drag는 임계값을 넘은 뒤 orbit delta를 만든다', () => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          isPrimary: true,
          pointerType: 'touch',
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 103,
          clientY: 102,
          pointerType: 'touch',
        }),
      );
      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });

      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }),
      );
      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 27, pitch: -17 });
    });

    it('secondary pointer와 입력 요소 위 pointerdown은 orbit drag를 시작하지 않는다', () => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          isPrimary: false,
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }),
      );
      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      const event = new PointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 100,
        clientY: 100,
        button: 0,
        isPrimary: true,
      });
      Object.defineProperty(event, 'target', { value: textarea });
      canvas.dispatchEvent(event);
      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 2, clientX: 130, clientY: 85 }),
      );
      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
      document.body.removeChild(textarea);
    });

    it('camera element contextmenu 기본 동작을 막는다', () => {
      const event = new MouseEvent('contextmenu', { cancelable: true });

      canvas.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('pointerup 이후 move는 orbit delta를 만들지 않는다', () => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          isPrimary: true,
        }),
      );
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }),
      );

      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
    });

    it('destroy 후 pointer drag를 무시한다', () => {
      input.destroy();
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          button: 0,
          isPrimary: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }),
      );

      expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
    });
  });
});
