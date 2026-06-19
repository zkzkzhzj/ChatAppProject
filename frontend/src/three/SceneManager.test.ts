import { describe, expect, it } from 'vitest';

import { rotateMovementByYaw } from './SceneManager';

describe('rotateMovementByYaw', () => {
  it('keeps the existing movement direction at the initial camera yaw', () => {
    expect(rotateMovementByYaw({ dx: 0, dz: -1, jump: false }, 0)).toEqual({
      dx: 0,
      dz: -1,
      jump: false,
    });
  });

  it('rotates forward movement by camera yaw', () => {
    const movement = rotateMovementByYaw({ dx: 0, dz: -1, jump: true }, Math.PI / 2);

    expect(movement.dx).toBeCloseTo(-1);
    expect(movement.dz).toBeCloseTo(0);
    expect(movement.jump).toBe(true);
  });

  it('returns the same idle object when there is no horizontal movement', () => {
    const idle = { dx: 0, dz: 0, jump: true };

    expect(rotateMovementByYaw(idle, Math.PI / 2)).toBe(idle);
  });
});
