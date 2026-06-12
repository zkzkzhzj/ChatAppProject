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

/** 길·연못·캠프파이어·도서관·입구를 피해서 배치 (걸어다니는 동선 보호). */
function isClearOfLandmarks(x: number, z: number): boolean {
  // 입구~도서관 세로 길
  if (Math.abs(x) < 2.2 && z > VILLAGE.LIBRARY_Z - 2 && z < VILLAGE.ENTRY_Z + 2) return false;
  // 연못 (-5, POND_Z)
  if (Math.hypot(x + 5, z - VILLAGE.POND_Z) < 5) return false;
  // 캠프파이어
  if (Math.hypot(x, z - VILLAGE.CAMPFIRE_Z) < 3.5) return false;
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

  for (let i = 0; i < 44; i += 1) {
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
  for (let i = 0; i < 70; i += 1) {
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
  for (let i = 0; i < 14; i += 1) {
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
  for (let i = 0; i < 12; i += 1) {
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
    for (let z = VILLAGE.ENTRY_Z; z > VILLAGE.ENTRY_Z - 10; z -= 2) {
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
    [3, VILLAGE.LIBRARY_Z + 7],
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

/** 연못 디테일 — 수련잎 + 퍼지는 물결 링. */
function buildPondDetail(scene: THREE.Scene, rng: () => number): PondResult {
  const pondX = -5;
  const pondZ = VILLAGE.POND_Z;

  const padGeometry = new THREE.CircleGeometry(0.35, 12);
  const padMaterial = new THREE.MeshLambertMaterial({ color: 0x4f7d3d });
  for (let i = 0; i < 4; i += 1) {
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    const angle = rng() * Math.PI * 2;
    const r = rng() * 2;
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(pondX + Math.cos(angle) * r, 0.035, pondZ + Math.sin(angle) * r);
    pad.scale.setScalar(0.6 + rng() * 0.8);
    scene.add(pad);
  }

  const ripples: THREE.Mesh[] = [];
  const rippleGeometry = new THREE.RingGeometry(0.3, 0.36, 24);
  for (let i = 0; i < 3; i += 1) {
    const ripple = new THREE.Mesh(
      rippleGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xcfe8f0,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(pondX + (rng() - 0.5) * 2, 0.04, pondZ + (rng() - 0.5) * 2);
    scene.add(ripple);
    ripples.push(ripple);
  }
  return { ripples };
}

interface CampfireResult {
  embers: THREE.Mesh[];
  emberHome: { x: number; z: number; phase: number }[];
  fireLight: THREE.PointLight;
}

/** 모닥불 살리기 — 불씨 입자 + 일렁이는 점광. */
function buildCampfireDetail(scene: THREE.Scene, rng: () => number): CampfireResult {
  const embers: THREE.Mesh[] = [];
  const emberHome: { x: number; z: number; phase: number }[] = [];
  const emberGeometry = new THREE.SphereGeometry(0.045, 6, 5);
  const emberMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc46b,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < 7; i += 1) {
    const ember = new THREE.Mesh(emberGeometry, emberMaterial.clone());
    const home = { x: (rng() - 0.5) * 0.5, z: (rng() - 0.5) * 0.5, phase: rng() * Math.PI * 2 };
    ember.position.set(home.x, 0.8, VILLAGE.CAMPFIRE_Z + home.z);
    scene.add(ember);
    embers.push(ember);
    emberHome.push(home);
  }

  const fireLight = new THREE.PointLight(0xff9c4a, 14, 12, 2);
  fireLight.position.set(0, 1.2, VILLAGE.CAMPFIRE_Z);
  scene.add(fireLight);

  return { embers, emberHome, fireLight };
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
  for (let i = 0; i < 14; i += 1) {
    const angle = rng() * Math.PI * 2;
    const r = VILLAGE.FOREST_WALL_RADIUS - 4 - rng() * 8;
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
  buildPathFence(scene);
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
