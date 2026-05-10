/**
 * 키보드 입력 — WASD 이동 + Space 점프.
 * Phaser·HTML 포커스 충돌 결 (learning 26) 은 캔버스 click 시 활성화로 처리.
 */
export class InputState {
  private keys = new Set<string>();
  private destroyed = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // input·textarea 에 포커스가 있으면 게임 입력 X (채팅 입력 보호)
    const tag = (e.target as HTMLElement | null)?.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    this.keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  /** 한 프레임 입력 결과 반환. */
  read(): { dx: number; dz: number; jump: boolean } {
    let dx = 0;
    let dz = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dz += 1;
    const jump = this.keys.has('Space');
    return { dx, dz, jump };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
