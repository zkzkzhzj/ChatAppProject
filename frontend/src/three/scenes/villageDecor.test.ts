import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { buildVillageDecor } from './villageDecor';

describe('villageDecor — 마을 데코 풀 패스', () => {
  it('빈 Scene 에 데코를 박아도 throw 없이 mesh 가 채워진다', () => {
    const scene = new THREE.Scene();
    buildVillageDecor(scene);

    let meshCount = 0;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount += 1;
    });
    // 꽃·풀·돌·덤불·울타리·랜턴·연못·불씨·반딧불 합산 — 최소 100개 이상
    expect(meshCount).toBeGreaterThan(100);
  });

  it('배치는 결정적 — 두 번 빌드해도 같은 위치', () => {
    const sceneA = new THREE.Scene();
    const sceneB = new THREE.Scene();
    buildVillageDecor(sceneA);
    buildVillageDecor(sceneB);

    const positions = (scene: THREE.Scene): string[] => {
      const out: string[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          out.push(
            `${obj.position.x.toFixed(4)},${obj.position.y.toFixed(4)},${obj.position.z.toFixed(4)}`,
          );
        }
      });
      return out;
    };
    expect(positions(sceneA)).toEqual(positions(sceneB));
  });

  it('update(elapsed) 호출이 throw 없이 동적 요소를 진행시킨다', () => {
    const scene = new THREE.Scene();
    const decor = buildVillageDecor(scene);
    expect(() => {
      for (let t = 0; t < 5; t += 0.016) decor.update(t);
    }).not.toThrow();
  });

  it('모닥불 주변에 대화 아지트 전용 오브젝트가 결정적으로 배치된다', () => {
    const scene = new THREE.Scene();
    buildVillageDecor(scene);
    scene.updateMatrixWorld(true);

    const hideoutObjects: string[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Object3D)) return;
      if (obj.userData.villageDecorRole) {
        hideoutObjects.push(String(obj.userData.villageDecorRole));
      }
    });

    expect(hideoutObjects.filter((role) => role === 'campfire-seat')).toHaveLength(6);
    expect(hideoutObjects.filter((role) => role === 'campfire-lantern')).toHaveLength(5);
    expect(hideoutObjects).toContain('campfire-gathering-ring');
    expect(hideoutObjects).toContain('campfire-keepsake-sign');
  });

  it('입구~도서관 길 위에는 지상 데코가 없다 (동선 보호)', () => {
    const scene = new THREE.Scene();
    buildVillageDecor(scene);
    scene.updateMatrixWorld(true);

    const offenders: string[] = [];
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const world = new THREE.Vector3();
      obj.getWorldPosition(world);
      // 예외 1: 모닥불 아지트 — 길 중앙의 의도된 랜드마크
      if (Math.hypot(world.x, world.z - 10) < 6) return;
      // 예외 2: 부유 요소 (반딧불, y ≥ 0.9) 는 지상 동선 침범 아님
      if (world.y >= 0.9) return;
      // 길 반폭 1.25 + 여유. 꽃 cluster 자식 offset(±0.4) 감안해 1.6 기준
      if (Math.abs(world.x) < 1.6 && world.z > -29 && world.z < 34) {
        offenders.push(`${obj.uuid} @ ${world.x.toFixed(2)},${world.z.toFixed(2)}`);
      }
    });
    expect(offenders).toEqual([]);
  });
});
