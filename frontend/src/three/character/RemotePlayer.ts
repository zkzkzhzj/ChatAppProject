import * as THREE from 'three';

import { SpeechBubble } from '../chat/SpeechBubble';

/**
 * 다른 유저 placeholder (Step 1.5 — Step 3 에서 캐릭터 3D 모델로 교체 예정).
 *
 * 자기 캐릭터(`Character`)와 색만 다른 단순 박스. setTarget 으로 받은 좌표를
 * 매 프레임 `update()` 호출 시 lerp 로 점근시킨다 (네트워크 jitter 흡수).
 *
 * spawn/leave 가 잦은 객체라 자체 dispose 메서드 노출 — SceneManager.disposeScene 의
 * 일괄 traverse 와 별개로 즉시 dispose 가능해야 LEAVE 처리에서 GPU 리소스 leak X.
 *
 * Step 1.7: 채팅 메시지 결 머리 위 SpeechBubble attach (Character 결과 동일 패턴).
 */
const REMOTE_COLOR = 0x6a8aa3;
const BODY_HEIGHT = 1.4;
export const LERP_FACTOR = 0.15;

export class RemotePlayer {
  readonly group = new THREE.Group();
  private targetX: number;
  private targetZ: number;
  private readonly geometry: THREE.BoxGeometry;
  private readonly material: THREE.MeshLambertMaterial;
  /** 말풍선 stack — Character 결과 동일 패턴 (timer 결로 자연 해제, 안전판 50, spacing 0.95). */
  private bubbles: SpeechBubble[] = [];
  private static readonly MAX_BUBBLES = 50;
  private static readonly BUBBLE_BASE_Y = 2.4;
  private static readonly BUBBLE_STACK_SPACING = 0.95;

  constructor(initialX: number, initialZ: number) {
    this.geometry = new THREE.BoxGeometry(0.6, BODY_HEIGHT, 0.6);
    this.material = new THREE.MeshLambertMaterial({ color: REMOTE_COLOR });
    const body = new THREE.Mesh(this.geometry, this.material);
    body.position.y = BODY_HEIGHT / 2;
    body.castShadow = true;
    this.group.add(body);

    this.group.position.set(initialX, 0, initialZ);
    this.targetX = initialX;
    this.targetZ = initialZ;
  }

  setTarget(x: number, z: number): void {
    this.targetX = x;
    this.targetZ = z;
  }

  /** 매 프레임 호출. lerp 비율 일정 — delta 비독립이지만 60fps 가정으로 충분. */
  update(): void {
    this.group.position.x += (this.targetX - this.group.position.x) * LERP_FACTOR;
    this.group.position.z += (this.targetZ - this.group.position.z) * LERP_FACTOR;
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
    for (const bubble of this.bubbles) {
      this.group.remove(bubble.sprite);
      bubble.dispose();
    }
    this.bubbles = [];
    this.geometry.dispose();
    this.material.dispose();
  }
}
