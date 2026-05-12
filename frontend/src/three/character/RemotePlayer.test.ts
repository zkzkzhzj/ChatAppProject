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
});
