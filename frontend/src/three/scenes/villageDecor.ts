import * as THREE from 'three';

import { VILLAGE } from '../constants';

/**
 * 마을 데코 풀 패스 — 꽃밭·풀숲·돌·울타리·가로등 + 살아있는 디테일
 * (모닥불 불씨·연못 물결·반딧불).
 *
 * 모든 배치는 시드 RNG (mulberry32) 로 결정적 — 새로고침해도 같은 마을.
 * 동적 요소는 buildVillageDecor 가 돌려주는 update(elapsed) 로 구동한다.
 *
 * 안식처 가드레일 (D11): 점멸·번쩍임 금지 — 모든 모션은 저주파 sin 흔들림.
 */

/** 결정적 의사난수 — 시드 고정으로 모든 클라이언트가 같은 마을을 본다. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DECOR_SEED = 20260612;

function tagDecor<T extends THREE.Object3D>(obj: T, role: string): T {
  obj.userData.villageDecorRole = role;
  return obj;
}

/** 길·연못·캠프파이어·도서관·입구를 피해서 배치 (걸어다니는 동선 보호). */
function isClearOfLandmarks(x: number, z: number): boolean {
  // 입구~도서관 세로 길
  if (Math.abs(x) < 2.2 && z > VILLAGE.LIBRARY_Z - 2 && z < VILLAGE.ENTRY_Z + 2) return false;
  // 연못
  if (Math.hypot(x - VILLAGE.POND_X, z - VILLAGE.POND_Z) < VILLAGE.POND_RADIUS + 2) return false;
  // 캠프파이어 (돌 둘레 + 그루터기 의자 포함)
  if (Math.hypot(x, z - VILLAGE.CAMPFIRE_Z) < 4) return false;
  // 도서관 footprint
  if (Math.abs(x) < 6 && Math.abs(z - VILLAGE.LIBRARY_Z) < 5.5) return false;
  return true;
}

/** 외곽 숲 안쪽의 빈 잔디 좌표를 뽑는다. */
function scatterPoint(rng: () => number): { x: number; z: number } | null {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (VILLAGE.FOREST_WALL_RADIUS - 3);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (isClearOfLandmarks(x, z)) return { x, z };
  }
  return null;
}

const FLOWER_PETAL_COLORS = [0xf2a0b5, 0xf5d76e, 0xe8927c, 0xc9a0dc, 0xf7f3e3];

function buildFlowers(scene: THREE.Scene, rng: () => number): void {
  const stemGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 5);
  const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x5d7d4a });
  const headGeometry = new THREE.SphereGeometry(0.14, 8, 6);
  const headMaterials = FLOWER_PETAL_COLORS.map(
    (color) => new THREE.MeshLambertMaterial({ color }),
  );

  for (let i = 0; i < 70; i += 1) {
    const point = scatterPoint(rng);
    if (!point) continue;
    const cluster = new THREE.Group();
    const count = 1 + Math.floor(rng() * 3);
    for (let f = 0; f < count; f += 1) {
      const ox = (rng() - 0.5) * 0.8;
      const oz = (rng() - 0.5) * 0.8;
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.set(ox, 0.2, oz);
      cluster.add(stem);
      const head = new THREE.Mesh(
        headGeometry,
        headMaterials[Math.floor(rng() * headMaterials.length)],
      );
      head.position.set(ox, 0.45, oz);
      cluster.add(head);
    }
    cluster.position.set(point.x, 0, point.z);
    scene.add(cluster);
  }
}

function buildGrassTufts(scene: THREE.Scene, rng: () => number): void {
  const geometry = new THREE.ConeGeometry(0.12, 0.45, 4);
  const materials = [
    new THREE.MeshLambertMaterial({ color: 0x7a9a55 }),
    new THREE.MeshLambertMaterial({ color: 0x90ad62 }),
  ];
  for (let i = 0; i < 110; i += 1) {
    const point = scatterPoint(rng);
    if (!point) continue;
    const tuft = new THREE.Mesh(geometry, materials[Math.floor(rng() * materials.length)]);
    tuft.position.set(point.x, 0.22, point.z);
    tuft.rotation.y = rng() * Math.PI;
    tuft.scale.setScalar(0.7 + rng() * 0.8);
    scene.add(tuft);
  }
}

