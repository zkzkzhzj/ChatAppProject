import { Howl, Howler } from 'howler';

import { AMBIENT_SOUNDS, MASTER_VOLUME } from './sound-config';

/**
 * 환경음 매니저 — 글로벌 BGM 결 (Howler.js).
 *
 * D6 (v) 자연 환경음 본질 가치 첫 시안 (spec village-3d.md).
 * D11 안식처 가드레일 정합:
 * - 환경음 우선, 음량 ≤ 0.3
 * - 잔잔한 loop (격렬·EDM 결 X)
 *
 * 브라우저 autoplay 정책 결 — 사용자 interaction (click·keypress) 후만 재생 가능.
 * 첫 인터랙션 결 hook 결 결로 unlock 박음.
 *
 * Step 2 한계: 글로벌 BGM 만. PositionalAudio (연못·캠프파이어 위치 결 결로 음량 변화)
 * 는 Step 2.5 또는 Step 3 결로 박음.
 */
export class AmbientSoundManager {
  private sounds = new Map<string, Howl>();
  private unlocked = false;
  private destroyed = false;

  constructor() {
    Howler.volume(MASTER_VOLUME);
    this.preload();
    this.attachUnlockListeners();
  }

  private preload(): void {
    for (const def of AMBIENT_SOUNDS) {
      const howl = new Howl({
        src: [def.src],
        loop: def.loop,
        volume: def.volume,
        // HTML5 Audio — Web Audio API 디코더가 일부 mp3 인코딩에 까다로워서
        // "Decoding audio data failed" 발생 (파일 자체는 정상 mp3 인데).
        // Step 2 = 글로벌 BGM 만 박음 → HTML5 Audio 결로 충분.
        // Step 2.5 PositionalAudio 도입 시 Web Audio API 필요 → 그때 자산 인코딩 검증 + 결 정정.
        html5: true,
        preload: true,
        onloaderror: (_id, error) => {
          // 자산 누락 시 무음으로 graceful 진행 (sound-config.ts ALLOW_MISSING_ASSETS 정책)
          // 운영 배포 전 자산 박고 본 onloaderror 가 호출되지 않는지 확인
          console.warn(`[AmbientSound] '${def.id}' 자산 로드 실패 (무음 진행):`, error);
        },
      });
      this.sounds.set(def.id, howl);
    }
  }

  /** 사용자 interaction (click·keypress) 한 번 발생 시 재생 시작 */
  private attachUnlockListeners(): void {
    const unlock = (): void => {
      if (this.unlocked || this.destroyed) return;
      this.unlocked = true;
      for (const sound of this.sounds.values()) {
        sound.play();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('touchstart', unlock, { once: false });
  }

  /** Scene 전환 시 결 결 결 결 결로 박음 — 마을 = 모두 ON, 도서관 = 새소리 OFF */
  enterVillage(): void {
    this.fadeTo('forest-birds', 0.18);
    this.fadeTo('gentle-wind', 0.12);
    this.fadeTo('pond-water', 0.15);
  }

  enterLibrary(): void {
    // 도서관 = 실내, 새·바람·물소리 페이드 아웃 (조용함 결)
    this.fadeTo('forest-birds', 0);
    this.fadeTo('gentle-wind', 0.05); // 옅은 바람만 결 결 결
    this.fadeTo('pond-water', 0);
  }

  private fadeTo(id: string, target: number): void {
    const sound = this.sounds.get(id);
    if (!sound) return;
    const current = sound.volume();
    sound.fade(typeof current === 'number' ? current : target, target, 800);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const sound of this.sounds.values()) {
      sound.stop();
      sound.unload();
    }
    this.sounds.clear();
  }
}
