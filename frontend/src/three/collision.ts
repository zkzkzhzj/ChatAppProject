import * as THREE from 'three';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const DEFAULT_COLLISION_CLEARANCE = 0.08;

export function resolveBoxCollisions(
  position: THREE.Vector3,
  boxes: readonly BoxCollider[],
  clearance = DEFAULT_COLLISION_CLEARANCE,
): void {
  for (const box of boxes) {
    if (
      position.x < box.minX ||
      position.x > box.maxX ||
      position.z < box.minZ ||
      position.z > box.maxZ
    ) {
      continue;
    }

    const pushLeft = Math.abs(position.x - box.minX);
    const pushRight = Math.abs(box.maxX - position.x);
    const pushBack = Math.abs(position.z - box.minZ);
    const pushFront = Math.abs(box.maxZ - position.z);
    const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);

    if (minPush === pushLeft) {
      position.x = box.minX - clearance;
    } else if (minPush === pushRight) {
      position.x = box.maxX + clearance;
    } else {
      const centerZ = (box.minZ + box.maxZ) / 2;
      position.z = position.z < centerZ ? box.minZ - clearance : box.maxZ + clearance;
    }
  }
}
