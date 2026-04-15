import Phaser from 'phaser';

const SPEED = 160;
const PLAYER_RADIUS = 14;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const CAMERA_LERP = 0.08;
const GRASS_DOT_COUNT = 800;
const PATH_TEXTURE_COUNT = 100;
const FLOWER_COUNT = 60;

/**
 * 마을 씬.
 *
 * 캐릭터: 플레이스홀더 (원형 + 이름표). 에셋 확보 후 스프라이트로 교체 예정.
 * 배경: Modern Exteriors 에셋 (나무, 벤치, 가로등) + 프로시저럴 풀밭/흙길.
 * 카메라: 플레이어를 중앙에 고정하고 월드를 따라 이동.
 */
export class VillageScene extends Phaser.Scene {
  private isMovementKeysCaptured = false;
  private player!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: 'VillageScene' });
  }

  preload() {
    this.load.image('tree1', '/assets/village/tree1.png');
    this.load.image('tree2', '/assets/village/tree2.png');
    this.load.image('bench', '/assets/village/bench.png');
    this.load.image('lamp', '/assets/village/lamp.png');
    this.load.image('tent', '/assets/village/tent.png');
  }

  create() {
    // 월드 경계 설정
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawGround();
    this.placeDecorations();
    this.createNpc(WORLD_WIDTH * 0.65, WORLD_HEIGHT * 0.35);

    // 플레이어 — 월드 중앙에서 시작
    this.player = this.createCharacter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 0x5b8c5a, '나');

    // 카메라가 플레이어를 따라감
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);

    this.setupInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseKeys();
    });

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    });
  }

  update(_time: number, delta: number) {
    this.movePlayer(delta);
  }

  /** 풀밭 + 흙길 배경 */
  private drawGround() {
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;

    // 풀밭 기본
    this.add.rectangle(0, 0, w, h, 0x7eb86a).setOrigin(0);

    const g = this.add.graphics();

    // 풀밭 질감
    const rng = new Phaser.Math.RandomDataGenerator(['village']);
    for (let i = 0; i < GRASS_DOT_COUNT; i++) {
      const gx = rng.between(0, w);
      const gy = rng.between(0, h);
      const shade = rng.pick([0x6aaa40, 0x8bc96a, 0x5d9a3a]);
      g.fillStyle(shade, 0.3);
      g.fillCircle(gx, gy, rng.between(2, 5));
    }

    // 흙길 — 가로 (메인 도로)
    const mainPathY = h * 0.45;
    const pathH = 64;
    g.fillStyle(0xc4a56e, 0.7);
    g.fillRect(0, mainPathY, w, pathH);
    g.lineStyle(2, 0xb08840, 0.3);
    g.strokeRect(0, mainPathY, w, pathH);

    // 흙길 — 세로 (마을 광장으로 이어지는 길)
    const crossPathX = w * 0.5 - 32;
    g.fillStyle(0xc4a56e, 0.7);
    g.fillRect(crossPathX, mainPathY - 200, 64, 460);

    // 마을 광장 (교차점)
    const plazaX = w * 0.5;
    const plazaY = mainPathY + pathH / 2;
    g.fillStyle(0xc4a56e, 0.5);
    g.fillCircle(plazaX, plazaY, 80);
    g.fillStyle(0xb8975a, 0.3);
    g.fillCircle(plazaX, plazaY, 60);

    // 흙길 질감
    for (let i = 0; i < PATH_TEXTURE_COUNT; i++) {
      const px = rng.between(0, w);
      const py = rng.between(mainPathY + 4, mainPathY + pathH - 4);
      g.fillStyle(0xb8975a, 0.2);
      g.fillCircle(px, py, rng.between(1, 3));
    }

    // 꽃 장식
    const flowerColors = [0xf4a460, 0xe07a5f, 0xf2a58f, 0xffd700, 0xff8c94, 0xdda0dd];
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const fx = rng.between(20, w - 20);
      const fy = rng.between(20, h - 20);
      if (fy > mainPathY - 15 && fy < mainPathY + pathH + 15) continue;
      if (fx > crossPathX - 15 && fx < crossPathX + 80) continue;
      const color = rng.pick(flowerColors);
      g.fillStyle(color, 0.7);
      g.fillCircle(fx, fy, 3);
      g.fillStyle(0x4a7c3b, 0.5);
      g.fillCircle(fx - 1, fy + 3, 2);
    }

    // 월드 경계 울타리 (시각적 표시)
    g.lineStyle(3, 0x8b6914, 0.4);
    g.strokeRect(8, 8, w - 16, h - 16);
  }

  /** 에셋 장식물 배치 */
  private placeDecorations() {
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    const pathY = h * 0.45;
    const rng = new Phaser.Math.RandomDataGenerator(['decorations']);

    // 나무 — 상단 숲 영역
    const treeTopPositions = [
      { x: 0.05, y: 0.08 },
      { x: 0.15, y: 0.06 },
      { x: 0.25, y: 0.1 },
      { x: 0.38, y: 0.07 },
      { x: 0.55, y: 0.09 },
      { x: 0.68, y: 0.06 },
      { x: 0.78, y: 0.11 },
      { x: 0.88, y: 0.07 },
      { x: 0.95, y: 0.1 },
      { x: 0.1, y: 0.18 },
      { x: 0.35, y: 0.2 },
      { x: 0.72, y: 0.17 },
      { x: 0.9, y: 0.2 },
    ];
    for (const pos of treeTopPositions) {
      const tex = rng.pick(['tree1', 'tree2']);
      this.add
        .image(w * pos.x, h * pos.y, tex)
        .setScale(2)
        .setOrigin(0.5, 0.8);
    }

    // 나무 — 하단
    const treeBottomPositions = [
      { x: 0.08, y: 0.82 },
      { x: 0.22, y: 0.85 },
      { x: 0.4, y: 0.88 },
      { x: 0.6, y: 0.82 },
      { x: 0.75, y: 0.86 },
      { x: 0.92, y: 0.84 },
      { x: 0.12, y: 0.92 },
      { x: 0.5, y: 0.94 },
      { x: 0.85, y: 0.92 },
    ];
    for (const pos of treeBottomPositions) {
      const tex = rng.pick(['tree1', 'tree2']);
      this.add
        .image(w * pos.x, h * pos.y, tex)
        .setScale(2)
        .setOrigin(0.5, 0.8);
    }

    // 벤치 — 길 옆
    this.add
      .image(w * 0.2, pathY - 12, 'bench')
      .setScale(2)
      .setOrigin(0.5, 1);
    this.add
      .image(w * 0.65, pathY - 12, 'bench')
      .setScale(2)
      .setOrigin(0.5, 1);
    this.add
      .image(w * 0.4, pathY + 76, 'bench')
      .setScale(2)
      .setOrigin(0.5, 0);
    this.add
      .image(w * 0.8, pathY + 76, 'bench')
      .setScale(2)
      .setOrigin(0.5, 0);

    // 가로등 — 길을 따라
    const lampPositions = [0.12, 0.3, 0.5, 0.7, 0.88];
    for (const lx of lampPositions) {
      this.add
        .image(w * lx, pathY - 8, 'lamp')
        .setScale(2)
        .setOrigin(0.5, 1);
    }

    // 텐트 — 오른쪽 하단 캠핑 영역
    this.add
      .image(w * 0.82, h * 0.72, 'tent')
      .setScale(2)
      .setOrigin(0.5, 0.8);
    this.add
      .image(w * 0.72, h * 0.75, 'tent')
      .setScale(2)
      .setOrigin(0.5, 0.8)
      .setFlipX(true);
  }

  /** 플레이스홀더 캐릭터 생성 */
  private createCharacter(
    x: number,
    y: number,
    color: number,
    name: string,
  ): Phaser.GameObjects.Container {
    const circle = this.add.circle(0, 0, PLAYER_RADIUS, color);
    circle.setStrokeStyle(2, 0xfaf6f0);

    const eyeL = this.add.circle(-4, -3, 2, 0xfaf6f0);
    const eyeR = this.add.circle(4, -3, 2, 0xfaf6f0);

    const label = this.add
      .text(0, PLAYER_RADIUS + 6, name, {
        fontSize: '11px',
        fontFamily: '"Gowun Dodum", serif',
        color: '#5c4a3a',
        backgroundColor: '#faf6f0cc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 0);

    return this.add.container(x, y, [circle, eyeL, eyeR, label]);
  }

  private createNpc(x: number, y: number) {
    this.createCharacter(x, y, 0xc4884d, '마을 주민');
    const hitArea = this.add.circle(x, y, PLAYER_RADIUS + 4);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.setAlpha(0.001);
    hitArea.on('pointerdown', () => {
      this.onNpcClick();
    });
  }

  private setupInput() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.on('pointerdown', () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  }

  private movePlayer(delta: number) {
    const el = document.activeElement;
    const uiHasFocus = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    if (uiHasFocus) {
      this.releaseKeys();
      return;
    }
    this.captureKeys();

    const step = SPEED * (delta / 1000);
    const { left, right, up, down } = this.cursors;

    let dx = 0;
    let dy = 0;
    if (left.isDown || this.wasd.left.isDown) dx -= 1;
    if (right.isDown || this.wasd.right.isDown) dx += 1;
    if (up.isDown || this.wasd.up.isDown) dy -= 1;
    if (down.isDown || this.wasd.down.isDown) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    this.player.x += dx * step;
    this.player.y += dy * step;

    // 월드 경계 내로 제한
    this.player.x = Phaser.Math.Clamp(this.player.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    this.player.y = Phaser.Math.Clamp(this.player.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  }

  private static readonly MOVEMENT_KEYS = [
    Phaser.Input.Keyboard.KeyCodes.W,
    Phaser.Input.Keyboard.KeyCodes.A,
    Phaser.Input.Keyboard.KeyCodes.S,
    Phaser.Input.Keyboard.KeyCodes.D,
    Phaser.Input.Keyboard.KeyCodes.UP,
    Phaser.Input.Keyboard.KeyCodes.DOWN,
    Phaser.Input.Keyboard.KeyCodes.LEFT,
    Phaser.Input.Keyboard.KeyCodes.RIGHT,
  ];

  private captureKeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard || this.isMovementKeysCaptured) return;
    keyboard.addCapture(VillageScene.MOVEMENT_KEYS);
    this.isMovementKeysCaptured = true;
  }

  private releaseKeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.removeCapture(VillageScene.MOVEMENT_KEYS);
    this.isMovementKeysCaptured = false;
  }

  private onNpcClick() {
    // TODO: NPC 1:1 대화 세션 — 클릭 시 채팅 모달 열기
    console.log('[VillageScene] NPC clicked');
  }
}
