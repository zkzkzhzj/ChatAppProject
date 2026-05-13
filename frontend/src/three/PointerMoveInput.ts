import * as THREE from 'three';

/**
 * canvas pointerdown(마우스/터치) → 캐릭터 이동 target 결로 변환 (Step 1.7).
 *
 * learning 50 결정 — tap-to-move 결로 모바일 대응 + 데스크탑 마우스 동일 동작.
 *
 * 흐름: pointerdown → NDC 좌표 → raycaster + ground plane(y=0) intersect → world (x, z) →
 * 외부 callback(onTap) 에 전달. 호출자(SceneManager) 가 Character.setTouchTarget 호출.
 *
 * 키보드(WASD) 입력과 동시 박혀있어도 충돌 X — Character.update 결 통합 책임.
 */
type TapCallback = (x: number, z: number) => void;

export class PointerMoveInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly getCamera: () => THREE.Camera;
  private readonly onTap: TapCallback;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly ndc = new THREE.Vector2();
  private readonly hitPoint = new THREE.Vector3();
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, getCamera: () => THREE.Camera, onTap: TapCallback) {
    this.canvas = canvas;
    this.getCamera = getCamera;
    this.onTap = onTap;
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.destroyed) return;
    // 마우스 좌클릭만 허용 (우클릭·휠클릭 제외). 터치/펜 결 항상 통과.
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.ndc, this.getCamera());
    if (this.raycaster.ray.intersectPlane(this.plane, this.hitPoint)) {
      this.onTap(this.hitPoint.x, this.hitPoint.z);
    }
  };

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
  }
}
