import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { type AnimalSpecies, VILLAGER_SPECIES } from './animalSpecies';

/** 캐릭터 표준 키 (placeholder 박스 1.4 + 머리와 맞춤 — 말풍선 높이 호환). */
const TARGET_HEIGHT = 1.5;

export interface AnimalInstance {
  /** 발이 y=0, 정면이 +Z 가 되도록 정규화된 래퍼. group 에 그대로 add. */
  object: THREE.Object3D;
  /** 애니메이션 재생용 — 호출자가 update(delta) 책임. */
  mixer: THREE.AnimationMixer;
  /**
   * 이동 중에만 재생하는 walk 클립. idle 클립은 의도적으로 재생하지 않는다 —
   * Quaternius idle 모션의 고개 젖힘이 거슬린다는 사용자 피드백 (2026-06-12).
   * 정지 시에는 bind pose 로 가만히 서 있는다.
   */
  walk: THREE.AnimationAction | null;
}

interface LoadedTemplate {
  template: THREE.Object3D;
  clips: THREE.AnimationClip[];
  scale: number;
  yOffset: number;
}

type PendingRequest = (instance: AnimalInstance | null) => void;

/**
 * GLB 주민 모델 1회 로드 + 인스턴스 clone 캐시.
 *
 * - 로드는 SceneManager(브라우저 런타임)만 트리거한다. 테스트에서 Character /
 *   RemotePlayer 를 직접 생성하면 로드가 시작되지 않아 placeholder 가 유지된다
 *   (네트워크/WebGL 없는 vitest 환경 안전).
 * - clone 은 SkeletonUtils.clone — skinned mesh 의 bone 바인딩 유지.
 *   geometry/material 은 템플릿과 공유되므로 인스턴스별 dispose 금지.
 */
class AnimalModelRegistry {
  private templates = new Map<AnimalSpecies, LoadedTemplate>();
  private pending = new Map<AnimalSpecies, PendingRequest[]>();
  private started = false;

  /** SceneManager 생성 시 1회 호출 — 4종 백그라운드 로드. 실패는 종 단위로 무시 (placeholder 유지). */
  preloadAll(basePath = '/models/animals'): void {
    if (this.started) return;
    this.started = true;
    const loader = new GLTFLoader();
    for (const species of VILLAGER_SPECIES) {
      loader.load(
        `${basePath}/${species}.glb`,
        (gltf) => {
          this.register(species, gltf.scene, gltf.animations);
        },
        undefined,
        () => {
          // 로드 실패 — 해당 종은 placeholder 박스 유지. 콘솔 노이즈만 남기지 않는다.
          const waiters = this.pending.get(species) ?? [];
          this.pending.delete(species);
          for (const cb of waiters) {
            cb(null);
          }
        },
      );
    }
  }

  private register(
    species: AnimalSpecies,
    scene: THREE.Object3D,
    clips: THREE.AnimationClip[],
  ): void {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    });

    // 정규화 — 종마다 원본 크기가 달라 bbox 기준으로 표준 키에 맞춘다.
    const box = new THREE.Box3().setFromObject(scene);
    const height = Math.max(box.max.y - box.min.y, 0.0001);
    const scale = TARGET_HEIGHT / height;
    const yOffset = -box.min.y * scale;

    const template: LoadedTemplate = { template: scene, clips, scale, yOffset };
    this.templates.set(species, template);

    const waiters = this.pending.get(species) ?? [];
    this.pending.delete(species);
    for (const cb of waiters) {
      cb(this.instantiate(template));
    }
  }

  /**
   * 종 모델 요청. 로드 완료면 즉시 콜백, 미완료면 큐잉.
   * 로드가 영영 안 되면(테스트·실패) 콜백은 호출되지 않는다 — 호출자는 placeholder 유지.
   */
  request(species: AnimalSpecies, cb: PendingRequest): void {
    const loaded = this.templates.get(species);
    if (loaded) {
      cb(this.instantiate(loaded));
      return;
    }
    const queue = this.pending.get(species) ?? [];
    queue.push(cb);
    this.pending.set(species, queue);
  }

  private instantiate(loaded: LoadedTemplate): AnimalInstance {
    const model = cloneSkeleton(loaded.template);
    const wrapper = new THREE.Group();
    wrapper.add(model);
    model.scale.setScalar(loaded.scale);
    model.position.y = loaded.yOffset;

    const mixer = new THREE.AnimationMixer(model);
    const walkClip =
      loaded.clips.find((c) => /walk/i.test(c.name)) ??
      loaded.clips.find((c) => /run|gallop|trot/i.test(c.name)) ??
      null;

    const walk = walkClip ? mixer.clipAction(walkClip) : null;

    return { object: wrapper, mixer, walk };
  }
}

export const animalModelRegistry = new AnimalModelRegistry();
