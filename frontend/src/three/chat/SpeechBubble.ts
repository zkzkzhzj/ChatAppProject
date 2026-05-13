import * as THREE from 'three';

/**
 * 캐릭터 머리 위 3D Sprite 말풍선 (Step 1.7, spec D12·D15).
 *
 * THREE.Sprite + CanvasTexture로 한국어 텍스트 렌더 — 카메라 자동 정렬 + 거리 따라 축소.
 * 6초 후 자동 dispose. setText 재호출 시 같은 인스턴스에서 texture redraw + timer 재설정.
 *
 * 한국어 antialias: DPR 2배 canvas + minFilter LinearFilter + Gowun/IBM Plex Sans KR 폰트.
 * 메모리 누수 방지: dispose에서 texture·material 명시 해제.
 */
export const BUBBLE_LIFETIME_MS = 6000;
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 128;
const DPR = 2;
const FONT_SIZE = 32;
const PADDING_X = 28;
const SPRITE_SCALE_X = 3.0;
const SPRITE_SCALE_Y = SPRITE_SCALE_X * (CANVAS_HEIGHT / CANVAS_WIDTH);
const MAX_DISPLAY_CHARS = 22;
const BG_COLOR = 'rgba(252, 248, 240, 0.94)';
const TEXT_COLOR = '#3a2615';
const BORDER_COLOR = 'rgba(58, 38, 21, 0.18)';

export type ExpireCallback = () => void;

export class SpeechBubble {
  readonly sprite: THREE.Sprite;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly material: THREE.SpriteMaterial;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onExpire: ExpireCallback;

  constructor(text: string, onExpire: ExpireCallback) {
    this.onExpire = onExpire;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH * DPR;
    this.canvas.height = CANVAS_HEIGHT * DPR;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false, // 다른 mesh에 가려져도 보이게 (D11 결 정합 — 안식처 결 채팅 우선 가시화)
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(SPRITE_SCALE_X, SPRITE_SCALE_Y, 1);
    this.sprite.renderOrder = 999;

    this.draw(text);
    this.scheduleExpire();
  }

  setText(text: string): void {
    this.draw(text);
    this.scheduleExpire();
  }

  private draw(text: string): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // 매 draw 시 transform 리셋 (재호출 시 누적 방지)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(DPR, DPR);

    // 둥근 사각형 배경
    ctx.fillStyle = BG_COLOR;
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 2;
    this.roundedRect(ctx, 4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 16, 28);
    ctx.fill();
    ctx.stroke();

    // 꼬리 (말풍선 아래쪽 삼각형)
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 12, CANVAS_HEIGHT - 12);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 2);
    ctx.lineTo(CANVAS_WIDTH / 2 + 12, CANVAS_HEIGHT - 12);
    ctx.closePath();
    ctx.fillStyle = BG_COLOR;
    ctx.fill();

    // 텍스트 — 22자 초과 시 말줄임
    const truncated =
      text.length > MAX_DISPLAY_CHARS ? `${text.slice(0, MAX_DISPLAY_CHARS - 1)}…` : text;
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${String(FONT_SIZE)}px "Gowun Dodum", "IBM Plex Sans KR", -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(
      truncated,
      CANVAS_WIDTH / 2,
      (CANVAS_HEIGHT - 14) / 2 + 2,
      CANVAS_WIDTH - PADDING_X * 2,
    );

    this.texture.needsUpdate = true;
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private scheduleExpire(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
    }
    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.onExpire();
    }, BUBBLE_LIFETIME_MS);
  }

  dispose(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.texture.dispose();
    this.material.dispose();
  }
}
