import * as THREE from 'three';

import { CAMERA, TRANSITION, VILLAGE } from './constants';
import { InputState } from './input';
import { LibraryScene } from './scenes/LibraryScene';
import { VillageScene } from './scenes/VillageScene';

type Active = 'village' | 'library' | 'transitioning';

/**
 * Scene 매니저 — VillageScene ↔ LibraryScene 전환.
 * URL 안 바뀜 (spec D10). React state 결 X, three.js 자체 결로.
 *
 * 전환 흐름 (페이드, spec D11 카메라 워크 정합):
 * 1. 캐릭터가 도서관 입구 트리거 들어옴
 * 2. fade out (TRANSITION_FADE_MS)
 * 3. activeScene 교체 + 캐릭터 위치 reset
 * 4. fade in
 */
export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private village: VillageScene;
  private library: LibraryScene;
  private input: InputState;
  private active: Active = 'village';
  private fadeAlpha = 0;
  private fadeDirection: -1 | 0 | 1 = 0;
  private fadeOverlay: HTMLDivElement;
  private rafId = 0;
  private lastTime = 0;
  private destroyed = false;

  constructor(parent: HTMLElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    parent.appendChild(this.renderer.domElement);

    // Camera (정적 follow, spec D11 — orbit X)
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.FOV,
      parent.clientWidth / parent.clientHeight,
      0.1,
      120,
    );

    // Scenes
    this.village = new VillageScene();
    this.library = new LibraryScene();

    // Input
    this.input = new InputState();

    // 페이드 오버레이 (Scene 전환 결)
    this.fadeOverlay = document.createElement('div');
    Object.assign(this.fadeOverlay.style, {
      position: 'absolute',
      inset: '0',
      background: '#000',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'none',
    });
    parent.appendChild(this.fadeOverlay);

    // 카메라 첫 위치 (캐릭터 위)
    this.activeScene().updateCamera(this.camera);
    // 즉시 한 번 더 lerp 결로 박음 (첫 프레임 결 부드럽게)
    this.activeScene().updateCamera(this.camera);

    window.addEventListener('resize', this.onResize);
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  private activeScene(): VillageScene | LibraryScene {
    return this.active === 'library' ? this.library : this.village;
  }

  private onResize = (): void => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private tick = (now: number): void => {
    if (this.destroyed) return;
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const sceneObj = this.activeScene();

    // 입력은 transition 중에는 무시 (캐릭터 결 멈춤)
    if (this.active !== 'transitioning') {
      const keys = this.input.read();
      sceneObj.character.update(keys, delta);

      // collision: 마을은 숲 wall 안, 도서관은 벽 안 (간단히 Box clamp)
      if (this.active === 'village') {
        sceneObj.character.clampToCircle(0, 0, VILLAGE.FOREST_WALL_RADIUS - 1);
      } else {
        // 도서관: -7 ~ 7 (x), -6 ~ 6 (z)
        const p = sceneObj.character.position;
        p.x = Math.max(-6.5, Math.min(6.5, p.x));
        p.z = Math.max(-5.5, Math.min(5.8, p.z));
      }

      // 진입·퇴장 트리거
      if (this.active === 'village' && (sceneObj as VillageScene).isAtLibraryDoor()) {
        this.startTransition('library');
      } else if (this.active === 'library' && (sceneObj as LibraryScene).isAtExit()) {
        this.startTransition('village');
      }
    }

    sceneObj.updateCamera(this.camera);

    // 페이드 결
    if (this.fadeDirection !== 0) {
      this.fadeAlpha += (this.fadeDirection * delta * 1000) / TRANSITION.FADE_DURATION_MS;
      this.fadeAlpha = Math.max(0, Math.min(1, this.fadeAlpha));
      this.fadeOverlay.style.opacity = String(this.fadeAlpha);

      if (this.fadeDirection === 1 && this.fadeAlpha >= 1) {
        // fade out 완료 — Scene 교체
        this.completeTransition();
      } else if (this.fadeDirection === -1 && this.fadeAlpha <= 0) {
        // fade in 완료
        this.fadeDirection = 0;
        this.active = this.pendingTarget;
      }
    }

    this.renderer.render(sceneObj.scene, this.camera);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private pendingTarget: Active = 'village';

  private startTransition(target: 'village' | 'library'): void {
    this.pendingTarget = target;
    this.active = 'transitioning';
    this.fadeDirection = 1; // fade out
  }

  private completeTransition(): void {
    if (this.pendingTarget === 'library') {
      // 도서관 진입 — 입구 결로 reset
      this.library.character.position.set(0, 0, 4);
    } else {
      // 마을 복귀 — 도서관 입구 앞 결로 reset (트리거 결 결 결 결 결로 약간 거리)
      this.village.character.position.set(0, 0, VILLAGE.LIBRARY_Z + 5);
    }
    this.active = this.pendingTarget;
    this.fadeDirection = -1; // fade in
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.input.destroy();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.fadeOverlay.remove();
  }
}
