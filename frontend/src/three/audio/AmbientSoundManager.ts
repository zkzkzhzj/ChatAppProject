import { Howl, Howler } from 'howler';

import { LIBRARY_SOUNDS, MASTER_VOLUME, type SoundZone, VILLAGE_SOUNDS } from './sound-config';

type ZoneName = 'village' | 'library';

interface SoundEntry {
  howl: Howl;
  def: SoundZone;
}

/**
 * 환경음 매니저 — 위치 기반 음량 (사용자 결 박음, 2026-05-11).
 *
 * D6 (v) 자연 환경음 본질 가치 + D11 안식처 가드레일 음향 축.
 *
 * 흐름:
 * 1. 페이지 진입 시 모든 자산 preload (마을·도서관 합집합)
 * 2. 첫 사용자 interaction (click·keypress·touchstart) → autoplay unlock
 * 3. enterVillage() / enterLibrary() 결로 활성 zone 박음
 * 4. SceneManager 가 매 프레임 updatePosition(charX, charZ) 호출 →
 *    각 사운드 의 위치 모델 결 결 결 거리 기반 음량 박음 (smoothing 결로 부드럽게)
 *
 * 위치 모델 (sound-config.ts):
 * - global = 항상 maxVolume
 * - point = 특정 좌표 결 가까이 갈수록 maxVolume (fadeRadius 밖 = 무음)
 * - forest-edge = 마을 중심에서 멀어질수록 maxVolume (외곽 가까이)
 */
export class AmbientSoundManager {
  private sounds = new Map<string, SoundEntry>();
  private activeZone: ZoneName = 'village';
  private unlocked = false;
  private destroyed = false;

  constructor() {
    Howler.volume(MASTER_VOLUME);
    this.preloadAll();
    this.attachUnlockListeners();
  }

  /** 마을 + 도서관 자산 합집합 preload (id 중복 결로 결 결 결 결 결 결 결 결 결 결 결 결). */
  private preloadAll(): void {
    const all = new Map<string, SoundZone>();
    for (const def of [...VILLAGE_SOUNDS, ...LIBRARY_SOUNDS]) {
      // 같은 id 가 양쪽에 있으면 (예: gentle-wind) 한 번만 preload
      if (!all.has(def.id)) all.set(def.id, def);
    }

    for (const def of all.values()) {
      const howl = new Howl({
        src: [def.src],
        loop: true,
        volume: 0, // 시작 = 무음 (위치 기반 결로 매 프레임 박음)
        // HTML5 Audio — Web Audio API 디코더가 일부 mp3 인코딩에 까다로워서
        // "Decoding audio data failed" 발생. Step 2 글로벌 음량 결로는 충분.
        html5: true,
        preload: true,
        onloaderror: (_id, error) => {
          console.warn(`[AmbientSound] '${def.id}' 자산 로드 실패 (무음 진행):`, error);
        },
      });
      this.sounds.set(def.id, { howl, def });
    }
  }

  /** 첫 사용자 interaction (click·keypress·touchstart) → 자동 재생 시작 */
  private attachUnlockListeners(): void {
    const unlock = (): void => {
      if (this.unlocked || this.destroyed) return;
      this.unlocked = true;
      for (const { howl } of this.sounds.values()) {
        howl.play();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  enterVillage(): void {
    this.activeZone = 'village';
  }

  enterLibrary(): void {
    this.activeZone = 'library';
  }

  /**
   * 캐릭터 위치 결과 매 프레임 결 결 결 결 결 결 결 결 결.
   * SceneManager.tick() 결로 결 결.
   */
  updatePosition(charX: number, charZ: number): void {
    const activeSounds = this.activeZone === 'village' ? VILLAGE_SOUNDS : LIBRARY_SOUNDS;
    const activeIds = new Set(activeSounds.map((d) => d.id));

    for (const [id, entry] of this.sounds) {
      let target = 0;
      if (activeIds.has(id)) {
        const def = activeSounds.find((d) => d.id === id);
        if (def) target = this.calculateVolume(def, charX, charZ);
      }
      // smoothing — 갑작스런 점프 막음 (lerp 0.05 결로 결 결 결 결 결 약 0.5초 결)
      const current = entry.howl.volume();
      const currentNum = typeof current === 'number' ? current : 0;
      const next = currentNum + (target - currentNum) * 0.05;
      entry.howl.volume(next);
    }
  }

  private calculateVolume(def: SoundZone, x: number, z: number): number {
    const max = def.maxVolume;
    const m = def.model;
    switch (m.kind) {
      case 'global':
        return max;
      case 'point': {
        const dist = Math.hypot(x - m.x, z - m.z);
        const proximity = Math.max(0, 1 - dist / m.fadeRadius);
        return max * proximity;
      }
      case 'forest-edge': {
        const distFromCenter = Math.hypot(x, z);
        const proximity = Math.min(1, distFromCenter / m.outerRadius);
        return max * proximity;
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const { howl } of this.sounds.values()) {
      howl.stop();
      howl.unload();
    }
    this.sounds.clear();
  }
}
