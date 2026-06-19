import * as THREE from 'three';

import type { PositionBroadcast } from '@/lib/websocket/realtimeTypes';
import type { Suggestion, VillageDashboard } from '@/types/village-board';

import { Character } from '../character/Character';
import { RemotePlayer } from '../character/RemotePlayer';
import { CAMERA, VILLAGE } from '../constants';
import { applyWarmLighting } from '../lighting';
import { buildVillageDecor, type VillageDecor } from './villageDecor';

/**
 * 마을 Scene — 입구·캠프파이어·연못·도서관 세로 구도 (사용자 결, 2026-05-10).
 * Step 1.5: 다른 유저 placeholder (RemotePlayer) 동기화 추가.
 * Visual pass (2026-06-12): 데코 풀 패스 (villageDecor) + 나무 다양화 + 도서관 창문
 * + 유저 = 마을 주민 (Character/RemotePlayer 가 displayId 결정적 배정).
 */
export class VillageScene {
  readonly scene = new THREE.Scene();
  readonly character: Character;
  readonly libraryDoor: THREE.Vector3;
  /** 다른 유저 placeholder — key = displayId. spec §2.2 Out: 도서관 진입 유저는 표시 X. */
  private remotePlayers = new Map<string, RemotePlayer>();
  private readonly decor: VillageDecor;
  private readonly dashboardBoard = new THREE.Vector3(-4.8, 0, VILLAGE.ENTRY_Z - 11);
  private readonly suggestionBoard = new THREE.Vector3(4.8, 0, VILLAGE.ENTRY_Z - 11);
  private dashboardBoardTexture: THREE.CanvasTexture | null = null;
  private suggestionBoardTexture: THREE.CanvasTexture | null = null;
  private elapsed = 0;
  private cameraYaw: number = CAMERA.ORBIT_INITIAL_YAW;
  private cameraPitch: number = CAMERA.ORBIT_INITIAL_PITCH;
  private cameraDistance: number = Math.cos(CAMERA.ORBIT_INITIAL_PITCH) * CAMERA.DISTANCE;
  /** 모닥불 불꽃 3겹 — updateAmbient 에서 일렁임 (D11: 저주파, 점멸 금지). */
  private readonly flames: THREE.Mesh[] = [];

  constructor() {
    applyWarmLighting(this.scene);

    this.buildGround();
    this.buildPond();
    this.buildCampfire();
    this.buildLibrary();
    this.buildCommunityBoards();
    this.buildForestWall();
    this.decor = buildVillageDecor(this.scene);

    this.character = new Character(new THREE.Vector3(0, 0, VILLAGE.ENTRY_Z));
    this.scene.add(this.character.group);

    this.libraryDoor = new THREE.Vector3(0, 0, VILLAGE.LIBRARY_Z + 2);
  }

  /** 살아있는 디테일 (불꽃·불씨·물결·반딧불) 진행 — SceneManager tick 에서 마을 렌더 시 호출. */
  updateAmbient(delta: number): void {
    this.elapsed += delta;
    this.decor.update(this.elapsed);

    // 불꽃 일렁임 — 겹마다 위상 어긋난 호흡 + 미세한 좌우 흔들림
    for (let i = 0; i < this.flames.length; i += 1) {
      const flame = this.flames[i];
      const phase = i * 2.1;
      flame.scale.set(
        1 + Math.sin(this.elapsed * 6.3 + phase) * 0.07,
        1 + Math.sin(this.elapsed * 4.7 + phase) * 0.12,
        1 + Math.cos(this.elapsed * 5.9 + phase) * 0.07,
      );
      flame.rotation.y = Math.sin(this.elapsed * 1.3 + phase) * 0.3;
    }
  }