function buildRocks(scene: THREE.Scene, rng: () => number): void {
  const geometry = new THREE.DodecahedronGeometry(0.4, 0);
  const materials = [
    new THREE.MeshLambertMaterial({ color: 0x9a948a }),
    new THREE.MeshLambertMaterial({ color: 0x837d72 }),
  ];
  for (let i = 0; i < 22; i += 1) {
    const point = scatterPoint(rng);
    if (!point) continue;
    const rock = new THREE.Mesh(geometry, materials[Math.floor(rng() * materials.length)]);
    rock.position.set(point.x, 0.18, point.z);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
    rock.scale.set(0.5 + rng(), 0.4 + rng() * 0.5, 0.5 + rng());
    rock.castShadow = true;
    scene.add(rock);
  }
}

function buildBushes(scene: THREE.Scene, rng: () => number): void {
  const geometry = new THREE.IcosahedronGeometry(0.6, 0);
  const material = new THREE.MeshLambertMaterial({ color: 0x55794a });
  const berryGeometry = new THREE.SphereGeometry(0.06, 6, 5);
  const berryMaterial = new THREE.MeshLambertMaterial({ color: 0xd96a6a });
  for (let i = 0; i < 18; i += 1) {
    const point = scatterPoint(rng);
    if (!point) continue;
    const bush = new THREE.Mesh(geometry, material);
    const s = 0.7 + rng() * 0.7;
    bush.position.set(point.x, 0.45 * s, point.z);
    bush.scale.set(s, s * 0.8, s);
    bush.castShadow = true;
    scene.add(bush);
    // 절반쯤은 열매 — 보면 줍고 싶은 디테일
    if (rng() > 0.5) {
      for (let b = 0; b < 3; b += 1) {
        const berry = new THREE.Mesh(berryGeometry, berryMaterial);
        const angle = rng() * Math.PI * 2;
        berry.position.set(
          point.x + Math.cos(angle) * 0.4 * s,
          0.5 * s + rng() * 0.3,
          point.z + Math.sin(angle) * 0.4 * s,
        );
        scene.add(berry);
      }
    }
  }
}

/** 입구 길 양옆 낮은 울타리 — "마을에 들어왔다" 는 감각. */
function buildPathFence(scene: THREE.Scene): void {
  const postGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6);
  const railGeometry = new THREE.BoxGeometry(1.9, 0.07, 0.07);
  const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });

  for (const side of [-2.6, 2.6]) {
    for (let z = VILLAGE.ENTRY_Z; z > VILLAGE.ENTRY_Z - 12; z -= 2) {
      const post = new THREE.Mesh(postGeometry, woodMaterial);
      post.position.set(side, 0.3, z);
      post.castShadow = true;
      scene.add(post);
      const rail = new THREE.Mesh(railGeometry, woodMaterial);
      rail.rotation.y = Math.PI / 2;
      rail.position.set(side, 0.45, z - 1);
      scene.add(rail);
    }
  }
}

/** 무료/자체 제작 소품 패스 — 외부 유료 에셋 없이 목업의 밀도와 기억점을 만든다. */
function buildFreeMockupSignatureProps(scene: THREE.Scene): void {
  buildConfessionMailbox(scene);
  buildLibraryWelcomeArch(scene);
  buildLetterPathLanterns(scene);
  buildLibraryFlowerBoxes(scene);
  buildFairyForestHideout(scene);
}

function buildFairyForestHideout(scene: THREE.Scene): void {
  buildFairyMushroomRing(scene);
  buildSecretTrailFlowers(scene);
  buildHangingLanternGarlands(scene);
  buildGlowStones(scene);
  buildLeafySecretArch(scene);
}

function buildFairyMushroomRing(scene: THREE.Scene): void {
  const stemMaterial = new THREE.MeshLambertMaterial({ color: 0xf3dcc5 });
  const capMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xe96f72 }),
    new THREE.MeshLambertMaterial({ color: 0xf2a65a }),
    new THREE.MeshLambertMaterial({ color: 0xc48ad8 }),
  ];
  const spotMaterial = new THREE.MeshLambertMaterial({ color: 0xfff2cf });

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const radius = i % 2 === 0 ? 6.2 : 6.9;
    const group = tagDecor(new THREE.Group(), 'fairy-mushroom');
    const scale = 0.75 + (i % 4) * 0.12;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09 * scale, 0.14 * scale, 0.45 * scale, 7),
      stemMaterial,
    );
    stem.position.set(0, 0.22 * scale, 0);
    stem.castShadow = true;
    group.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.32 * scale, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      capMaterials[i % capMaterials.length],
    );
    cap.position.set(0, 0.48 * scale, 0);
    cap.scale.y = 0.72;
    cap.castShadow = true;
    group.add(cap);

    for (let s = 0; s < 3; s += 1) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 6, 5), spotMaterial);
      const spotAngle = (s / 3) * Math.PI * 2 + i * 0.2;
      spot.position.set(
        Math.cos(spotAngle) * 0.16 * scale,
        0.63 * scale,
        Math.sin(spotAngle) * 0.16 * scale,
      );
      group.add(spot);
    }

    const rawX = Math.cos(angle) * radius;
    const safeX = Math.abs(rawX) < 2.15 ? (i % 2 === 0 ? 2.15 : -2.15) : rawX;
    group.position.set(safeX, 0, VILLAGE.CAMPFIRE_Z + Math.sin(angle) * radius);
    group.rotation.y = -angle;
    scene.add(group);
  }
}

