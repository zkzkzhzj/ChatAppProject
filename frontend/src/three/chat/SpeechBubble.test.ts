import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUBBLE_LIFETIME_MS, SpeechBubble } from './SpeechBubble';

describe('SpeechBubble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('생성 시 sprite·texture·material 모두 존재', () => {
    const bubble = new SpeechBubble('안녕', () => undefined);
    expect(bubble.sprite).toBeInstanceOf(THREE.Sprite);
    expect(bubble.sprite.material).toBeInstanceOf(THREE.SpriteMaterial);
    expect(bubble.sprite.material.map).toBeInstanceOf(THREE.CanvasTexture);
    bubble.dispose();
  });

  it('생성 시 texture 결 sprite.material.map 결로 박힘', () => {
    // jsdom canvas.getContext('2d') 결 null 결로 needsUpdate 검증 결 X — texture 존재만 확인
    const bubble = new SpeechBubble('hi', () => undefined);
    expect(bubble.sprite.material.map).toBeInstanceOf(THREE.CanvasTexture);
    bubble.dispose();
  });

  it('BUBBLE_LIFETIME_MS 경과 시 onExpire 호출', () => {
    const onExpire = vi.fn();
    const bubble = new SpeechBubble('하이', onExpire);

    vi.advanceTimersByTime(BUBBLE_LIFETIME_MS - 1);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    bubble.dispose();
  });

  it('setText 재호출 시 timer 재설정 (이전 timer 취소)', () => {
    const onExpire = vi.fn();
    const bubble = new SpeechBubble('first', onExpire);

    vi.advanceTimersByTime(BUBBLE_LIFETIME_MS - 1000);
    bubble.setText('second');

    // 이전 timer 만료 시점 = 1000ms 후 — 이미 cancel 됨
    vi.advanceTimersByTime(1000);
    expect(onExpire).not.toHaveBeenCalled();

    // 새 timer는 setText 시점 + LIFETIME_MS 후 만료
    vi.advanceTimersByTime(BUBBLE_LIFETIME_MS - 1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    bubble.dispose();
  });

  it('dispose 시 texture·material dispose 호출 + timer cancel', () => {
    const onExpire = vi.fn();
    const bubble = new SpeechBubble('떠나가', onExpire);
    const texture = bubble.sprite.material.map;
    if (!texture) throw new Error('texture 결 안 박힘');
    const texDispose = vi.spyOn(texture, 'dispose');
    const matDispose = vi.spyOn(bubble.sprite.material, 'dispose');

    bubble.dispose();
    expect(texDispose).toHaveBeenCalledTimes(1);
    expect(matDispose).toHaveBeenCalledTimes(1);

    // dispose 후 timer 만료 시점 도달해도 onExpire 안 호출
    vi.advanceTimersByTime(BUBBLE_LIFETIME_MS);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('22자 초과 텍스트는 잘림 + 말줄임 처리 (draw 호출 자체는 throw X)', () => {
    const longText = '가나다라마바사아자차카타파하가나다라마바사아자차카타';
    expect(longText.length).toBeGreaterThan(22);
    expect(() => {
      const bubble = new SpeechBubble(longText, () => undefined);
      bubble.dispose();
    }).not.toThrow();
  });
});
