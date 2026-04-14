import Phaser from 'phaser';

const SPEED = 200;

export class VillageScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: 'VillageScene' });
  }

  create() {
    this.drawBackground();
    this.createNpc(600, 280);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.player = this.add.text(cx, cy, '\uD83E\uDDD1', { fontSize: '40px' }).setOrigin(0.5);

    this.setupInput();

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    });
  }

  update(_time: number, delta: number) {
    this.movePlayer(delta);
  }

  private drawBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x87c05a).setOrigin(0);

    const g = this.add.graphics();
    g.lineStyle(1, 0x6aaa40, 0.25);
    for (let x = 0; x <= w; x += 64) g.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += 64) g.lineBetween(0, y, w, y);
  }

  private createNpc(x: number, y: number) {
    const npc = this.add.text(x, y, '\uD83C\uDFE1', { fontSize: '48px' }).setOrigin(0.5);
    npc.setInteractive({ useHandCursor: true });
    npc.on('pointerdown', () => {
      this.onNpcClick();
    });

    this.add
      .text(x, y + 36, '\uB9C8\uC744 \uC8FC\uBBFC', {
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#00000099',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
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

    // 캔버스 클릭 시 HTML input blur 처리 (WASD가 채팅으로 가는 문제 방지)
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

    if (left.isDown || this.wasd.left.isDown) this.player.x -= step;
    if (right.isDown || this.wasd.right.isDown) this.player.x += step;
    if (up.isDown || this.wasd.up.isDown) this.player.y -= step;
    if (down.isDown || this.wasd.down.isDown) this.player.y += step;

    const w = this.scale.width;
    const h = this.scale.height;
    this.player.x = Phaser.Math.Clamp(this.player.x, 0, w);
    this.player.y = Phaser.Math.Clamp(this.player.y, 0, h);
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
    if (!keyboard) return;
    keyboard.addCapture(VillageScene.MOVEMENT_KEYS);
  }

  private releaseKeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.removeCapture(VillageScene.MOVEMENT_KEYS);
  }

  private onNpcClick() {
    // TODO: NPC Conversation(1:1 대화 세션) 구현 시 활성화
    console.log('[VillageScene] NPC clicked');
  }
}