function buildSecretTrailFlowers(scene: THREE.Scene): void {
  const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x6f9a55 });
  const petalMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xf5a6c8 }),
    new THREE.MeshLambertMaterial({ color: 0xffd979 }),
    new THREE.MeshLambertMaterial({ color: 0xb9a7ff }),
    new THREE.MeshLambertMaterial({ color: 0x9ee6c8 }),
  ];
  const positions: [number, number][] = [];
  for (let i = 0; i < 12; i += 1) {
    const z = VILLAGE.ENTRY_Z - 4 - i * 4.4;
    positions.push([-2.25 - (i % 3) * 0.22, z]);
    positions.push([2.25 + (i % 3) * 0.22, z - 1.4]);
  }

  positions.forEach(([x, z], index) => {
    const group = tagDecor(new THREE.Group(), 'secret-trail-flower');
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 5), stemMaterial);
    stem.position.set(0, 0.2, 0);
    group.add(stem);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 7, 5),
      petalMaterials[index % petalMaterials.length],
    );
    head.position.set(0, 0.46, 0);
    group.add(head);

    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), stemMaterial);
    leaf.position.set(index % 2 === 0 ? 0.1 : -0.1, 0.3, 0);
    leaf.scale.set(1.4, 0.55, 0.8);
    group.add(leaf);

    group.position.set(x, 0, z);
    group.rotation.y = index * 0.43;
    scene.add(group);
  });
}

function buildHangingLanternGarlands(scene: THREE.Scene): void {
  const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x6b4a32 });
  const lanternMaterial = new THREE.MeshLambertMaterial({
    color: 0xffd890,
    emissive: 0xffaa5a,
    emissiveIntensity: 0.75,
  });
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x5f8d52 });
  const zSpots = [VILLAGE.ENTRY_Z - 14, VILLAGE.CAMPFIRE_Z - 4, VILLAGE.LIBRARY_Z + 13];

  for (const z of zSpots) {
    const group = tagDecor(new THREE.Group(), 'hanging-lantern-garland');
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 5.4, 6), ropeMaterial);
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, 2.25, 0);
    group.add(rope);

    for (const x of [-1.75, 0, 1.75]) {
      const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5), ropeMaterial);
      drop.position.set(x, 2.02, 0);
      group.add(drop);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), lanternMaterial);
      lantern.position.set(x, 1.72, 0);
      group.add(lantern);
    }

    for (const x of [-2.25, -0.75, 0.75, 2.25]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), leafMaterial);
      leaf.position.set(x, 2.33, 0);
      leaf.scale.set(1.5, 0.45, 0.8);
      group.add(leaf);
    }

    group.position.set(0, 0, z);
    scene.add(group);
  }
}

function buildGlowStones(scene: THREE.Scene): void {
  const stoneMaterial = new THREE.MeshLambertMaterial({
    color: 0x9fd8ff,
    emissive: 0x6db8ff,
    emissiveIntensity: 0.45,
  });
  const spots: [number, number][] = [
    [-3.1, VILLAGE.ENTRY_Z - 9],
    [3.15, VILLAGE.ENTRY_Z - 12],
    [-3.35, VILLAGE.ENTRY_Z - 21],
    [3.25, VILLAGE.ENTRY_Z - 25],
    [-3.25, VILLAGE.CAMPFIRE_Z - 1],
    [3.35, VILLAGE.CAMPFIRE_Z - 6],
    [-3.1, VILLAGE.CAMPFIRE_Z - 15],
    [3.2, VILLAGE.LIBRARY_Z + 18],
    [-3.3, VILLAGE.LIBRARY_Z + 10],
    [3.3, VILLAGE.LIBRARY_Z + 6],
  ];

  spots.forEach(([x, z], index) => {
    const stone = tagDecor(
      new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (index % 3) * 0.04, 0), stoneMaterial),
      'glow-stone',
    );
    stone.position.set(x, 0.11, z);
    stone.rotation.set(index * 0.37, index * 0.22, 0);
    stone.scale.set(1.25, 0.62, 1);
    stone.castShadow = true;
    scene.add(stone);
  });
}

