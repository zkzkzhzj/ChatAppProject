import Phaser from 'phaser';

const SPEED = 200;
const BOUNDS = { x: 800, y: 600 };

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
        this.player = this.add.text(400, 300, '🧑', { fontSize: '40px' }).setOrigin(0.5);
        this.setupInput();
    }

    update(_time: number, delta: number) {
        this.movePlayer(delta);
    }

    private drawBackground() {
        this.add.rectangle(0, 0, BOUNDS.x, BOUNDS.y, 0x87c05a).setOrigin(0);

        const g = this.add.graphics();
        g.lineStyle(1, 0x6aaa40, 0.25);
        for (let x = 0; x <= BOUNDS.x; x += 64) g.lineBetween(x, 0, x, BOUNDS.y);
        for (let y = 0; y <= BOUNDS.y; y += 64) g.lineBetween(0, y, BOUNDS.x, y);
    }

    private createNpc(x: number, y: number) {
        const npc = this.add.text(x, y, '🏡', { fontSize: '48px' }).setOrigin(0.5);
        npc.setInteractive({ useHandCursor: true });
        npc.on('pointerdown', () => this.onNpcClick());

        this.add.text(x, y + 36, '마을 주민', {
            fontSize: '13px',
            color: '#ffffff',
            backgroundColor: '#00000099',
            padding: { x: 6, y: 3 },
        }).setOrigin(0.5);
    }

    private setupInput() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = {
            up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
    }

    private movePlayer(delta: number) {
        const step = SPEED * (delta / 1000);
        const { left, right, up, down } = this.cursors;

        if (left.isDown  || this.wasd.left.isDown)  this.player.x -= step;
        if (right.isDown || this.wasd.right.isDown) this.player.x += step;
        if (up.isDown    || this.wasd.up.isDown)    this.player.y -= step;
        if (down.isDown  || this.wasd.down.isDown)  this.player.y += step;

        this.player.x = Phaser.Math.Clamp(this.player.x, 0, BOUNDS.x);
        this.player.y = Phaser.Math.Clamp(this.player.y, 0, BOUNDS.y);
    }

    private onNpcClick() {
        // Phase 3: 채팅 UI 진입 예정
        console.log('NPC 클릭 — 채팅 연결 예정');
    }
}
