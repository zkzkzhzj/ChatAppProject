import * as THREE from 'three';

import { PHYSICS } from '../constants';

/**
 * Step 1 PoC 캐릭터 — 박스 + 구 placeholder.
 * Step 3 에서 Quaternius CC0 3D 모델로 교체.
 *
 * 물리 (spec D11):
 * - 걷기 (WALK_SPEED) + 점프 (가벼운 깡총, MAX_HEIGHT 1)
 * - 뛰기·달리기 X (RUN_ENABLED false)
 */
export class Character {
  readonly group = new THREE.Group();
  private readonly velocityY = { value: 0 };
  private isOnGround = true;
  private readonly bodyHeight = 1.4;

  constructor(spawn: THREE.Vector3) {
    // 몸통 (박스)
    const bodyGeometry = new THREE.BoxGeometry(0.6, this.bodyHeight, 0.6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xa3826a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = this.bodyHeight / 2;
    body.castShadow = true;
    this.group.add(body);

    // 머리 (구)
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 12);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xf3d2b3 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = this.bodyHeight + 0.3;
    head.castShadow = true;
    this.group.add(head);

    this.group.position.copy(spawn);
  }

  /** 입력 결과 적용해서 한 프레임 이동. delta = 초. */
  update(input: { dx: number; dz: number; jump: boolean }, delta: number): void {
    // 수평 이동 (걷기 only — 뛰기 결 X)
    const speed = PHYSICS.WALK_SPEED;
    const length = Math.hypot(input.dx, input.dz);
    if (length > 0) {
      const nx = input.dx / length;
      const nz = input.dz / length;
      this.group.position.x += nx * speed * delta;
      this.group.position.z += nz * speed * delta;

      // 캐릭터 방향 회전 (이동 방향 바라보기)
      this.group.rotation.y = Math.atan2(nx, nz);
    }

    // 점프 (가벼운 깡총)
    if (input.jump && this.isOnGround) {
      this.velocityY.value = PHYSICS.JUMP_VELOCITY;
      this.isOnGround = false;
    }

    // 중력
    if (!this.isOnGround) {
      this.velocityY.value -= PHYSICS.GRAVITY * delta;
      this.group.position.y += this.velocityY.value * delta;

      // 가드레일: 높이 1 unit 초과 X (D11)
      if (this.group.position.y > PHYSICS.JUMP_MAX_HEIGHT) {
        this.group.position.y = PHYSICS.JUMP_MAX_HEIGHT;
        this.velocityY.value = Math.min(this.velocityY.value, 0);
      }

      // 착지
      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.velocityY.value = 0;
        this.isOnGround = true;
      }
    }
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** 숲 wall 충돌 — 반경 안으로 강제 (collision). */
  clampToCircle(centerX: number, centerZ: number, radius: number): void {
    const dx = this.group.position.x - centerX;
    const dz = this.group.position.z - centerZ;
    const dist = Math.hypot(dx, dz);
    if (dist > radius) {
      this.group.position.x = centerX + (dx / dist) * radius;
      this.group.position.z = centerZ + (dz / dist) * radius;
    }
  }
}