function buildLeafySecretArch(scene: THREE.Scene): void {
  const group = tagDecor(new THREE.Group(), 'leafy-secret-arch');
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x6d4a32 });
  const leafMaterials = [
    new THREE.MeshLambertMaterial({ color: 0x5f8d52 }),
    new THREE.MeshLambertMaterial({ color: 0x7aa85c }),
    new THREE.MeshLambertMaterial({ color: 0x8fbf6a }),
  ];
  const flowerMaterial = new THREE.MeshLambertMaterial({
    color: 0xf3a3c7,
    emissive: 0xc85c86,
    emissiveIntensity: 0.2,
  });

  for (const x of [-2.75, 2.75]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.0, 7), trunkMaterial);
    trunk.position.set(x, 1.5, 0);
    trunk.rotation.z = x < 0 ? -0.18 : 0.18;
    trunk.castShadow = true;
    group.add(trunk);
  }

  for (let i = 0; i < 15; i += 1) {
    const t = i / 14;
    const x = -2.6 + t * 5.2;
    const y = 2.55 + Math.sin(t * Math.PI) * 0.85;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), leafMaterials[i % 3]);
    leaf.position.set(x, y, 0);
    leaf.scale.set(1.2, 0.78, 0.95);
    leaf.castShadow = true;
    group.add(leaf);

    if (i % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), flowerMaterial);
      flower.position.set(x, y + 0.33, 0.08);
      group.add(flower);
    }
  }

  group.position.set(0, 0, VILLAGE.LIBRARY_Z + 9.7);
  scene.add(group);
}

function buildConfessionMailbox(scene: THREE.Scene): void {
  const group = tagDecor(new THREE.Group(), 'confession-mailbox');
  const redMaterial = new THREE.MeshLambertMaterial({ color: 0xb94b43 });
  const darkRedMaterial = new THREE.MeshLambertMaterial({ color: 0x81352f });
  const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x765437 });
  const creamMaterial = new THREE.MeshLambertMaterial({ color: 0xf4e6c9 });

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.16), woodMaterial);
  post.position.set(0, 0.48, 0);
  post.castShadow = true;
  group.add(post);

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.48, 0.58), redMaterial);
  box.position.set(0, 1.12, 0);
  box.castShadow = true;
  group.add(box);

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.06, 12), darkRedMaterial);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(0, 1.38, 0);
  roof.scale.z = 0.72;
  roof.castShadow = true;
  group.add(roof);

  const flagPole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), woodMaterial);
  flagPole.position.set(0.58, 1.35, 0.32);
  group.add(flagPole);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.04), creamMaterial);
  flag.position.set(0.78, 1.55, 0.32);
  group.add(flag);

  const letterSlot = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.04), creamMaterial);
  letterSlot.position.set(0, 1.15, 0.31);
  group.add(letterSlot);

  group.position.set(-3.7, 0, VILLAGE.ENTRY_Z - 16);
  group.rotation.y = -0.18;
  scene.add(group);
}

function buildLibraryWelcomeArch(scene: THREE.Scene): void {
  const group = tagDecor(new THREE.Group(), 'library-welcome-arch');
  const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x6f4f34 });
  const signMaterial = new THREE.MeshLambertMaterial({ color: 0xc99a62 });
  const glowMaterial = new THREE.MeshLambertMaterial({
    color: 0xffdf9a,
    emissive: 0xffb85a,
    emissiveIntensity: 0.65,
  });

  for (const x of [-2.35, 2.35]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.7, 7), woodMaterial);
    post.position.set(x, 1.35, 0);
    post.castShadow = true;
    group.add(post);

    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowMaterial);
    lantern.position.set(x, 2.25, 0.08);
    group.add(lantern);
  }

  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 0.2), woodMaterial);
  beam.position.set(0, 2.62, 0);
  beam.castShadow = true;
  group.add(beam);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.55, 0.12), signMaterial);
  sign.position.set(0, 2.18, 0.08);
  sign.castShadow = true;
  group.add(sign);

  group.position.set(0, 0, VILLAGE.LIBRARY_Z + 7.2);
  scene.add(group);
}

