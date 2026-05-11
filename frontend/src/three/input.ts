/**
 * 키보드 입력 — WASD 이동 + Space 점프.
 * Phaser·HTML 포커스 충돌 (learning 26) 은 캔버스 click 시 활성화로 처리.
 *
 * window blur · document visibilitychange 시 누른 키 전부 release —
 * 다른 창 / 바탕화면 클릭 / 탭 전환 후 keyup 누락으로 캐릭터가 계속 이동하는
 * 버그 차단 (spec movement-key-stuck-on-blur).
 */
export class InputState {
  private keys = new Set<string>();
  private destroyed = false;

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
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
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
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.release();
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
    window.removeEventListener('blur', this.release);
    window.removeEventListener('contextmenu', this.release);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
