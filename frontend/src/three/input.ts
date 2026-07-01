/**
 * 키보드 입력 — WASD 이동 + Space 점프.
 * Scene canvas·HTML 포커스 충돌은 캔버스 click 시 활성화로 처리.
 *
 * window blur · document visibilitychange 시 누른 키 전부 release —
 * 다른 창 / 바탕화면 클릭 / 탭 전환 후 keyup 누락으로 캐릭터가 계속 이동하는
 * 버그 차단 (spec movement-key-stuck-on-blur).
 */
export class InputState {
  private keys = new Set<string>();
  private destroyed = false;
  private cameraElement: HTMLElement | null = null;
  private orbitPointerId: number | null = null;
  private orbitLastX = 0;
  private orbitLastY = 0;
  private orbitStartX = 0;
  private orbitStartY = 0;
  private orbitDragging = false;
  private orbitMode: 'immediate' | 'threshold' = 'immediate';
  private orbitYawDelta = 0;
  private orbitPitchDelta = 0;
  private zoomDelta = 0;
  private pinchPointers = new Map<number, { x: number; y: number }>();
  private pinchLastDistance: number | null = null;
  /** 가상 조이스틱 입력 (Step 1.7 모바일 hybrid). 0 = 비활성. */
  private joystickDx = 0;
  private joystickDz = 0;

  private static readonly ORBIT_DRAG_THRESHOLD_PX = 6;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.release);
    // 우클릭 컨텍스트 메뉴는 window blur 를 발생시키지 않음 (같은 window 내부 popup).
    // contextmenu 이벤트로 직접 release 호출하여 우클릭 후 keyup 누락 방지.
    window.addEventListener('contextmenu', this.release);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // input·textarea 에 포커스가 있으면 게임 입력 X (채팅 입력 보호).
    // e.target 이 Window·Document 일 수도 있어 instanceof 로 좁힘.
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    this.keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  /** 누른 키 전부 clear — blur·visibilitychange·외부 reset 시점에서 호출. */
  release = (): void => {
    this.keys.clear();
    this.orbitPointerId = null;
    this.orbitDragging = false;
    this.orbitYawDelta = 0;
    this.orbitPitchDelta = 0;
    this.zoomDelta = 0;
    this.pinchPointers.clear();
    this.pinchLastDistance = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.release();
  };

  /** 가상 조이스틱 입력 갱신 (VirtualJoystick → InputState). dx/dz ∈ [-1, 1]. */
  setJoystick(dx: number, dz: number): void {
    this.joystickDx = dx;
    this.joystickDz = dz;
  }

  bindCameraElement(element: HTMLElement): void {
    if (this.cameraElement === element) return;
    if (this.cameraElement) {
      this.cameraElement.removeEventListener('pointerdown', this.onPointerDown);
      this.cameraElement.removeEventListener('wheel', this.onWheel);
      this.cameraElement.removeEventListener('contextmenu', this.onContextMenu);
    }
    this.cameraElement = element;
    this.cameraElement.style.touchAction = 'none';
    this.cameraElement.addEventListener('pointerdown', this.onPointerDown);
    this.cameraElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.cameraElement.addEventListener('contextmenu', this.onContextMenu);
  }

  consumeCameraOrbitDelta(): { yaw: number; pitch: number } {
    const delta = { yaw: this.orbitYawDelta, pitch: this.orbitPitchDelta };
    this.orbitYawDelta = 0;
    this.orbitPitchDelta = 0;
    return delta;
  }

  consumeCameraZoomDelta(): number {
    const delta = this.zoomDelta;
    this.zoomDelta = 0;
    return delta;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.pointerType === 'mouse' && e.button !== 2) return;
    if (e.pointerType !== 'mouse' && e.button !== 0) return;
    if (e.button === 2) e.preventDefault();

    if (e.pointerType !== 'mouse') {
      this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinchPointers.size >= 2) {
        this.pinchLastDistance = this.currentPinchDistance();
        this.orbitPointerId = null;
        this.orbitDragging = false;
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
        return;
      }
    }

    if (!e.isPrimary) return;

    this.orbitPointerId = e.pointerId;
    this.orbitStartX = e.clientX;
    this.orbitStartY = e.clientY;
    this.orbitLastX = e.clientX;
    this.orbitLastY = e.clientY;
    this.orbitMode = e.pointerType === 'mouse' ? 'immediate' : 'threshold';
    this.orbitDragging = this.orbitMode === 'immediate';
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.pinchPointers.has(e.pointerId)) {
      this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinchPointers.size >= 2 && this.pinchLastDistance !== null) {
        const nextDistance = this.currentPinchDistance();
        if (nextDistance !== null) {
          this.zoomDelta -= (nextDistance - this.pinchLastDistance) * 4;
          this.pinchLastDistance = nextDistance;
        }
        return;
      }
    }

    if (this.orbitPointerId !== e.pointerId) return;

    const dx = e.clientX - this.orbitLastX;
    const dy = e.clientY - this.orbitLastY;
    this.orbitLastX = e.clientX;
    this.orbitLastY = e.clientY;

    if (!this.orbitDragging) {
      const moved = Math.hypot(e.clientX - this.orbitStartX, e.clientY - this.orbitStartY);
      if (moved < InputState.ORBIT_DRAG_THRESHOLD_PX) return;
      this.orbitDragging = true;
    }

    this.orbitYawDelta += dx;
    this.orbitPitchDelta += dy;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.pinchPointers.delete(e.pointerId)) {
      this.pinchLastDistance = this.pinchPointers.size >= 2 ? this.currentPinchDistance() : null;
      if (this.pinchPointers.size === 0 && this.orbitPointerId === null) {
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
      }
    }

    if (this.orbitPointerId !== e.pointerId) return;

    this.orbitPointerId = null;
    this.orbitDragging = false;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onWheel = (e: WheelEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    this.zoomDelta += e.deltaY;
  };

  private currentPinchDistance(): number | null {
    const points = [...this.pinchPointers.values()];
    if (points.length < 2) return null;
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** 한 프레임 입력 결과 반환. 키보드 우선, 키보드 없으면 조이스틱. */
  read(): { dx: number; dz: number; jump: boolean } {
    let dx = 0;
    let dz = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dz += 1;
    // 키보드 없을 때만 조이스틱 결 반영 — 두 입력 합치면 방향 결 모호
    if (dx === 0 && dz === 0) {
      dx = this.joystickDx;
      dz = this.joystickDz;
    }
    const jump = this.keys.has('Space');
    return { dx, dz, jump };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.cameraElement) {
      this.cameraElement.removeEventListener('pointerdown', this.onPointerDown);
      this.cameraElement.removeEventListener('wheel', this.onWheel);
      this.cameraElement.removeEventListener('contextmenu', this.onContextMenu);
      this.cameraElement = null;
    }
    this.orbitPointerId = null;
    this.orbitDragging = false;
    this.pinchPointers.clear();
    this.pinchLastDistance = null;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.release);
    window.removeEventListener('contextmenu', this.release);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