function buildLetterPathLanterns(scene: THREE.Scene): void {
  const postMaterial = new THREE.MeshLambertMaterial({ color: 0x4e3a2b });
  const paperMaterial = new THREE.MeshLambertMaterial({
    color: 0xffe3b0,
    emissive: 0xffb75f,
    emissiveIntensity: 0.45,
  });
  const waxMaterial = new THREE.MeshLambertMaterial({ color: 0xb95e4a });
  const spots: [number, number][] = [
    [-2.8, VILLAGE.ENTRY_Z - 20],
    [2.8, VILLAGE.ENTRY_Z - 23],
    [-2.8, VILLAGE.CAMPFIRE_Z - 6],
    [2.8, VILLAGE.CAMPFIRE_Z - 10],
    [-2.8, VILLAGE.LIBRARY_Z + 14],
    [2.8, VILLAGE.LIBRARY_Z + 11],
  ];

  for (const [x, z] of spots) {
    const group = tagDecor(new THREE.Group(), 'letter-path-lantern');
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.1, 6), postMaterial);
    post.position.set(0, 0.55, 0);
    post.castShadow = true;
    group.add(post);

    const note = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.035), paperMaterial);
    note.position.set(0, 1.16, 0);
    note.rotation.z = 0.08;
    group.add(note);

    const seal = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), waxMaterial);
    seal.position.set(0.1, 1.1, 0.025);
    group.add(seal);

    group.position.set(x, 0, z);
    group.rotation.y = x < 0 ? 0.22 : -0.22;
    scene.add(group);
  }
}

function buildLibraryFlowerBoxes(scene: THREE.Scene): void {
  const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x7a5636 });
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x5f8b4a });
  const petalMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xf2a0b5 }),
    new THREE.MeshLambertMaterial({ color: 0xf5d76e }),
    new THREE.MeshLambertMaterial({ color: 0xc9a0dc }),
  ];

  for (const x of [-3.9, 3.9]) {
    const group = tagDecor(new THREE.Group(), 'library-flower-box');
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.38), boxMaterial);
    box.position.set(0, 0.22, 0);
    box.castShadow = true;
    group.add(box);

    for (let i = 0; i < 5; i += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), leafMaterial);
      leaf.position.set(-0.55 + i * 0.27, 0.48, 0);
      leaf.scale.set(1.2, 0.7, 0.8);
      group.add(leaf);

      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 7, 5),
        petalMaterials[i % petalMaterials.length],
      );
      petal.position.set(-0.55 + i * 0.27, 0.64, 0.02);
      group.add(petal);
    }

    group.position.set(x, 0, VILLAGE.LIBRARY_Z + 3.9);
    scene.add(group);
  }
}

/** 마을 안쪽 나무 12그루 + 그루터기 4 — 넓어진 잔디가 비어 보이지 않게. */
function buildInnerTrees(scene: THREE.Scene, rng: () => number): void {
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5a3d2a });
  const leafMaterials = [
    new THREE.MeshLambertMaterial({ color: 0x4a7c45 }),
    new THREE.MeshLambertMaterial({ color: 0x6b9450 }),
  ];

  for (let i = 0; i < 12; i += 1) {
    const point = scatterPoint(rng);
    if (!point) continue;
    const s = 0.55 + rng() * 0.5; // 외곽 숲보다 작게 — 시야 가림 최소화
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * s, 0.3 * s, 1.8 * s, 7),
      trunkMaterial,
    );
    trunk.position.set(point.x, 0.9 * s, point.z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leafMaterial = leafMaterials[Math.floor(rng() * leafMaterials.length)];
    if (rng() > 0.5) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * s, 0), leafMaterial);
      crown.position.set(point.x, 2.4 * s, point.z);
      crown.castShadow = true;
      scene.add(crown);
    } else {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1 * s, 2.2 * s, 8), leafMaterial);
      cone.position.set(point.x, 2.6 * s, point.z);
      cone.castShadow = true;
      scene.add(cone);
    }
  }

  // 그루터기 — 잘려나간 자리, 앉을 수도 있을 것 같은 디테일
  const stumpMaterial = new THREE.MeshLambertMaterial({ color: 0x7d5f40 });
  for (let i = 0; i < 4; i += 1) {
    const point = scatterPoint(rng);
    if (!point) continue;
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.35, 9), stumpMaterial);
    stump.position.set(point.x, 0.17, point.z);
    stump.castShadow = true;
    scene.add(stump);
  }
}

