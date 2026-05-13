import * as THREE from 'three';

import type { PositionBroadcast } from '@/lib/websocket/stompClient';

import { Character } from '../character/Character';
import { RemotePlayer } from '../character/RemotePlayer';
import { CAMERA, VILLAGE } from '../constants';
import { applyWarmLighting } from '../lighting';

/**
 * 마을 Scene — 입구·캠프파이어·연못·도서관 세로 구도 (사용자 결, 2026-05-10).
 * Step 1 PoC: 박스·구·실린더 기본 geometry 만. 자산 X.
 * Step 1.5: 다른 유저 placeholder (RemotePlayer) 동기화 추가.
 */
export class VillageScene {
  readonly scene = new THREE.Scene();
  readonly character: Character;
  readonly libraryDoor: THREE.Vector3;
  /** 다른 유저 placeholder — key = displayId. spec §2.2 Out: 도서관 진입 유저는 표시 X. */
  private remotePlayers = new Map<string, RemotePlayer>();

  constructor() {
    applyWarmLighting(this.scene);

    this.buildGround();
    this.buildPond();
    this.buildCampfire();
    this.buildLibrary();
    this.buildForestWall();

    this.character = new Character(new THREE.Vector3(0, 0, VILLAGE.ENTRY_Z));
    this.scene.add(this.character.group);

    this.libraryDoor = new THREE.Vector3(0, 0, VILLAGE.LIBRARY_Z + 2);
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

    // 거품 3개 (구)
    for (let i = 0; i < 3; i += 1) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xf4faff }),
      );
      bubble.position.set(-5 + (Math.random() - 0.5) * 4, 0.05, VILLAGE.POND_Z + (Math.random() - 0.5) * 4);
      this.scene.add(bubble);
    }
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
      new THREE.MeshLambertMaterial({ color: 0xff7a3a, emissive: 0xff5500, emissiveIntensity: 0.6 }),
    );
    fire.position.set(0, 0.7, VILLAGE.CAMPFIRE_Z);
    this.scene.add(fire);

    // NPC 자리 (의자 박스 2개, Step 5 에서 NPC 결로 박음)
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
  }

  private buildForestWall(): void {
    // 숲 외곽 트리 (CylinderGeometry 줄기 + ConeGeometry 잎)
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5a3d2a });
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x4a7c45 });

    for (let i = 0; i < VILLAGE.TREE_COUNT; i += 1) {
      const angle = (i / VILLAGE.TREE_COUNT) * Math.PI * 2;
      const r = VILLAGE.FOREST_WALL_RADIUS + (Math.random() - 0.5) * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 8), trunkMaterial);
      trunk.position.set(x, 1, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 8), leavesMaterial);
      leaves.position.set(x, 3, z);
      leaves.castShadow = true;
      this.scene.add(leaves);
    }
  }

  /** 카메라 follow — 정적 + 천천히 (orbit X). spec D11. */
  updateCamera(camera: THREE.PerspectiveCamera): void {
    const target = this.character.position;
    const desired = new THREE.Vector3(target.x, target.y + CAMERA.HEIGHT_OFFSET, target.z + CAMERA.DISTANCE);
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
    const player = new RemotePlayer(pos.x, pos.y);
    this.remotePlayers.set(pos.id, player);
    this.scene.add(player.group);
  }

  /** 매 프레임 호출 — RemotePlayer 의 lerp 진행. */
  updateRemotePlayers(): void {
    for (const player of this.remotePlayers.values()) {
      player.update();
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
