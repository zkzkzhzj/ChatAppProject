import * as THREE from 'three';

/**
 * 다른 유저 placeholder (Step 1.5 — Step 3 에서 캐릭터 3D 모델로 교체 예정).
 *
 * 자기 캐릭터(`Character`)와 색만 다른 단순 박스. setTarget 으로 받은 좌표를
 * 매 프레임 `update()` 호출 시 lerp 로 점근시킨다 (네트워크 jitter 흡수).
 *
 * spawn/leave 가 잦은 객체라 자체 dispose 메서드 노출 — SceneManager.disposeScene 의
 * 일괄 traverse 와 별개로 즉시 dispose 가능해야 LEAVE 처리에서 GPU 리소스 leak X.
 */
const REMOTE_COLOR = 0x6a8aa3;
const BODY_HEIGHT = 1.4;
export const LERP_FACTOR = 0.15;

export class RemotePlayer {
  readonly group = new THREE.Group();
  private targetX: number;
  private targetZ: number;
  private readonly geometry: THREE.BoxGeometry;
  private readonly material: THREE.MeshLambertMaterial;

  constructor(initialX: number, initialZ: number) {
    this.geometry = new THREE.BoxGeometry(0.6, BODY_HEIGHT, 0.6);
    this.material = new THREE.MeshLambertMaterial({ color: REMOTE_COLOR });
    const body = new THREE.Mesh(this.geometry, this.material);
    body.position.y = BODY_HEIGHT / 2;
    body.castShadow = true;
    this.group.add(body);

    this.group.position.set(initialX, 0, initialZ);
    this.targetX = initialX;
    this.targetZ = initialZ;
  }

  setTarget(x: number, z: number): void {
    this.targetX = x;
    this.targetZ = z;
  }

  /** 매 프레임 호출. lerp 비율 일정 — delta 비독립이지만 60fps 가정으로 충분. */
  update(): void {
    this.group.position.x += (this.targetX - this.group.position.x) * LERP_FACTOR;
    this.group.position.z += (this.targetZ - this.group.position.z) * LERP_FACTOR;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