function buildCampfireHideout(scene: THREE.Scene): void {
  const fireZ = VILLAGE.CAMPFIRE_Z;

  const ring = tagDecor(
    new THREE.Mesh(
      new THREE.RingGeometry(3.2, 5.4, 48),
      new THREE.MeshLambertMaterial({ color: 0xb98f5f, transparent: true, opacity: 0.78 }),
    ),
    'campfire-gathering-ring',
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.018, fireZ);
  scene.add(ring);

  const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x7a5636 });
  const seatTopMaterial = new THREE.MeshLambertMaterial({ color: 0xb68a5a });
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(angle) * 4.25;
    const z = fireZ + Math.sin(angle) * 4.25;
    const seat = tagDecor(
      new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.5, 10), seatMaterial),
      'campfire-seat',
    );
    seat.position.set(x, 0.25, z);
    seat.rotation.y = -angle;
    seat.castShadow = true;
    scene.add(seat);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 10), seatTopMaterial);
    top.position.set(x, 0.53, z);
    scene.add(top);
  }

  const postMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3525 });
  const glowMaterial = new THREE.MeshLambertMaterial({
    color: 0xffd58a,
    emissive: 0xffa84a,
    emissiveIntensity: 0.9,
  });
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const x = Math.cos(angle) * 5.7;
    const z = fireZ + Math.sin(angle) * 5.7;
    const post = tagDecor(
      new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), postMaterial),
      'campfire-lantern',
    );
    post.position.set(x, 0.7, z);
    post.castShadow = true;
    scene.add(post);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), glowMaterial);
    glow.position.set(x, 1.45, z);
    scene.add(glow);
  }

  const sign = tagDecor(new THREE.Group(), 'campfire-keepsake-sign');
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), postMaterial);
  signPost.position.set(-5.2, 0.45, fireZ - 1.5);
  sign.add(signPost);
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.42, 0.08),
    new THREE.MeshLambertMaterial({ color: 0xc99a62 }),
  );
  signBoard.position.set(-5.2, 1, fireZ - 1.5);
  signBoard.rotation.y = 0.35;
  sign.add(signBoard);
  scene.add(sign);
}

interface LampResult {
  flames: THREE.Mesh[];
  lights: THREE.PointLight[];
}

/** 길가 랜턴 가로등 3개 — 따뜻한 점광. (PointLight 수 절제 — 성능) */
function buildLanterns(scene: THREE.Scene): LampResult {
  const postMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3b2c });
  const glowMaterial = new THREE.MeshLambertMaterial({
    color: 0xffd27a,
    emissive: 0xffaa33,
    emissiveIntensity: 0.9,
  });
  const flames: THREE.Mesh[] = [];
  const lights: THREE.PointLight[] = [];

  const spots: [number, number][] = [
    [3, VILLAGE.ENTRY_Z - 6],
    [-3, VILLAGE.CAMPFIRE_Z + 5],
    [3, VILLAGE.POND_Z + 4],
    [-3, VILLAGE.LIBRARY_Z + 7],
  ];
  for (const [x, z] of spots) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), postMaterial);
    post.position.set(x, 1.1, z);
    post.castShadow = true;
    scene.add(post);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 6), postMaterial);
    cap.position.set(x, 2.45, z);
    scene.add(cap);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowMaterial);
    glow.position.set(x, 2.22, z);
    scene.add(glow);
    flames.push(glow);

    const light = new THREE.PointLight(0xffb86b, 6, 9, 2);
    light.position.set(x, 2.3, z);
    scene.add(light);
    lights.push(light);
  }
  return { flames, lights };
}

interface PondResult {
  ripples: THREE.Mesh[];
}

