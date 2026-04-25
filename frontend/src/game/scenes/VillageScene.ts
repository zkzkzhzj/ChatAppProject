import Phaser from 'phaser';

import type { PositionBroadcast } from '@/lib/websocket/stompClient';

import {
  onMyTypingUpdate,
  onNpcTypingUpdate,
  onPositionUpdate,
  onTypingUpdate,
} from '../../lib/websocket/positionBridge';
import type { TypingBroadcast } from '../../lib/websocket/stompClient';
import { sendPosition } from '../../lib/websocket/stompClient';

const SPEED = 160;
const PLAYER_RADIUS = 14;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const CAMERA_LERP = 0.08;
const GRASS_DOT_COUNT = 800;
const PATH_TEXTURE_COUNT = 100;
const FLOWER_COUNT = 60;
const POSITION_SEND_INTERVAL = 100;
const HEARTBEAT_INTERVAL = 5_000;
const OTHER_PLAYER_LERP = 0.15;

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

  /** 다른 유저들의 렌더링 컨테이너. key = displayId */
  private otherPlayers = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      targetX: number;
      targetY: number;
      lastSeen: number;
      bubble?: Phaser.GameObjects.Container;
    }
  >();
  private lastPositionSentAt = 0;
  private lastHeartbeatAt = 0;
  private lastSentX = -1;
  private lastSentY = -1;
  private unsubscribePosition: (() => void) | null = null;
  private unsubscribeTyping: (() => void) | null = null;
  private unsubscribeNpcTyping: (() => void) | null = null;
  private unsubscribeMyTyping: (() => void) | null = null;
  private myDisplayId: string | null = null;
  private npcContainer: Phaser.GameObjects.Container | null = null;
  private npcBubble: Phaser.GameObjects.Container | null = null;
  private myBubble: Phaser.GameObjects.Container | null = null;
  /** 캔버스 탭/클릭으로 지정된 이동 목표 (월드 좌표). 모바일 터치 이동(F-1)용. */
  private moveTarget: { x: number; y: number } | null = null;
  private static readonly STALE_PLAYER_MS = 30_000;

  constructor() {
    super({ key: 'VillageScene' });
  }

  /** 에셋 사용 가능 여부. 로드 실패 시 프로시저럴 배경만 사용. */
  private assetsLoaded = false;

  preload() {
    this.load.image('tree1', '/assets/village/tree1.png');
    this.load.image('tree2', '/assets/village/tree2.png');
    this.load.image('bench', '/assets/village/bench.png');
    this.load.image('lamp', '/assets/village/lamp.png');
    this.load.image('tent', '/assets/village/tent.png');

    this.load.on('complete', () => {
      this.assetsLoaded = this.textures.exists('tree1');
    });
  }

  create() {
    // 월드 경계 설정
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawGround();
    if (this.assetsLoaded) {
      this.placeDecorations();
    }
    this.createNpc(WORLD_WIDTH * 0.65, WORLD_HEIGHT * 0.35);

    // 플레이어 — 월드 중앙에서 시작
    this.player = this.createCharacter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 0x5b8c5a, '나');

    // 카메라가 플레이어를 따라감
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);

    this.setupInput();

    // 위치 브릿지 구독
    this.unsubscribePosition = onPositionUpdate((pos) => {
      this.handleRemotePosition(pos);
    });

    // 내 displayId 결정 (토큰에서 추출)
    this.resolveMyDisplayId();

    // 다른 유저 타이핑 구독
    this.unsubscribeTyping = onTypingUpdate((data) => {
      this.handleRemoteTyping(data);
    });

    // NPC 타이핑 구독
    this.unsubscribeNpcTyping = onNpcTypingUpdate((typing) => {
      this.showNpcBubble(typing);
    });

    // 내 타이핑 구독 (채팅 입력창 포커스)
    this.unsubscribeMyTyping = onMyTypingUpdate((typing) => {
      this.showMyBubble(typing);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseKeys();
      this.unsubscribePosition?.();
      this.unsubscribeTyping?.();
      this.unsubscribeNpcTyping?.();
      this.unsubscribeMyTyping?.();
    });

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    });
  }

  update(time: number, delta: number) {
    this.movePlayer(delta);
    this.sendPositionThrottled(time);
    this.interpolateOtherPlayers();
    this.sweepStalePlayers();
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
    this.npcContainer = this.createCharacter(x, y, 0xc4884d, '마을 주민');
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // 모바일 터치 이동(F-1) — 캔버스 탭/클릭한 월드 좌표를 이동 목표로 설정.
      // DOM 측 UI 영역(chat overlay 의 pointer-events-auto 자식)은 Phaser 까지 도달하지 않으므로
      // 본 핸들러는 캔버스 빈 공간/배경 클릭만 받는다. UI 클릭은 자연 분리됨.
      this.moveTarget = {
        x: Phaser.Math.Clamp(pointer.worldX, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS),
        y: Phaser.Math.Clamp(pointer.worldY, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS),
      };
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

    if (dx !== 0 || dy !== 0) {
      // 키보드 입력은 터치 이동 목표보다 우선한다 — 사용자가 키 누르면 즉시 손수 조작으로 전환.
      this.moveTarget = null;
      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      this.player.x += dx * step;
      this.player.y += dy * step;
    } else if (this.moveTarget) {
      // F-1 모바일 터치 이동 — 캔버스 탭으로 지정된 좌표 향해 정규화 속도로 진행.
      const tx = this.moveTarget.x - this.player.x;
      const ty = this.moveTarget.y - this.player.y;
      const dist = Math.hypot(tx, ty);
      if (dist <= step) {
        this.player.x = this.moveTarget.x;
        this.player.y = this.moveTarget.y;
        this.moveTarget = null;
      } else {
        this.player.x += (tx / dist) * step;
        this.player.y += (ty / dist) * step;
      }
    }

    // 월드 경계 내로 제한
    this.player.x = Phaser.Math.Clamp(this.player.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    this.player.y = Phaser.Math.Clamp(this.player.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    // Y좌표 기반 depth — 아래에 있는 캐릭터가 앞에 그려짐
    this.player.setDepth(this.player.y);
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

  // --- 위치 공유 ---

  private resolveMyDisplayId() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      this.myDisplayId = null;
      return;
    }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload: { role: string; sub: string } = JSON.parse(atob(base64)) as {
        role: string;
        sub: string;
      };
      this.myDisplayId = payload.role === 'GUEST' ? payload.sub : `user-${payload.sub}`;
    } catch {
      this.myDisplayId = null;
    }
  }

  private sendPositionThrottled(time: number) {
    if (time - this.lastPositionSentAt < POSITION_SEND_INTERVAL) return;

    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const moved = x !== this.lastSentX || y !== this.lastSentY;
    const heartbeatDue = time - this.lastHeartbeatAt >= HEARTBEAT_INTERVAL;

    if (!moved && !heartbeatDue) return;

    this.lastPositionSentAt = time;
    this.lastSentX = x;
    this.lastSentY = y;
    if (heartbeatDue) this.lastHeartbeatAt = time;
    sendPosition(x, y);
  }

  private handleRemotePosition(pos: PositionBroadcast) {
    // 내 위치는 무시
    if (pos.id === this.myDisplayId) return;

    if (pos.userType === 'LEAVE') {
      this.removeOtherPlayer(pos.id);
      return;
    }

    const existing = this.otherPlayers.get(pos.id);
    if (existing) {
      existing.targetX = pos.x;
      existing.targetY = pos.y;
      existing.lastSeen = Date.now();
    } else {
      this.addOtherPlayer(pos);
    }
  }

  private addOtherPlayer(pos: PositionBroadcast) {
    const color = pos.userType === 'GUEST' ? 0x9b8bb4 : 0x6b8cae;
    const label = pos.userType === 'GUEST' ? '손님' : '이웃';
    const container = this.createCharacter(pos.x, pos.y, color, label);

    this.otherPlayers.set(pos.id, {
      container,
      targetX: pos.x,
      targetY: pos.y,
      lastSeen: Date.now(),
    });
  }

  private removeOtherPlayer(id: string) {
    const entry = this.otherPlayers.get(id);
    if (!entry) return;
    // typing 말풍선이 남아 고아 객체가 되지 않도록 함께 정리한다 (F-2).
    entry.bubble?.destroy();
    entry.container.destroy();
    this.otherPlayers.delete(id);
  }

  private interpolateOtherPlayers() {
    for (const entry of this.otherPlayers.values()) {
      const { container, targetX, targetY } = entry;
      container.x += (targetX - container.x) * OTHER_PLAYER_LERP;
      container.y += (targetY - container.y) * OTHER_PLAYER_LERP;
      container.setDepth(container.y);
      if (entry.bubble) {
        entry.bubble.setPosition(container.x, container.y - PLAYER_RADIUS - 18);
      }
    }
    if (this.npcBubble && this.npcContainer) {
      this.npcBubble.setPosition(this.npcContainer.x, this.npcContainer.y - PLAYER_RADIUS - 18);
    }
    if (this.myBubble) {
      this.myBubble.setPosition(this.player.x, this.player.y - PLAYER_RADIUS - 18);
    }
  }

  /** 30초 이상 업데이트 없는 유저를 제거 (LEAVE 누락 방어) */
  private sweepStalePlayers() {
    const now = Date.now();
    for (const [id, entry] of this.otherPlayers) {
      if (now - entry.lastSeen > VillageScene.STALE_PLAYER_MS) {
        // typing 말풍선이 남아 고아 객체가 되지 않도록 함께 정리한다 (F-2).
        entry.bubble?.destroy();
        entry.container.destroy();
        this.otherPlayers.delete(id);
      }
    }
  }

  // --- 말풍선 ---

  /** 애니메이션 ... 말풍선 컨테이너 생성 */
  private createBubble(x: number, y: number): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(0xfaf6f0, 0.93);
    bg.fillRoundedRect(-20, -14, 40, 20, 8);
    bg.lineStyle(1, 0xc4a56e, 0.4);
    bg.strokeRoundedRect(-20, -14, 40, 20, 8);

    const dots: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(-8 + i * 8, -4, 3, 0x8b7355);
      dots.push(dot);
      this.tweens.add({
        targets: dot,
        y: { from: -4, to: -8 },
        alpha: { from: 1, to: 0.4 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        delay: i * 150,
        ease: 'Sine.easeInOut',
      });
    }

    const container = this.add.container(x, y - PLAYER_RADIUS - 18, [bg, ...dots]);
    container.setDepth(9999);
    return container;
  }

  private showNpcBubble(typing: boolean) {
    if (typing) {
      if (!this.npcBubble && this.npcContainer) {
        this.npcBubble = this.createBubble(this.npcContainer.x, this.npcContainer.y);
      }
    } else {
      this.npcBubble?.destroy();
      this.npcBubble = null;
    }
  }

  showMyBubble(typing: boolean) {
    if (typing) {
      this.myBubble ??= this.createBubble(this.player.x, this.player.y);
    } else {
      this.myBubble?.destroy();
      this.myBubble = null;
    }
  }

  private handleRemoteTyping(data: TypingBroadcast) {
    if (data.id === this.myDisplayId) return;
    const entry = this.otherPlayers.get(data.id);
    if (!entry) return;

    if (data.typing) {
      entry.bubble ??= this.createBubble(entry.container.x, entry.container.y);
    } else {
      entry.bubble?.destroy();
      entry.bubble = undefined;
    }
  }
}
