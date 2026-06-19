import * as THREE from 'three';

import { SpeechBubble } from '../chat/SpeechBubble';
import { type AnimalInstance, animalModelRegistry } from './AnimalModelRegistry';
import { scaleJitterFor, speciesFor } from './animalSpecies';

/**
 * 다른 유저 — displayId 가 주어지면 그 유저의 주민 모델로 표시된다.
 *
 * 종 배정은 displayId 해시라서 내 화면의 이 유저와 그 유저 본인 화면의 자기
 * 캐릭터가 같은 모델이다. 모델 미로드 환경 (vitest 등) 은 박스 placeholder 유지.
 *
 * setTarget 으로 받은 좌표를 매 프레임 `update()` 호출 시 lerp 로 점근시킨다
 * (네트워크 jitter 흡수). 이동 중이면 walk, 멈추면 idle 애니메이션.
 *
 * spawn/leave 가 잦은 객체라 자체 dispose 메서드 노출 — SceneManager.disposeScene 의
 * 일괄 traverse 와 별개로 즉시 dispose 가능해야 LEAVE 처리에서 GPU 리소스 leak X.
 *
 * Step 1.7: 채팅 메시지 결 머리 위 SpeechBubble attach (Character 결과 동일 패턴).
 */
const REMOTE_COLOR = 0x6a8aa3;
const BODY_HEIGHT = 1.4;
export const LERP_FACTOR = 0.15;
/** 이 거리보다 target 이 멀면 "이동 중" — walk 애니메이션. */
const MOVING_EPSILON = 0.05;
const GAIT_FADE_SEC = 0.2;
const DEFAULT_DELTA = 1 / 60;

export class RemotePlayer {
  readonly group = new THREE.Group();
  private targetX: number;
  private targetZ: number;
  private targetY: number;
  private readonly geometry: THREE.BoxGeometry;
  private readonly material: THREE.MeshLambertMaterial;
  private readonly placeholderBody: THREE.Mesh;
  private animal: AnimalInstance | null = null;
  private adopted = false;
  private disposed = false;
  private gait: 'idle' | 'walk' = 'idle';
  /** 말풍선 stack — Character 결과 동일 패턴 (timer 결로 자연 해제, 안전판 50, spacing 0.95). */
  private bubbles: SpeechBubble[] = [];
  private static readonly MAX_BUBBLES = 50;
  private static readonly BUBBLE_BASE_Y = 0.75;
  private static readonly BUBBLE_STACK_SPACING = 0.95;

  constructor(initialX: number, initialZ: number, displayId?: string, initialY = 0) {
    this.geometry = new THREE.BoxGeometry(0.6, BODY_HEIGHT, 0.6);
    this.material = new THREE.MeshLambertMaterial({ color: REMOTE_COLOR });
    this.placeholderBody = new THREE.Mesh(this.geometry, this.material);
    this.placeholderBody.position.y = BODY_HEIGHT / 2;
    this.placeholderBody.castShadow = true;
    this.group.add(this.placeholderBody);

    this.group.position.set(initialX, initialY, initialZ);
    this.targetX = initialX;
    this.targetZ = initialZ;
    this.targetY = initialY;

    if (displayId) {
      this.adopted = true;
      animalModelRegistry.request(speciesFor(displayId), (instance) => {
        // LEAVE 가 로드보다 먼저 온 경우 — 늦은 콜백 무시 (leak 방지)
        if (this.disposed) return;
        this.swapToAnimal(instance, scaleJitterFor(displayId));
      });
    }
  }

  private swapToAnimal(instance: AnimalInstance, jitter: number): void {
    this.group.remove(this.placeholderBody);
    instance.object.scale.setScalar(jitter);
    this.group.add(instance.object);
    this.animal = instance;
  }

  setTarget(x: number, z: number, y = 0): void {
    this.targetX = x;
    this.targetZ = z;
    this.targetY = y;
  }

  /** 매 프레임 호출. lerp 비율 일정 — delta 비독립이지만 60fps 가정으로 충분. */
  update(delta: number = DEFAULT_DELTA): void {
    const dx = this.targetX - this.group.position.x;
    const dz = this.targetZ - this.group.position.z;
    const dy = this.targetY - this.group.position.y;
    this.group.position.x += dx * LERP_FACTOR;
    this.group.position.z += dz * LERP_FACTOR;
    this.group.position.y += dy * LERP_FACTOR;

    const moving = Math.hypot(dx, dz) > MOVING_EPSILON;
    if (moving) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }

    if (this.animal) {
      this.applyGait(moving ? 'walk' : 'idle');
      this.animal.mixer.update(delta);
    }
  }

  private applyGait(next: 'idle' | 'walk'): void {
    if (!this.animal || this.gait === next) return;
    const { walk } = this.animal;
    if (!walk) return;
    // idle 클립 재생 X (고개 젖힘 거슬림 — 사용자 피드백 2026-06-12). Character 와 동일.
    if (next === 'walk') {
      walk.reset().fadeIn(GAIT_FADE_SEC).play();
    } else {
      walk.fadeOut(GAIT_FADE_SEC);
    }
    this.gait = next;
  }

  /** 채팅 메시지 결 머리 위 말풍선 attach (Step 1.7) — Character.attachBubble 결과 동일 stack. */
  attachBubble(text: string): void {
    if (this.bubbles.length >= RemotePlayer.MAX_BUBBLES) {
      const oldest = this.bubbles.shift();
      if (oldest) {
        this.group.remove(oldest.sprite);
        oldest.dispose();
      }
    }
    for (const existing of this.bubbles) {
      existing.sprite.position.y += RemotePlayer.BUBBLE_STACK_SPACING;
    }
    const bubble: SpeechBubble = new SpeechBubble(text, () => {
      this.removeBubble(bubble);
    });
    bubble.sprite.position.y = BODY_HEIGHT + RemotePlayer.BUBBLE_BASE_Y;
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

  dispose(): void {
    this.disposed = true;
    for (const bubble of this.bubbles) {
      this.group.remove(bubble.sprite);
      bubble.dispose();
    }
    this.bubbles = [];
    // placeholder 박스는 인스턴스 소유 — 즉시 dispose.
    // 주민 모델의 geometry/material 은 registry 템플릿과 공유라 dispose 금지
    // (다른 RemotePlayer / Character 인스턴스가 같은 리소스를 그리는 중).
    this.geometry.dispose();
    this.material.dispose();
    if (this.animal) {
      this.animal.mixer.stopAllAction();
      this.group.remove(this.animal.object);
      this.animal = null;
    }
  }

  /** 주민 모델 채택 시도 여부 (디버그·테스트용). */
  get hasAdopted(): boolean {
    return this.adopted;
  }
}