/** 연못 디테일 — 수련잎·연꽃 + 부들 + 물가 돌 + 퍼지는 물결 링. */
function buildPondDetail(scene: THREE.Scene, rng: () => number): PondResult {
  const pondX = VILLAGE.POND_X;
  const pondZ = VILLAGE.POND_Z;
  const radius = VILLAGE.POND_RADIUS;

  // 수련잎 5 + 그중 2개엔 연꽃
  const padGeometry = new THREE.CircleGeometry(0.35, 12);
  const padMaterial = new THREE.MeshLambertMaterial({ color: 0x4f7d3d });
  const lotusMaterial = new THREE.MeshLambertMaterial({ color: 0xf4b8c8 });
  for (let i = 0; i < 5; i += 1) {
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    const angle = rng() * Math.PI * 2;
    const r = rng() * (radius - 1.2);
    const px = pondX + Math.cos(angle) * r;
    const pz = pondZ + Math.sin(angle) * r;
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(px, 0.035, pz);
    pad.scale.setScalar(0.6 + rng() * 0.8);
    scene.add(pad);
    if (i < 2) {
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 6), lotusMaterial);
      lotus.position.set(px, 0.12, pz);
      scene.add(lotus);
    }
  }

  // 부들 (cattail) 6 — 물가 가장자리에 줄기 + 갈색 이삭
  const reedStemMaterial = new THREE.MeshLambertMaterial({ color: 0x6d8a4e });
  const reedHeadMaterial = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  for (let i = 0; i < 6; i += 1) {
    const angle = rng() * Math.PI * 2;
    const r = radius + 0.3 + rng() * 0.6;
    const rx = pondX + Math.cos(angle) * r;
    const rz = pondZ + Math.sin(angle) * r;
    const h = 0.9 + rng() * 0.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, h, 5), reedStemMaterial);
    stem.position.set(rx, h / 2, rz);
    stem.rotation.z = (rng() - 0.5) * 0.15;
    scene.add(stem);
    const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 3, 6), reedHeadMaterial);
    head.position.set(rx, h + 0.1, rz);
    scene.add(head);
  }

  // 물가 돌 5 — 모래 가장자리에
  const shoreStoneMaterial = new THREE.MeshLambertMaterial({ color: 0x97907f });
  for (let i = 0; i < 5; i += 1) {
    const angle = rng() * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), shoreStoneMaterial);
    stone.position.set(
      pondX + Math.cos(angle) * (radius + 0.5),
      0.1,
      pondZ + Math.sin(angle) * (radius + 0.5),
    );
    stone.rotation.set(rng() * 3, rng() * 3, 0);
    stone.scale.set(0.7 + rng(), 0.5 + rng() * 0.4, 0.7 + rng());
    scene.add(stone);
  }

  // 퍼지는 물결 링 4 (얇게)
  const ripples: THREE.Mesh[] = [];
  const rippleGeometry = new THREE.RingGeometry(0.3, 0.34, 28);
  for (let i = 0; i < 4; i += 1) {
    const ripple = new THREE.Mesh(
      rippleGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xdcf0f6,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(pondX + (rng() - 0.5) * radius, 0.04, pondZ + (rng() - 0.5) * radius);
    scene.add(ripple);
    ripples.push(ripple);
  }
  return { ripples };
}

interface CampfireResult {
  embers: THREE.Mesh[];
  emberHome: { x: number; z: number; phase: number }[];
  smoke: THREE.Mesh[];
  fireLight: THREE.PointLight;
}

/** 모닥불 살리기 — 불씨 입자 + 피어오르는 연기 + 일렁이는 점광. */
function buildCampfireDetail(scene: THREE.Scene, rng: () => number): CampfireResult {
  const embers: THREE.Mesh[] = [];
  const emberHome: { x: number; z: number; phase: number }[] = [];
  const emberGeometry = new THREE.SphereGeometry(0.045, 6, 5);
  const emberMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc46b,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < 9; i += 1) {
    const ember = new THREE.Mesh(emberGeometry, emberMaterial.clone());
    const home = { x: (rng() - 0.5) * 0.5, z: (rng() - 0.5) * 0.5, phase: rng() * Math.PI * 2 };
    ember.position.set(home.x, 0.8, VILLAGE.CAMPFIRE_Z + home.z);
    scene.add(ember);
    embers.push(ember);
    emberHome.push(home);
  }

  // 연기 3덩이 — 불 위에서 천천히 피어올라 커지며 사라짐
  const smoke: THREE.Mesh[] = [];
  const smokeGeometry = new THREE.SphereGeometry(0.22, 7, 6);
  for (let i = 0; i < 3; i += 1) {
    const puff = new THREE.Mesh(
      smokeGeometry,
      new THREE.MeshBasicMaterial({ color: 0xb9b2a8, transparent: true, opacity: 0.25 }),
    );
    puff.position.set(0, 1.6, VILLAGE.CAMPFIRE_Z);
    scene.add(puff);
    smoke.push(puff);
  }

  const fireLight = new THREE.PointLight(0xff9c4a, 14, 12, 2);
  fireLight.position.set(0, 1.2, VILLAGE.CAMPFIRE_Z);
  scene.add(fireLight);

  return { embers, emberHome, smoke, fireLight };
}

interface FireflyResult {
  flies: THREE.Mesh[];
  centers: { x: number; z: number; phase: number; radius: number }[];
}

