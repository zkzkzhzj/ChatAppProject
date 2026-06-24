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

  it('keeps the character out of village signboards and the library shell', () => {
    const village = new VillageScene();

    village.character.position.set(-4.8, 0, 21);
    village.resolveCollisions();
    expect(village.character.position.z < 20.15 || village.character.position.z > 21.85).toBe(true);

    village.character.position.set(0, 0, -27);
    village.resolveCollisions();
    expect(village.character.position.z < -30.25 || village.character.position.z > -23.75).toBe(
      true,
    );
  });
});
