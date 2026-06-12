import * as THREE from 'three';

import type { PositionBroadcast } from '@/lib/websocket/realtimeTypes';

import { Character } from '../character/Character';
import { RemotePlayer } from '../character/RemotePlayer';
import { CAMERA, VILLAGE } from '../constants';
import { applyWarmLighting } from '../lighting';
import { buildVillageDecor, type VillageDecor } from './villageDecor';

/**
 * 마을 Scene — 입구·캠프파이어·연못·도서관 세로 구도 (사용자 결, 2026-05-10).
 * Step 1.5: 다른 유저 placeholder (RemotePlayer) 동기화 추가.
 * Visual pass (2026-06-12): 데코 풀 패스 (villageDecor) + 나무 다양화 + 도서관 창문
 * + 유저 = 동물 주민 (Character/RemotePlayer 가 displayId 결정적 배정).
 */
export class VillageScene {
  readonly scene = new THREE.Scene();
  readonly character: Character;
  readonly libraryDoor: THREE.Vector3;
  /** 다른 유저 placeholder — key = displayId. spec §2.2 Out: 도서관 진입 유저는 표시 X. */
  private remotePlayers = new Map<string, RemotePlayer>();
  private readonly decor: VillageDecor;
  private elapsed = 0;

  constructor() {
    applyWarmLighting(this.scene);

    this.buildGround();
    this.buildPond();
    this.buildCampfire();
    this.buildLibrary();
    this.buildForestWall();
    this.decor = buildVillageDecor(this.scene);

    this.character = new Character(new THREE.Vector3(0, 0, VILLAGE.ENTRY_Z));
    this.scene.add(this.character.group);

    this.libraryDoor = new THREE.Vector3(0, 0, VILLAGE.LIBRARY_Z + 2);
  }

  /** 살아있는 디테일 (불씨·물결·반딧불) 진행 — SceneManager tick 에서 마을 렌더 시 호출. */
  updateAmbient(delta: number): void {
    this.elapsed += delta;
    this.decor.update(this.elapsed);
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
    // 연못 (PlaneGeometry, 환경음 결 — Step 2 에서 PositionalAudio 부착)
    const pondGeometry = new THREE.CircleGeometry(3, 32);
    const pondMaterial = new THREE.MeshLambertMaterial({
      color: 0x6b9bb3, // 회청록 물 톤
      transparent: true,
      opacity: 0.85,
    });
    const pond = new THREE.Mesh(pondGeometry, pondMaterial);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-5, 0.02, VILLAGE.POND_Z);
    pond.receiveShadow = true;
    this.scene.add(pond);

    // 연못 가장자리 (모래톤 링 — 물과 잔디 경계를 부드럽게)
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(3, 3.5, 32),
      new THREE.MeshLambertMaterial({ color: 0xd6c39a }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(-5, 0.015, VILLAGE.POND_Z);
    this.scene.add(rim);
    // 수련잎·물결은 villageDecor 가 담당 (구 placeholder 거품 제거)
  }

  private buildCampfire(): void {
    // 캠프파이어 통나무 4개 (Cylinder, 십자 결로 박음)
    const logMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
    for (let i = 0; i < 4; i += 1) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8), logMaterial);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i * Math.PI) / 4;
      log.position.set(0, 0.2, VILLAGE.CAMPFIRE_Z);
      log.castShadow = true;
      this.scene.add(log);
    }

    // 모닥불 (Cone, 주황 톤)
    const fire = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.2, 8),
      new THREE.MeshLambertMaterial({
        color: 0xff7a3a,
        emissive: 0xff5500,
        emissiveIntensity: 0.6,
      }),
    );
    fire.position.set(0, 0.7, VILLAGE.CAMPFIRE_Z);
    this.scene.add(fire);

    // Campfire seats.
    const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x8b6f4e });
    for (const offset of [-1.6, 1.6]) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), chairMaterial);
      chair.position.set(offset, 0.25, VILLAGE.CAMPFIRE_Z);
      chair.castShadow = true;
      this.scene.add(chair);
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
        new THREE.CylinderGeometry(0.3, 0.4, 2 * sizeScale, 8),
        trunkMaterial,
      );
      trunk.position.set(x, sizeScale, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      // 3그루 중 1그루는 활엽 (둥근 잎) — 나머지는 침엽 2색
      if (i % 3 === 0) {
        const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * sizeScale, 0), broadleaf);
        leaves.position.set(x, 2 * sizeScale + 1.1 * sizeScale, z);
        leaves.castShadow = true;
        this.scene.add(leaves);
      } else {
        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(1.4 * sizeScale, 2.6 * sizeScale, 8),
          i % 2 === 0 ? conifer : coniferDark,
        );
        leaves.position.set(x, 2 * sizeScale + 1.2 * sizeScale, z);
        leaves.castShadow = true;
        this.scene.add(leaves);
      }
    }
  }

  /** 카메라 follow — 정적 + 천천히 (orbit X). spec D11. */
  updateCamera(camera: THREE.PerspectiveCamera): void {
    const target = this.character.position;
    const desired = new THREE.Vector3(
      target.x,
      target.y + CAMERA.HEIGHT_OFFSET,
      target.z + CAMERA.DISTANCE,
    );
    camera.position.lerp(desired, CAMERA.FOLLOW_LERP);
    camera.lookAt(target.x, target.y + 1, target.z);
  }

  /** 캐릭터가 도서관 진입 트리거 안에 있는가? */
  isAtLibraryDoor(): boolean {
    return this.character.position.distanceTo(this.libraryDoor) < VILLAGE.LIBRARY_TRIGGER_RADIUS;
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
    if (existing) {
      existing.setTarget(pos.x, pos.y);
      return;
    }
    // displayId 전달 — 동물 종 결정적 배정 (그 유저 화면의 자기 캐릭터와 동일 종)
    const player = new RemotePlayer(pos.x, pos.y, pos.id);
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