/** 반딧불 — 숲 가장자리 근처를 낮게 떠다닌다. 안식처의 밤 입자. */
function buildFireflies(scene: THREE.Scene, rng: () => number): FireflyResult {
  const flies: THREE.Mesh[] = [];
  const centers: { x: number; z: number; phase: number; radius: number }[] = [];
  const geometry = new THREE.SphereGeometry(0.05, 6, 5);
  for (let i = 0; i < 20; i += 1) {
    const angle = rng() * Math.PI * 2;
    const r = VILLAGE.FOREST_WALL_RADIUS - 4 - rng() * 10;
    const center = {
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      phase: rng() * Math.PI * 2,
      radius: 0.8 + rng() * 1.6,
    };
    const fly = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.85 }),
    );
    fly.position.set(center.x, 1 + rng() * 1.2, center.z);
    scene.add(fly);
    flies.push(fly);
    centers.push(center);
  }
  return { flies, centers };
}

export interface VillageDecor {
  /** 매 프레임 호출 — elapsed 는 누적 초. 저주파 흔들림만 (D11 점멸 금지). */
  update(elapsed: number): void;
}

export function buildVillageDecor(scene: THREE.Scene): VillageDecor {
  const rng = mulberry32(DECOR_SEED);

  buildFlowers(scene, rng);
  buildGrassTufts(scene, rng);
  buildRocks(scene, rng);
  buildBushes(scene, rng);
  buildInnerTrees(scene, rng);
  buildCampfireHideout(scene);
  buildPathFence(scene);
  buildFreeMockupSignatureProps(scene);
  const lanterns = buildLanterns(scene);
  const pond = buildPondDetail(scene, rng);
  const campfire = buildCampfireDetail(scene, rng);
  const fireflies = buildFireflies(scene, rng);

  return {
    update(elapsed: number): void {
      // 모닥불 — 불씨가 천천히 떠오르며 소멸, 점광은 잔잔히 일렁임
      campfire.fireLight.intensity = 13 + Math.sin(elapsed * 5.3) * 1.6 + Math.sin(elapsed * 9.1);
      for (let i = 0; i < campfire.embers.length; i += 1) {
        const ember = campfire.embers[i];
        const home = campfire.emberHome[i];
        const t = (elapsed * 0.45 + home.phase) % 1.6;
        ember.position.set(
          home.x + Math.sin(elapsed * 1.7 + home.phase) * 0.15,
          0.7 + t * 1.3,
          VILLAGE.CAMPFIRE_Z + home.z,
        );
        (ember.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 0.6);
      }

      // 연기 — 천천히 올라가며 커지고 옅어짐 (4초 주기 loop)
      for (let i = 0; i < campfire.smoke.length; i += 1) {
        const puff = campfire.smoke[i];
        const t = (elapsed * 0.25 + i * 0.33) % 1;
        puff.position.set(
          Math.sin(elapsed * 0.8 + i * 2) * 0.3 * t,
          1.5 + t * 2.6,
          VILLAGE.CAMPFIRE_Z + Math.cos(elapsed * 0.6 + i * 2) * 0.2 * t,
        );
        puff.scale.setScalar(0.6 + t * 1.8);
        (puff.material as THREE.MeshBasicMaterial).opacity = 0.28 * (1 - t);
      }

      // 연못 물결 — 퍼지면서 옅어지는 링 (loop)
      for (let i = 0; i < pond.ripples.length; i += 1) {
        const ripple = pond.ripples[i];
        const t = (elapsed * 0.35 + i * 0.33) % 1;
        ripple.scale.setScalar(0.6 + t * 2.2);
        (ripple.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - t);
      }

      // 랜턴 — 호흡하듯 미세한 밝기 변화
      for (let i = 0; i < lanterns.lights.length; i += 1) {
        lanterns.lights[i].intensity = 5.6 + Math.sin(elapsed * 2.1 + i * 1.7) * 0.5;
      }

      // 반딧불 — 느린 원 궤도 + 위아래 부유 + 숨쉬는 빛
      for (let i = 0; i < fireflies.flies.length; i += 1) {
        const fly = fireflies.flies[i];
        const c = fireflies.centers[i];
        const t = elapsed * 0.4 + c.phase;
        fly.position.set(
          c.x + Math.cos(t) * c.radius,
          1.1 + Math.sin(t * 1.6) * 0.5,
          c.z + Math.sin(t) * c.radius,
        );
        (fly.material as THREE.MeshBasicMaterial).opacity =
          0.45 + 0.4 * (0.5 + Math.sin(t * 2.3) / 2);
      }
    },
  };
}
