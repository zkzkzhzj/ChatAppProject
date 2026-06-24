import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { VillageScene } from './VillageScene';

describe('VillageScene', () => {
  it('renders the library room sign with a texture label', () => {
    const village = new VillageScene();
    let signTexture: unknown = null;

    village.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.villageRole === 'library-room-sign') {
        signTexture = (obj.material as THREE.MeshLambertMaterial).map;
      }
    });

    expect(signTexture).toBeInstanceOf(THREE.CanvasTexture);
  });
});