  private buildGround(): void {
    const groundGeometry = new THREE.CircleGeometry(VILLAGE.FOREST_WALL_RADIUS + 2, 64);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8aa463 }); // 따뜻한 풀 톤
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 입구 길 (캐릭터 spawn 결로 자연스럽게 안내)
    const pathGeometry = new THREE.PlaneGeometry(2.5, VILLAGE.ENTRY_Z - VILLAGE.LIBRARY_Z + 4);
    const pathMaterial = new THREE.MeshLambertMaterial({ color: 0xc9a97a }); // 흙 길
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, (VILLAGE.ENTRY_Z + VILLAGE.LIBRARY_Z) / 2);
    path.receiveShadow = true;
    this.scene.add(path);
  }

  private buildPond(): void {
    const { POND_X, POND_Z, POND_RADIUS } = VILLAGE;

    // 얕은 물 (가장자리 — 밝은 회청록)
    const shallow = new THREE.Mesh(
      new THREE.CircleGeometry(POND_RADIUS, 48),
      new THREE.MeshLambertMaterial({ color: 0x71a7bd, transparent: true, opacity: 0.92 }),
    );
    shallow.rotation.x = -Math.PI / 2;
    shallow.position.set(POND_X, 0.02, POND_Z);
    shallow.receiveShadow = true;
    this.scene.add(shallow);

    // 깊은 물 (중심 — 어두운 톤, 두 단계 색으로 깊이감)
    const deep = new THREE.Mesh(
      new THREE.CircleGeometry(POND_RADIUS * 0.55, 40),
      new THREE.MeshLambertMaterial({ color: 0x4a7e96, transparent: true, opacity: 0.95 }),
    );
    deep.rotation.x = -Math.PI / 2;
    deep.position.set(POND_X, 0.025, POND_Z);
    this.scene.add(deep);

    // 연못 가장자리 (모래톤 링 — 물과 잔디 경계를 부드럽게)
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(POND_RADIUS, POND_RADIUS + 0.8, 48),
      new THREE.MeshLambertMaterial({ color: 0xd6c39a }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(POND_X, 0.015, POND_Z);
    this.scene.add(rim);
    // 부들·물가 돌·수련잎·물결은 villageDecor 가 담당
  }

  private buildCampfire(): void {
    const fireZ = VILLAGE.CAMPFIRE_Z;

    // 돌 둘레 (10개 — 불자리 경계)
    const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x8d8579 });
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMaterial);
      stone.position.set(Math.cos(angle) * 1.1, 0.12, fireZ + Math.sin(angle) * 1.1);
      stone.rotation.set(i, i * 2, 0);
      stone.scale.y = 0.7;
      stone.castShadow = true;
      this.scene.add(stone);
    }

    // 장작 5개 (방사형으로 기대 세움)
    const logMaterial = new THREE.MeshLambertMaterial({ color: 0x5e3a20 });
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3, 6), logMaterial);
      log.position.set(Math.cos(angle) * 0.35, 0.45, fireZ + Math.sin(angle) * 0.35);
      // 윗단이 중심으로 모이도록 기울임 (인디언 티피 쌓기)
      log.rotation.set(Math.sin(angle) * 0.65, 0, -Math.cos(angle) * 0.65);
      log.castShadow = true;
      this.scene.add(log);
    }

    // 불꽃 3겹 (바깥 진한 주황 → 가운데 주황 → 심지 노랑) — updateAmbient 가 일렁임
    const flameSpecs = [
      { r: 0.5, h: 1.1, y: 0.75, color: 0xe85d1a, emissive: 0xd94f0a, intensity: 0.7 },
      { r: 0.34, h: 0.85, y: 0.72, color: 0xff9434, emissive: 0xff7a1a, intensity: 0.9 },
      { r: 0.19, h: 0.6, y: 0.68, color: 0xffd97a, emissive: 0xffc24a, intensity: 1.0 },
    ];
    for (const spec of flameSpecs) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(spec.r, spec.h, 8),
        new THREE.MeshLambertMaterial({
          color: spec.color,
          emissive: spec.emissive,
          emissiveIntensity: spec.intensity,
          transparent: true,
          opacity: 0.92,
        }),
      );
      flame.position.set(0, spec.y, fireZ);
      this.scene.add(flame);
      this.flames.push(flame);
    }

    // 둘러앉는 그루터기 의자 4개 (모닥불을 바라보는 원형 배치)
    const stumpMaterial = new THREE.MeshLambertMaterial({ color: 0x8b6f4e });
    const stumpTop = new THREE.MeshLambertMaterial({ color: 0xb59a72 });
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const sx = Math.cos(angle) * 2.3;
      const sz = fireZ + Math.sin(angle) * 2.3;
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.5, 10), stumpMaterial);
      stump.position.set(sx, 0.25, sz);
      stump.castShadow = true;
      this.scene.add(stump);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 10), stumpTop);
      top.position.set(sx, 0.52, sz);
      this.scene.add(top);
    }
  }

  private buildLibrary(): void {
    // 도서관 (큰 박스, 진입 트리거)
    const libraryBody = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0xc9966b }), // warm 베이지
    );
    libraryBody.position.set(0, 2, VILLAGE.LIBRARY_Z);
    libraryBody.castShadow = true;
    libraryBody.receiveShadow = true;
    this.scene.add(libraryBody);

    // 지붕 (Cone)
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6, 2.5, 4),
      new THREE.MeshLambertMaterial({ color: 0x8a4a2a }), // 진한 적갈
    );
    roof.position.set(0, 5.25, VILLAGE.LIBRARY_Z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.scene.add(roof);

    // 입구 (어두운 박스 — 진입 트리거 시각 결)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x3a2615 }),
    );
    door.position.set(0, 1.1, VILLAGE.LIBRARY_Z + 3.05);
    this.scene.add(door);

    // 도서관 표지판
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.6, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xe8d5a3 }),
    );
    sign.position.set(0, 3.2, VILLAGE.LIBRARY_Z + 3.05);
    this.scene.add(sign);

    // 창문 2개 — 안에 불이 켜진 따뜻한 노란빛 (들어가 보고 싶은 신호)
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: 0xffe9b0,
      emissive: 0xffc966,
      emissiveIntensity: 0.7,
    });
    for (const x of [-2.4, 2.4]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.08), windowMaterial);
      pane.position.set(x, 2.2, VILLAGE.LIBRARY_Z + 3.04);
      this.scene.add(pane);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.5, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x6b4a2e }),
      );
      frame.position.set(x, 2.2, VILLAGE.LIBRARY_Z + 3.0);
      this.scene.add(frame);
    }

    // 굴뚝 + 박공의 작은 원형 창 — 실루엣에 집의 결 부여
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.6, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x9a6a4a }),
    );
    chimney.position.set(2.6, 5.6, VILLAGE.LIBRARY_Z - 1);
    chimney.castShadow = true;
    this.scene.add(chimney);

    const roundWindow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), windowMaterial);
    roundWindow.position.set(0, 4.6, VILLAGE.LIBRARY_Z + 3.06);
    this.scene.add(roundWindow);
  }

  private buildCommunityBoards(): void {
    this.dashboardBoardTexture = this.createDashboardBoardTexture(null);
    this.suggestionBoardTexture = this.createSuggestionBoardTexture(null);
    this.buildBoard(this.dashboardBoard, this.dashboardBoardTexture);
    this.buildBoard(this.suggestionBoard, this.suggestionBoardTexture);
  }

  private buildBoard(position: THREE.Vector3, texture: THREE.CanvasTexture): void {
    const postMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4a2e });
    const boardMaterial = new THREE.MeshLambertMaterial({ color: 0xb8794b });
    const edgeMaterial = new THREE.MeshLambertMaterial({ color: 0x4d3320 });

    for (const x of [-1.9, 1.9]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.15, 0.26), postMaterial);
      post.position.set(position.x + x, 1.45, position.z);
      post.castShadow = true;
      this.scene.add(post);
    }

    const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.35, 0.22), boardMaterial);
    board.position.set(position.x, 2.35, position.z + 0.03);
    board.castShadow = true;
    this.scene.add(board);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 0.28), edgeMaterial);
    cap.position.set(position.x, 3.62, position.z + 0.06);
    cap.castShadow = true;
    this.scene.add(cap);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(4.08, 1.9),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
      }),
    );
    label.position.set(position.x, 2.38, position.z + 0.16);
    this.scene.add(label);
  }

  setCommunityBoardData(
    dashboard: VillageDashboard | null,
    latestSuggestion: Suggestion | null,
  ): void {
    this.updateTexture(this.dashboardBoardTexture, this.createDashboardBoardTexture(dashboard));
    this.updateTexture(
      this.suggestionBoardTexture,
      this.createSuggestionBoardTexture(latestSuggestion),
    );
  }

  private updateTexture(target: THREE.CanvasTexture | null, source: THREE.CanvasTexture): void {
    if (!target) {
      source.dispose();
      return;
    }

    target.image = source.image;
    target.needsUpdate = true;
    source.dispose();
  }

  private createDashboardBoardTexture(dashboard: VillageDashboard | null): THREE.CanvasTexture {
    return this.createBoardTexture((ctx, canvas) => {
      drawBoardBase(ctx, canvas);
      drawCenteredText(
        ctx,
        '오늘의 방문자',
        canvas.width / 2,
        76,
        '700 54px sans-serif',
        '#3f2b1c',
      );
      drawCenteredText(
        ctx,
        `${dashboard?.date ?? '오늘'} 기준`,
        canvas.width / 2,
        122,
        '500 24px sans-serif',
        '#6b4a2e',
      );

      const stats = [
        ['손님', dashboard?.guestCount ?? 0],
        ['이웃', dashboard?.memberCount ?? 0],
        ['총 방문', dashboard?.totalCount ?? 0],
        ['오늘의 마음', dashboard?.confessionCount ?? 0],
      ] as const;

      stats.forEach(([label, value], index) => {
        const x = 90 + (index % 2) * 302;
        const y = 158 + Math.floor(index / 2) * 92;
        ctx.fillStyle = '#fff7e6';
        roundRect(ctx, x, y, 260, 72, 14);
        ctx.fill();
        ctx.strokeStyle = '#d7bb84';
        ctx.lineWidth = 3;
        ctx.stroke();
        drawText(ctx, label, x + 24, y + 25, '500 22px sans-serif', '#6b4a2e');
        drawText(ctx, value.toLocaleString(), x + 140, y + 47, '700 34px sans-serif', '#3f2b1c');
      });
    });
  }

  private createSuggestionBoardTexture(suggestion: Suggestion | null): THREE.CanvasTexture {
    return this.createBoardTexture((ctx, canvas) => {
      drawBoardBase(ctx, canvas);
      drawCenteredText(ctx, '건의 게시판', canvas.width / 2, 76, '700 54px sans-serif', '#3f2b1c');
      drawCenteredText(
        ctx,
        '최근 등록된 제안',
        canvas.width / 2,
        122,
        '500 24px sans-serif',
        '#6b4a2e',
      );

      if (!suggestion) {
        ctx.fillStyle = '#fff7e6';
        roundRect(ctx, 76, 158, 616, 164, 16);
        ctx.fill();
        ctx.strokeStyle = '#d7bb84';
        ctx.lineWidth = 3;
        ctx.stroke();
        drawCenteredText(
          ctx,
          '아직 등록된 건의사항이 없어요',
          canvas.width / 2,
          240,
          '600 34px sans-serif',
          '#6b4a2e',
        );
        return;
      }

      ctx.fillStyle = '#fff7e6';
      roundRect(ctx, 76, 158, 616, 164, 16);
      ctx.fill();
      ctx.strokeStyle = '#d7bb84';
      ctx.lineWidth = 3;
      ctx.stroke();
      const status = suggestion.status === 'DONE' ? '처리 완료' : '접수';
      ctx.font = '700 34px sans-serif';
      drawText(
        ctx,
        truncateText(ctx, suggestion.title, 520),
        100,
        196,
        '700 34px sans-serif',
        '#3f2b1c',
      );
      drawText(ctx, status, 600, 196, '600 24px sans-serif', '#6b4a2e');
      ctx.font = '500 28px sans-serif';
      wrapText(ctx, suggestion.body, 610, 2).forEach((line, index) => {
        drawText(ctx, line, 100, 248 + index * 38, '500 28px sans-serif', '#5f432d');
      });
    });
  }

  private createBoardTexture(
    draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    draw(ctx, canvas);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private buildForestWall(): void {
    // 숲 외곽 트리 — 침엽(콘)·활엽(구) 두 종 + 키·색 변주로 "심은 벽" 느낌 제거.
    // 변주는 index 기반 결정적 (모든 클라이언트 동일 — Math.random 금지).
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5a3d2a });
    const conifer = new THREE.MeshLambertMaterial({ color: 0x4a7c45 });
    const coniferDark = new THREE.MeshLambertMaterial({ color: 0x3d6b3a });
    const broadleaf = new THREE.MeshLambertMaterial({ color: 0x6b9450 });

    for (let i = 0; i < VILLAGE.TREE_COUNT; i += 1) {
      const angle = (i / VILLAGE.TREE_COUNT) * Math.PI * 2;
      // index 해시 → [0,1) 변주값 2개 (반경·크기)
      const v1 = ((i * 2654435761) % 1000) / 1000;
      const v2 = ((i * 40503 + 17) % 1000) / 1000;
      const r = VILLAGE.FOREST_WALL_RADIUS + (v1 - 0.5) * 3;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const sizeScale = 0.8 + v2 * 0.7;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * sizeScale, 0.42 * sizeScale, 2.2 * sizeScale, 7),
        trunkMaterial,
      );
      trunk.position.set(x, 1.1 * sizeScale, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      // 3그루 중 1그루는 활엽 (잎뭉치 2개 클러스터) — 나머지는 침엽 2단 콘 (2색)
      if (i % 3 === 0) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * sizeScale, 0), broadleaf);
        crown.position.set(x, 3 * sizeScale, z);
        crown.scale.y = 0.85;
        crown.castShadow = true;
        this.scene.add(crown);
        const side = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * sizeScale, 0), broadleaf);
        side.position.set(x + 0.9 * sizeScale * (i % 2 === 0 ? 1 : -1), 2.4 * sizeScale, z);
        side.castShadow = true;
        this.scene.add(side);
      } else {
        const leafMaterial = i % 2 === 0 ? conifer : coniferDark;
        const lower = new THREE.Mesh(
          new THREE.ConeGeometry(1.5 * sizeScale, 2 * sizeScale, 8),
          leafMaterial,
        );
        lower.position.set(x, 2.7 * sizeScale, z);
        lower.castShadow = true;
        this.scene.add(lower);
        const upper = new THREE.Mesh(
          new THREE.ConeGeometry(1.05 * sizeScale, 1.7 * sizeScale, 8),
          leafMaterial,
        );
        upper.position.set(x, 4 * sizeScale, z);
        upper.castShadow = true;
        this.scene.add(upper);
      }
    }
  }

  /** 카메라 follow — 캐릭터 기준 orbit. 이동 방향은 SceneManager 입력 의미를 그대로 둔다. */
  updateCamera(
    camera: THREE.PerspectiveCamera,
    orbitDelta: { yaw: number; pitch: number } = { yaw: 0, pitch: 0 },
    zoomDelta = 0,
  ): void {
    const target = this.character.position;

    if (CAMERA.ORBIT_ENABLED) {
      this.cameraYaw -= orbitDelta.yaw * CAMERA.ORBIT_YAW_SENSITIVITY;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch - orbitDelta.pitch * CAMERA.ORBIT_PITCH_SENSITIVITY,
        CAMERA.ORBIT_MIN_PITCH,
        CAMERA.ORBIT_MAX_PITCH,
      );
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance + zoomDelta * CAMERA.WHEEL_ZOOM_SENSITIVITY,
        CAMERA.MIN_DISTANCE,
        CAMERA.MAX_DISTANCE,
      );

      const horizontalDistance = this.cameraDistance;
      const desired = new THREE.Vector3(
        target.x + Math.sin(this.cameraYaw) * horizontalDistance,
        target.y + CAMERA.HEIGHT_OFFSET + Math.sin(this.cameraPitch) * this.cameraDistance,
        target.z + Math.cos(this.cameraYaw) * horizontalDistance,
      );
      camera.position.lerp(desired, CAMERA.FOLLOW_LERP);
      camera.lookAt(target.x, target.y + 1, target.z);
      return;
    }

    const desired = new THREE.Vector3(
      target.x,
      target.y + CAMERA.HEIGHT_OFFSET,
      target.z + CAMERA.DISTANCE,
    );
    camera.position.lerp(desired, CAMERA.FOLLOW_LERP);
    camera.lookAt(target.x, target.y + 1, target.z);
  }

  getMovementYaw(): number {
    return CAMERA.ORBIT_ENABLED ? this.cameraYaw : CAMERA.ORBIT_INITIAL_YAW;
  }

  /** 캐릭터가 도서관 진입 트리거 안에 있는가? */
  isAtLibraryDoor(): boolean {
    return this.character.position.distanceTo(this.libraryDoor) < VILLAGE.LIBRARY_TRIGGER_RADIUS;
  }

  isNearDashboardBoard(): boolean {
    return this.character.position.distanceTo(this.dashboardBoard) < VILLAGE.BOARD_TRIGGER_RADIUS;
  }

  isNearSuggestionBoard(): boolean {
    return this.character.position.distanceTo(this.suggestionBoard) < VILLAGE.BOARD_TRIGGER_RADIUS;
  }

  /**
   * STOMP 위치 broadcast 수신 시 호출. self filter 는 호출자(SceneManager) 책임.
   * 백엔드 contract y → Three.js z 로 매핑한다 (옛 Phaser 2D 호환).
   */
  applyRemotePosition(pos: PositionBroadcast): void {
    if (pos.userType === 'LEAVE') {
      this.removeRemotePlayer(pos.id);
      return;
    }
    const existing = this.remotePlayers.get(pos.id);
    const height = pos.z ?? 0;
    if (existing) {
      existing.setTarget(pos.x, pos.y, height);
      return;
    }
    // displayId 전달 — 주민 모델 결정적 배정 (그 유저 화면의 자기 캐릭터와 동일 종)
    const player = new RemotePlayer(pos.x, pos.y, pos.id, height);
    this.remotePlayers.set(pos.id, player);
    this.scene.add(player.group);
  }

  /** 매 프레임 호출 — RemotePlayer 의 lerp + 애니메이션 진행. */
  updateRemotePlayers(delta?: number): void {
    for (const player of this.remotePlayers.values()) {
      player.update(delta);
    }
  }

  /** 도서관 진입 시 호출 — 모든 placeholder 제거 + dispose. */
  clearRemotePlayers(): void {
    for (const id of [...this.remotePlayers.keys()]) {
      this.removeRemotePlayer(id);
    }
  }

  /**
   * 다른 유저의 채팅 메시지 결 해당 RemotePlayer 머리 위 말풍선 attach (Step 1.7).
   * 본 displayId 의 placeholder 가 없으면 무시 (도서관 진입 중 또는 미도착).
   */
  applyChatBubbleTo(displayId: string, body: string): void {
    const player = this.remotePlayers.get(displayId);
    if (!player) return;
    player.attachBubble(body);
  }

  private removeRemotePlayer(id: string): void {
    const player = this.remotePlayers.get(id);
    if (!player) return;
    this.scene.remove(player.group);
    player.dispose();
    this.remotePlayers.delete(id);
  }
}

function drawBoardBase(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.fillStyle = '#f1dfb8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let next = text;
  while (next.length > 0 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const normalized = text.replace(/s+/g, ' ').trim();
  const lines: string[] = [];
  let current = '';

  for (const char of normalized) {
    const next = `${current}${char}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = char;
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines && normalized.length > lines.join('').length) {
    lines[maxLines - 1] = truncateText(ctx, lines[maxLines - 1], maxWidth);
  }

  return lines;
}
