import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { resolveBoxCollisions } from './collision';

describe('resolveBoxCollisions', () => {
  it('pushes a point out of the nearest box face with clearance', () => {
    const position = new THREE.Vector3(0, 0, -2);

    resolveBoxCollisions(position, [{ minX: -1.35, maxX: 1.35, minZ: -2.75, maxZ: -1.25 }]);

    expect(position.z).toBeCloseTo(-1.17);
  });

  it('leaves a point outside all boxes unchanged', () => {
    const position = new THREE.Vector3(3, 0, 3);

    resolveBoxCollisions(position, [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }]);

    expect(position.x).toBe(3);
    expect(position.z).toBe(3);
  });
});
