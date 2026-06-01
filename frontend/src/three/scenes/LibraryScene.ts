import * as THREE from 'three';

import { Character } from '../character/Character';
import { CAMERA } from '../constants';
import { applyWarmLighting } from '../lighting';

/**
 * 도서관 Scene — Step 1 PoC 는 빈 박스만.
 * Step 4 에서 책장 + 책상 + 글 작성·조회 + 댓글 + AI 추천 인테리어.
 *
 * 진입: VillageScene 의 도서관 트리거 → SceneManager 가 본 Scene 으로 전환.
 * 퇴장: 캐릭터가 출구 트리거 (Z > 5) 안에 들어오면 VillageScene 로 복귀.
 */
export class LibraryScene {
  readonly scene = new THREE.Scene();
  readonly character: Character;
  private readonly librarianAnchor = new THREE.Vector3(0, 0, -2.6);
  private readonly bookshelfXs = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5];
  private readonly bookshelfAnchors = this.bookshelfXs.map((x) => new THREE.Vector3(x, 0, -5.1));
  private readonly interactionRadius = 1.8;
  private readonly exitZ = 5; // 입구쪽 (남)

  constructor() {
    applyWarmLighting(this.scene);

    this.buildFloor();
    this.buildWalls();
    this.buildBookshelves();
    this.buildLibrarianDesk();

    // 캐릭터 입구 (남) 결로 spawn
    this.character = new Character(new THREE.Vector3(0, 0, this.exitZ - 0.5));
    this.scene.add(this.character.group);
  }

  private buildFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 12),
      new THREE.MeshLambertMaterial({ color: 0xa07952 }), // warm 나무 마루
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private buildWalls(): void {
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xddc4a0 }); // 따뜻한 베이지

    // 북·동·서 벽 (남쪽은 입구 결로 열림)
    const positions = [
      { x: 0, z: -6, w: 14, h: 5, d: 0.3 }, // 북
      { x: -7, z: 0, w: 0.3, h: 5, d: 12 }, // 서
      { x: 7, z: 0, w: 0.3, h: 5, d: 12 }, // 동
    ];
    for (const p of positions) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), wallMaterial);
      wall.position.set(p.x, p.h / 2, p.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
    }
  }

  private buildBookshelves(): void {
    // 책장 placeholder (Step 4 에서 책 list 결로 박음)
    const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
    for (const x of this.bookshelfXs) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.8, 0.6), shelfMaterial);
      shelf.position.set(x, 1.9, -5);
      shelf.castShadow = true;
      this.scene.add(shelf);

      // 책 색깔 layer (Step 4 에서 글 list 결로 박음)
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 7; col += 1) {
          const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.45, 0.35),
            new THREE.MeshLambertMaterial({
              color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
            }),
          );
          book.position.set(x - 0.72 + col * 0.24, 0.35 + row * 0.68, -4.6);
          this.scene.add(book);
        }
      }
    }
  }

  private buildLibrarianDesk(): void {
    // 책상 + 펼친 노트 (Step 4 에서 글 작성 결로 박음)
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x8a5d3b }),
    );
    desk.position.set(0, 0.85, -2);
    desk.castShadow = true;
    this.scene.add(desk);

    // 책상 다리
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
    for (const dx of [-1, 1]) {
      for (const dz of [-0.5, 0.5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), legMaterial);
        leg.position.set(dx, 0.42, -2 + dz);
        leg.castShadow = true;
        this.scene.add(leg);
      }
    }

    // 펼친 노트
    const note = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.02, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xfcf6e7 }),
    );
    note.position.set(0, 0.91, -2);
    this.scene.add(note);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x5b6f8f }),
    );
    body.position.set(0.65, 1.28, -2.15);
    body.castShadow = true;
    this.scene.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0xf1c6a8 }),
    );
    head.position.set(0.65, 1.82, -2.15);
    head.castShadow = true;
    this.scene.add(head);
  }

  updateCamera(camera: THREE.PerspectiveCamera): void {
    const target = this.character.position;
    const desired = new THREE.Vector3(
      target.x,
      target.y + CAMERA.HEIGHT_OFFSET * 0.7,
      target.z + CAMERA.DISTANCE * 0.8,
    );
    camera.position.lerp(desired, CAMERA.FOLLOW_LERP);
    camera.lookAt(target.x, target.y + 1, target.z);
  }

  isNearLibrarian(): boolean {
    return this.character.position.distanceTo(this.librarianAnchor) < this.interactionRadius;
  }

  isNearBookshelf(): boolean {
    return this.bookshelfAnchors.some(
      (anchor) => this.character.position.distanceTo(anchor) < this.interactionRadius,
    );
  }

  isAtExit(): boolean {
    return this.character.position.z > this.exitZ;
  }
}
