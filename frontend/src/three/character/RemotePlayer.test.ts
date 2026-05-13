import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { LERP_FACTOR, RemotePlayer } from './RemotePlayer';

describe('RemotePlayer', () => {
  it('생성 시 initial 좌표에 group.position 박힘', () => {
    const rp = new RemotePlayer(3, 4);
    expect(rp.group.position.x).toBe(3);
    expect(rp.group.position.z).toBe(4);
    expect(rp.group.position.y).toBe(0);
  });

  it('setTarget 호출 후 update 한 번 결로 LERP_FACTOR 비율 점근', () => {
    const rp = new RemotePlayer(0, 0);
    rp.setTarget(10, -8);
    rp.update();
    expect(rp.group.position.x).toBeCloseTo(10 * LERP_FACTOR, 5);
    expect(rp.group.position.z).toBeCloseTo(-8 * LERP_FACTOR, 5);
  });

  it('update 반복하면 target 에 수렴', () => {
    const rp = new RemotePlayer(0, 0);
    rp.setTarget(5, 5);
    for (let i = 0; i < 100; i += 1) rp.update();
    expect(rp.group.position.x).toBeCloseTo(5, 3);
    expect(rp.group.position.z).toBeCloseTo(5, 3);
  });

  it('target 변경 시 새 목표 방향으로 lerp', () => {
    const rp = new RemotePlayer(0, 0);
    rp.setTarget(10, 0);
    for (let i = 0; i < 50; i += 1) rp.update();
    rp.setTarget(0, 10);
    rp.update();
    // target 이 (0, 10) 으로 바뀐 후 한 번 lerp — z 가 0 에서 LERP_FACTOR*10 만큼 증가
    expect(rp.group.position.z).toBeGreaterThan(0);
  });

  it('dispose 시 geometry / material dispose 호출', () => {
    const rp = new RemotePlayer(0, 0);
    const mesh = rp.group.children[0] as THREE.Mesh;
    const geomSpy = vi.spyOn(mesh.geometry, 'dispose');
    const matSpy = vi.spyOn(mesh.material as THREE.Material, 'dispose');
    rp.dispose();
    expect(geomSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
  });

  describe('attachBubble 누적 stack (Step 1.7)', () => {
    const countSprites = (rp: RemotePlayer) =>
      rp.group.children.filter((c) => c instanceof THREE.Sprite).length;

    it('attachBubble 호출 시 group에 Sprite 추가', () => {
      const rp = new RemotePlayer(0, 0);
      expect(countSprites(rp)).toBe(0);
      rp.attachBubble('첫 메시지');
      expect(countSprites(rp)).toBe(1);
      rp.dispose();
    });

    it('연속 호출 시 누적 (교체 X) — 새 메시지가 머리 바로 위, 기존 결 위로 밀어 올림', () => {
      const rp = new RemotePlayer(0, 0);
      rp.attachBubble('first');
      const firstY = (rp.group.children.find((c) => c instanceof THREE.Sprite) as THREE.Sprite)
        .position.y;

      rp.attachBubble('second');
      const sprites = rp.group.children.filter((c) => c instanceof THREE.Sprite) as THREE.Sprite[];
      expect(sprites).toHaveLength(2);

      // 기존 결 위로 밀려서 firstY 보다 커야 함
      const movedFirst = sprites.find((s) => s.position.y > firstY);
      expect(movedFirst).toBeDefined();
      // 새 결 = firstY 자리 (머리 바로 위)
      const newest = sprites.find((s) => s.position.y === firstY);
      expect(newest).toBeDefined();

      rp.dispose();
    });

    it('한도(MAX_BUBBLES) 안 결 위로 누적 — 6초 timer 결로 자연 해제 (안전판 50)', () => {
      const rp = new RemotePlayer(0, 0);
      for (let i = 0; i < 10; i += 1) {
        rp.attachBubble(`m${String(i)}`);
      }
      expect(countSprites(rp)).toBe(10); // 한도 X — 10개 모두 유지
      rp.dispose();
    });

    it('dispose 시 모든 bubble dispose + group에서 제거', () => {
      const rp = new RemotePlayer(0, 0);
      rp.attachBubble('a');
      rp.attachBubble('b');
      expect(countSprites(rp)).toBe(2);

      rp.dispose();
      expect(countSprites(rp)).toBe(0);
    });
  });
});
