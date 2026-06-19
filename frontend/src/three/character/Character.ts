import * as THREE from 'three';

import { SpeechBubble } from '../chat/SpeechBubble';
import { PHYSICS } from '../constants';
import { type AnimalInstance, animalModelRegistry } from './AnimalModelRegistry';
import { scaleJitterFor, speciesFor } from './animalSpecies';

/**
 * 자기 캐릭터 — displayId 가 정해지면 주민 모델로 교체된다.
 *
 * 생성 직후에는 박스 + 구 placeholder. SceneManager.setSelfId → adoptAnimal()
 * 호출로 Quaternius CC0 주민 모델 (정규화·애니메이션 포함) 로 swap.
 * 모델 로드가 불가한 환경 (vitest, 네트워크 실패) 에서는 placeholder 유지.
 *
 * 물리 (spec D11):
 * - 걷기 (WALK_SPEED) + 점프 (가벼운 깡총, MAX_HEIGHT 1)
 * - 뛰기·달리기 X (RUN_ENABLED false)
 */
export class Character {
  readonly group = new THREE.Group();
  private readonly velocityY = { value: 0 };
  private isOnGround = true;
  private readonly bodyHeight = 1.4;
  /** placeholder 박스·구 — 동물 모델 도착 시 제거 + dispose. */
  private placeholderMeshes: THREE.Mesh[] = [];
  private animal: AnimalInstance | null = null;
  private adoptedId: string | null = null;
  private gait: 'idle' | 'walk' = 'idle';
  /**
   * 말풍선 stack — 새 메시지가 머리 바로 위, 기존 결 위로 밀어 올림.
   * 6초 timer 결로 자연 해제 결로 한도 X (안전판 50). spacing = 텍스트 줄 결 + 여유.
   */
  private bubbles: SpeechBubble[] = [];
  private static readonly MAX_BUBBLES = 50;
  private static readonly BUBBLE_BASE_Y = 1.4;
  private static readonly BUBBLE_STACK_SPACING = 0.95;
  private static readonly GAIT_FADE_SEC = 0.2;

  constructor(spawn: THREE.Vector3) {
    // 몸통 (박스)
    const bodyGeometry = new THREE.BoxGeometry(0.6, this.bodyHeight, 0.6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xa3826a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = this.bodyHeight / 2;
    body.castShadow = true;
    this.group.add(body);
    this.placeholderMeshes.push(body);

    // 머리 (구)
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 12);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xf3d2b3 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = this.bodyHeight + 0.3;
    head.castShadow = true;
    this.group.add(head);
    this.placeholderMeshes.push(head);

    this.group.position.copy(spawn);
  }

  /**
   * displayId 기반 주민 모델 채택 (결정적 — 모든 클라이언트에서 같은 종으로 보임).
   * 같은 id 재호출은 무시. 모델 미로드 시 콜백이 안 와서 placeholder 유지.
   */
  adoptAnimal(displayId: string): void {
    if (this.adoptedId === displayId) return;
    this.adoptedId = displayId;
    animalModelRegistry.request(speciesFor(displayId), (instance) => {
      // 늦게 도착한 이전 요청 무시 (id 가 그 사이 바뀐 경우)
      if (this.adoptedId !== displayId) return;
      this.swapToAnimal(instance, scaleJitterFor(displayId));
    });
  }

  private swapToAnimal(instance: AnimalInstance, jitter: number): void {
    // 기존 주민 모델 (재채택) 또는 placeholder 제거
    if (this.animal) {
      this.animal.mixer.stopAllAction();
      this.group.remove(this.animal.object);
    }
    for (const mesh of this.placeholderMeshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.placeholderMeshes = [];

    instance.object.scale.setScalar(jitter);
    this.group.add(instance.object);
    this.animal = instance;
    this.gait = 'idle';
  }

  /** 입력 결과 적용해서 한 프레임 이동. delta = 초. */
  update(input: { dx: number; dz: number; jump: boolean }, delta: number): void {
    // 수평 이동 (걷기 only — 뛰기 결 X)
    const speed = PHYSICS.WALK_SPEED;
    const length = Math.hypot(input.dx, input.dz);
    if (length > 0) {
      const nx = input.dx / length;
      const nz = input.dz / length;
      this.group.position.x += nx * speed * delta;
      this.group.position.z += nz * speed * delta;

      // 캐릭터 방향 회전 (이동 방향 바라보기)
      this.group.rotation.y = Math.atan2(nx, nz);
    }

    // 점프 (가벼운 깡총)
    if (input.jump && this.isOnGround) {
      this.velocityY.value = PHYSICS.JUMP_VELOCITY;
      this.isOnGround = false;
    }

    // 중력
    if (!this.isOnGround) {
      this.velocityY.value -= PHYSICS.GRAVITY * delta;
      this.group.position.y += this.velocityY.value * delta;

      // 가드레일: 높이 1 unit 초과 X (D11)
      if (this.group.position.y > PHYSICS.JUMP_MAX_HEIGHT) {
        this.group.position.y = PHYSICS.JUMP_MAX_HEIGHT;
        this.velocityY.value = Math.min(this.velocityY.value, 0);
      }

      // 착지
      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.velocityY.value = 0;
        this.isOnGround = true;
      }
    }

    // 주민 모델 애니메이션 — idle ↔ walk crossfade
    if (this.animal) {
      this.applyGait(length > 0 ? 'walk' : 'idle');
      this.animal.mixer.update(delta);
    }
  }

