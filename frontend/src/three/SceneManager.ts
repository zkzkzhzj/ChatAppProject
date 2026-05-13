import * as THREE from 'three';

import type { PositionBroadcast } from '@/lib/websocket/stompClient';
import { sendLeaveVillage } from '@/lib/websocket/stompClient';
import type { ChatMessage } from '@/types/chat';

import { AmbientSoundManager } from './audio/AmbientSoundManager';
import { CAMERA, TRANSITION, VILLAGE } from './constants';
import { InputState } from './input';
import { PositionSync } from './network/PositionSync';
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
  private ambientSound: AmbientSoundManager;
  private positionSync: PositionSync;
  private active: Active = 'village';
  // active === 'transitioning' 동안 어떤 Scene 을 렌더링할지 — fade out 결과 source scene 유지
  // (Codex P2 — fade out 시작하자마자 default 로 떨어져서 화면 pop 되는 결 막음)
  private sourceScene: 'village' | 'library' = 'village';
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
    // three r184 에서 PCFSoftShadowMap deprecated. PCFShadowMap 으로 대체.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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

    // Input — 키보드(WASD/점프) + 모바일 가상 조이스틱(InputState.setJoystick).
    // tap-to-move 결 거부 (사용자 결정 2026-05-13) — 모바일은 조이스틱 상시 노출 결로 정합.
    this.input = new InputState();

    // Ambient sound (D6 v + D11 음향 결)
    this.ambientSound = new AmbientSoundManager();
    this.ambientSound.enterVillage();

    // 멀티유저 위치 송신·필터 (Step 1.5)
    this.positionSync = new PositionSync();

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
    if (this.active === 'transitioning') {
      // transition 중에는 source scene 유지 (fade out 끝날 때까지)
      return this.sourceScene === 'library' ? this.library : this.village;
    }
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

      // 마을에 있을 때만 자기 위치 broadcast (도서관은 spec §2.2 Out)
      if (this.active === 'village') {
        const p = sceneObj.character.position;
        this.positionSync.sendIfChanged(p.x, p.z);
      }
    }

    // RemotePlayer lerp 진행 (마을 전용)
    if (this.active === 'village' || (this.active === 'transitioning' && this.sourceScene === 'village')) {
      this.village.updateRemotePlayers();
    }

    sceneObj.updateCamera(this.camera);

    // 위치 기반 환경음 (sound-config.ts zone 결로 음량 결 결)
    const charPos = sceneObj.character.position;
    this.ambientSound.updatePosition(charPos.x, charPos.z);

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

  // pendingTarget 은 startTransition 호출 시점에 'village' | 'library' 만 들어가므로
  // sourceScene 과 동일하게 좁힌 타입 사용. 'transitioning' 은 active 만 가짐.
  private pendingTarget: 'village' | 'library' = 'village';

  private startTransition(target: 'village' | 'library'): void {
    // 현재 보이는 scene 을 source 로 박아 fade out 동안 유지
    this.sourceScene = target === 'library' ? 'village' : 'library';
    this.pendingTarget = target;
    this.active = 'transitioning';
    this.fadeDirection = 1; // fade out

    // 도서관 진입 즉시 LEAVE broadcast — 다른 클라이언트에서 본인 placeholder 제거 (Codex P1).
    // disconnect listener 는 STOMP 세션 종료 시점에만 동작 결로 마을 떠나기에는 닿지 X.
    if (target === 'library') {
      sendLeaveVillage();
    }
  }

  private completeTransition(): void {
    if (this.pendingTarget === 'library') {
      // 도서관 진입 — 입구 결로 reset
      this.library.character.position.set(0, 0, 4);
      this.ambientSound.enterLibrary();
      // 마을 다른 유저 placeholder 모두 제거 + 송신 throttle 상태 초기화
      // (도서관 밖 위치 변화는 spec §2.2 Out)
      this.village.clearRemotePlayers();
      this.positionSync.reset();
    } else {
      // 마을 복귀 — 도서관 입구 앞 결로 reset (트리거 즉시 재진입 막는 거리)
      this.village.character.position.set(0, 0, VILLAGE.LIBRARY_Z + 5);
      this.ambientSound.enterVillage();
    }
    // fade in 동안 active='transitioning' 유지하되 sourceScene 은 target 으로 갱신
    // (그래야 activeScene() 이 새 scene 을 렌더링하면서 fade in 진행)
    this.sourceScene = this.pendingTarget;
    this.fadeDirection = -1; // fade in
  }

  /**
   * STOMP 위치 broadcast 수신 시 외부에서 호출 (ThreeGame 가 bridge 구독).
   * self filter 통과 + 마을 활성 상태에서만 적용.
   */
  applyRemotePosition(pos: PositionBroadcast): void {
    if (this.destroyed) return;
    if (!this.positionSync.shouldRender(pos)) return;
    // 마을 활성 상태에서만 적용. transitioning 결로 fade-in (sourceScene=library)
    // 결로 들어오는 broadcast 결로 offscreen 마을에 stale placeholder 박힘 → 마을 복귀 시
    // 재출현하는 회귀 차단 (Codex P2).
    if (this.active !== 'village') return;
    this.village.applyRemotePosition(pos);
  }

  /** 토큰 발급·변경 시 외부에서 호출 (tokenBridge.onDisplayIdChange). */
  setSelfId(id: string | null): void {
    this.positionSync.setSelfId(id);
    this.selfDisplayId = id;
  }

  /** 가상 조이스틱 입력 (Step 1.7 모바일 hybrid). dx/dz ∈ [-1, 1]. */
  setJoystickInput(dx: number, dz: number): void {
    if (this.destroyed) return;
    this.input.setJoystick(dx, dz);
  }

  /** ChatInputAnchor 결로 사용 — 자기 캐릭터 머리 위 위치 계산용. 마을 활성 시에만 유효. */
  getMyCharacterPosition(): THREE.Vector3 | null {
    if (this.destroyed || this.active !== 'village') return null;
    return this.village.character.position;
  }

  /** ChatInputAnchor 결로 사용 — projection matrix 결로 Vector3→screen 변환. */
  getCamera(): THREE.PerspectiveCamera | null {
    if (this.destroyed) return null;
    return this.camera;
  }

  /**
   * 채팅 메시지 수신 시 외부에서 호출 (chatBridge.onChatMessage).
   * USER 메시지만 머리 위 말풍선 — NPC/SYSTEM 은 ChatDrawer 내역에만 표시.
   * senderId → `user-{id}` (백엔드 PositionUpdateEvent.displayId 정합).
   */
  applyChatMessage(msg: ChatMessage): void {
    if (this.destroyed) return;
    if (this.active !== 'village') return;
    if (msg.senderType !== 'USER' || msg.senderId == null) return;

    const displayId = `user-${String(msg.senderId)}`;
    if (displayId === this.selfDisplayId) {
      this.village.character.attachBubble(msg.body);
      return;
    }
    this.village.applyChatBubbleTo(displayId, msg.body);
  }

  private selfDisplayId: string | null = null;

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.input.destroy();
    this.ambientSound.destroy();
    // 자기 캐릭터·RemotePlayer bubble 명시 해제 (Sprite 결 disposeScene traverse 결 안 잡힘)
    this.village.character.dispose();
    this.library.character.dispose();
    this.village.clearRemotePlayers();
    // React Strict Mode + HMR 환경에서 mount/unmount 가 반복되며
    // Geometry/Material 이 GPU 와 JS heap 양쪽에 누적되는 leak 방지.
    // renderer.dispose() 만으로는 텍스처 캐시만 정리되므로 Scene 직접 traverse.
    this.disposeScene(this.village.scene);
    this.disposeScene(this.library.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.fadeOverlay.remove();
  }

  private disposeScene(scene: THREE.Scene): void {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      // THREE.Mesh 의 generic default 가 unsafe-* 룰을 자극하므로 명시적 cast.
      const mesh = obj as THREE.Mesh;
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((m) => {
          m.dispose();
        });
      } else {
        material.dispose();
      }
    });
    scene.clear();
  }
}
