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
    this.buildCozyInterior();

    // 캐릭터 입구 (남) 결로 spawn
    this.character = new Character(new THREE.Vector3(0, 0, this.exitZ - 0.5));
    this.scene.add(this.character.group);
  }

  /**
   * 사서방 인테리어 (visual pass 2026-06-12) — 벽난로·안락의자·러그·독서 테이블·
   * 화분·창문·펜던트 조명. 상호작용 anchor (사서·책장) 와 동선 (남쪽 입구) 은 비움.
   */
  private buildCozyInterior(): void {
    // 러그 — 방 중앙, 모임의 중심
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 32),
      new THREE.MeshLambertMaterial({ color: 0xb05c4a }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.012, 1);
    this.scene.add(rug);
    const rugInner = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 32),
      new THREE.MeshLambertMaterial({ color: 0xc97a5e }),
    );
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.set(0, 0.014, 1);
    this.scene.add(rugInner);

    // 벽난로 — 서쪽 벽. 돌 몸체 + 아궁이 + 은은한 불빛
    const hearthBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.2, 2),
      new THREE.MeshLambertMaterial({ color: 0x9a948a }),
    );
    hearthBody.position.set(-6.4, 1.1, 1);
    hearthBody.castShadow = true;
    this.scene.add(hearthBody);
    const hearthOpening = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.9, 1.1),
      new THREE.MeshLambertMaterial({
        color: 0xff8c3a,
        emissive: 0xff6a1a,
        emissiveIntensity: 0.9,
      }),
    );
    hearthOpening.position.set(-6.05, 0.55, 1);
    this.scene.add(hearthOpening);
    const mantel = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.12, 2.3),
      new THREE.MeshLambertMaterial({ color: 0x6b4226 }),
    );
    mantel.position.set(-6.4, 2.26, 1);
    this.scene.add(mantel);
    const hearthLight = new THREE.PointLight(0xff9c4a, 5, 7, 2);
    hearthLight.position.set(-5.8, 1, 1);
    this.scene.add(hearthLight);

    // 안락의자 2개 — 벽난로를 바라봄
    const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x7d5a8c });
    for (const cz of [-0.4, 2.4]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), chairMaterial);
      seat.position.set(-4.6, 0.35, cz);
      seat.castShadow = true;
      this.scene.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.9), chairMaterial);
      back.position.set(-4.25, 0.85, cz);
      this.scene.add(back);
      for (const az of [-0.38, 0.38]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.14), chairMaterial);
        arm.position.set(-4.6, 0.68, cz + az);
        this.scene.add(arm);
      }
    }

    // 독서 테이블 — 동쪽. 위에 펼친 책 + 쌓인 책
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.08, 16),
      new THREE.MeshLambertMaterial({ color: 0x8a5d3b }),
    );
    tableTop.position.set(4.6, 0.78, 1.2);
    tableTop.castShadow = true;
    this.scene.add(tableTop);
    const tableLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.78, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b4226 }),
    );
    tableLeg.position.set(4.6, 0.39, 1.2);
    this.scene.add(tableLeg);
    const openBook = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.36),
      new THREE.MeshLambertMaterial({ color: 0xfcf6e7 }),
    );
    openBook.position.set(4.45, 0.84, 1);
    openBook.rotation.y = 0.4;
    this.scene.add(openBook);
    const stackColors = [0x8c4a3a, 0x4a6a8c, 0x6a8c4a];
    stackColors.forEach((color, idx) => {
      const stacked = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.07, 0.3),
        new THREE.MeshLambertMaterial({ color }),
      );
      stacked.position.set(4.85, 0.86 + idx * 0.07, 1.55);
      stacked.rotation.y = idx * 0.25;
      this.scene.add(stacked);
    });
    // 테이블 옆 스툴 2개
    const stoolMaterial = new THREE.MeshLambertMaterial({ color: 0xa07952 });
    for (const sx of [3.6, 5.6]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.5, 10), stoolMaterial);
      stool.position.set(sx, 0.25, 1.2);
      stool.castShadow = true;
      this.scene.add(stool);
    }

    // 화분 2개 — 모서리의 초록
    const potMaterial = new THREE.MeshLambertMaterial({ color: 0xb06a4a });
    const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x55794a });
    for (const [px, pz] of [
      [-6.2, 4.6],
      [6.2, 4.4],
    ] as const) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 10), potMaterial);
      pot.position.set(px, 0.22, pz);
      this.scene.add(pot);
      const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), plantMaterial);
      plant.position.set(px, 0.75, pz);
      this.scene.add(plant);
    }

    // 동쪽 벽 창문 — 따뜻한 빛이 들어오는 결
    const windowPane = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.4, 1.1),
      new THREE.MeshLambertMaterial({
        color: 0xffe9b0,
        emissive: 0xffc966,
        emissiveIntensity: 0.6,
      }),
    );
    windowPane.position.set(6.82, 2.2, 1.2);
    this.scene.add(windowPane);
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.6, 1.3),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2e }),
    );
    windowFrame.position.set(6.8, 2.2, 1.2);
    this.scene.add(windowFrame);

    // 펜던트 조명 2개 — 러그·테이블 위
    const cordMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3b2c });
    const bulbMaterial = new THREE.MeshLambertMaterial({
      color: 0xffd27a,
      emissive: 0xffaa33,
      emissiveIntensity: 0.9,
    });
    for (const [lx, lz] of [
      [0, 1],
      [4.6, 1.2],
    ] as const) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), cordMaterial);
      cord.position.set(lx, 4.3, lz);
      this.scene.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 10), cordMaterial);
      shade.position.set(lx, 3.6, lz);
      this.scene.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bulbMaterial);
      bulb.position.set(lx, 3.46, lz);
      this.scene.add(bulb);
    }
    const pendantLight = new THREE.PointLight(0xffc97a, 7, 10, 2);
    pendantLight.position.set(0, 3.4, 1);
    this.scene.add(pendantLight);

    // 사서 책상 위 촛불
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.18, 6),
      new THREE.MeshLambertMaterial({ color: 0xf7f0dc }),
    );
    candle.position.set(-0.7, 0.99, -2.2);
    this.scene.add(candle);
    const candleFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.08, 6),
      new THREE.MeshLambertMaterial({
        color: 0xffd97a,
        emissive: 0xffc24a,
        emissiveIntensity: 1,
      }),
    );
    candleFlame.position.set(-0.7, 1.12, -2.2);
    this.scene.add(candleFlame);
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