  private applyGait(next: 'idle' | 'walk'): void {
    if (!this.animal || this.gait === next) return;
    const { walk } = this.animal;
    if (!walk) return;
    // idle 클립은 재생하지 않는다 (고개 젖힘 거슬림 — 사용자 피드백 2026-06-12).
    // 정지 = bind pose 로 가만히, 이동 = walk fade in/out.
    if (next === 'walk') {
      walk.reset().fadeIn(Character.GAIT_FADE_SEC).play();
    } else {
      walk.fadeOut(Character.GAIT_FADE_SEC);
    }
    this.gait = next;
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** 숲 wall 충돌 — 반경 안으로 강제 (collision). */
  clampToCircle(centerX: number, centerZ: number, radius: number): void {
    const dx = this.group.position.x - centerX;
    const dz = this.group.position.z - centerZ;
    const dist = Math.hypot(dx, dz);
    if (dist > radius) {
      this.group.position.x = centerX + (dx / dist) * radius;
      this.group.position.z = centerZ + (dz / dist) * radius;
    }
  }

  /**
   * 채팅 메시지 결 머리 위 말풍선 attach (Step 1.7).
   *
   * 새 메시지는 머리 바로 위(BUBBLE_BASE_Y), 기존 bubble 들은 한 칸씩(STACK_SPACING) 위로 밀려 올라간다.
   * 6초 timer 는 각 bubble 별로 독립 — 만료 순서대로 자기 위치에서 dispose (남은 결로 위치 조정 X).
   * MAX_BUBBLES 초과 시 가장 오래된 결로 즉시 dispose (FIFO).
   */
  attachBubble(text: string): void {
    // FIFO 한도 — 가장 오래된 결로 즉시 제거 (timer 무관)
    if (this.bubbles.length >= Character.MAX_BUBBLES) {
      const oldest = this.bubbles.shift();
      if (oldest) {
        this.group.remove(oldest.sprite);
        oldest.dispose();
      }
    }

    // 기존 bubble 들 한 칸씩 위로
    for (const existing of this.bubbles) {
      existing.sprite.position.y += Character.BUBBLE_STACK_SPACING;
    }

    // 새 bubble 은 머리 바로 위
    const bubble: SpeechBubble = new SpeechBubble(text, () => {
      this.removeBubble(bubble);
    });
    bubble.sprite.position.y = this.bodyHeight + Character.BUBBLE_BASE_Y;
    this.bubbles.push(bubble);
    this.group.add(bubble.sprite);
  }

  private removeBubble(bubble: SpeechBubble): void {
    const idx = this.bubbles.indexOf(bubble);
    if (idx === -1) return;
    this.bubbles.splice(idx, 1);
    this.group.remove(bubble.sprite);
    bubble.dispose();
  }

  /** SceneManager destroy 시 호출 — Sprite 는 disposeScene traverse 결로 안 잡혀서 명시 해제. */
  dispose(): void {
    for (const bubble of this.bubbles) {
      this.group.remove(bubble.sprite);
      bubble.dispose();
    }
    this.bubbles = [];
    // 주민 모델의 geometry/material 은 registry 템플릿과 공유 — 여기서 dispose 금지.
    // SceneManager.disposeScene 의 일괄 traverse 가 최종 정리를 맡는다.
    this.animal?.mixer.stopAllAction();
  }
}
