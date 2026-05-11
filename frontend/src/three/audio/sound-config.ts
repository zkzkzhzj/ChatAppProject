/**
 * 환경음 zone 정의 — 위치 기반 음량 (사용자 결 박음, 2026-05-11).
 *
 * 안식처 가드레일 D11 정합:
 * - 음량 ≤ 0.3 (잔잔한 결, EDM·시끄러운 BGM 위반 신호)
 * - 환경음 우선, BGM 잔잔
 *
 * 동작:
 * - VillageScene = 4개 사운드 (gentle-wind 글로벌 + crackling-fire 캠프파이어 + pond-water 연못 + forest-birds 숲 외곽)
 *   캐릭터 위치에 따라 거리 기반 음량 결 결.
 * - LibraryScene = gentle-wind 결만 옅게 (실내 단조).
 *
 * 자산 가이드: `frontend/public/assets/audio/ambient/README.md`
 */

/** 위치 결 결 결 — 거리 결 결 결 결 결 결 결 결 결 결 결 결 결. */
export type SoundPositionModel =
  /** 캐릭터 위치 무관, 항상 maxVolume 결 결. */
  | { kind: 'global' }
  /** 특정 좌표 결 가까이 갈수록 maxVolume 에 가까워짐. fadeRadius 밖 = 무음. */
  | { kind: 'point'; x: number; z: number; fadeRadius: number }
  /** 마을 중심에서 멀어질수록 maxVolume 에 가까워짐 (숲 외곽 결). */
  | { kind: 'forest-edge'; outerRadius: number };

export interface SoundZone {
  readonly id: string;
  readonly src: string;
  readonly description: string;
  /** 캐릭터 위치가 zone 결 결 결 결 결 결 결 음량. D11 결 ≤ 0.3 정합. */
  readonly maxVolume: number;
  readonly model: SoundPositionModel;
}

/**
 * 마을 zone — 4개 사운드:
 * - gentle-wind = 글로벌 baseline (어디서든 옅게)
 * - crackling-fire = 캠프파이어 (0, 8) 결 가까이
 * - pond-water = 연못 (-5, -5) 결 가까이
 * - forest-birds = 숲 외곽 (마을 wall 결 가까이)
 */
export const VILLAGE_SOUNDS: readonly SoundZone[] = [
  {
    id: 'gentle-wind',
    src: '/assets/audio/ambient/gentle-wind.mp3',
    description: '잔잔한 바람 (마을 전역 baseline)',
    maxVolume: 0.25,
    model: { kind: 'global' },
  },
  {
    id: 'crackling-fire',
    src: '/assets/audio/ambient/crackling-fire.mp3',
    description: '캠프파이어 모닥불 (모임 광장 가까이)',
    maxVolume: 0.22,
    model: { kind: 'point', x: 0, z: 8, fadeRadius: 8 },
  },
  {
    id: 'pond-water',
    src: '/assets/audio/ambient/pond-water.mp3',
    description: '연못 물소리 (사용자 의견 — "물소리 좋거든")',
    maxVolume: 0.2,
    model: { kind: 'point', x: -5, z: -5, fadeRadius: 6 },
  },
  {
    id: 'forest-birds',
    src: '/assets/audio/ambient/forest-birds.mp3',
    description: '숲 새소리 (마을 외곽 가까이)',
    maxVolume: 0.25,
    model: { kind: 'forest-edge', outerRadius: 28 },
  },
] as const;

/**
 * 도서관 zone — 1개 사운드:
 * - gentle-wind = 옅게만 (실내 단조 결)
 */
export const LIBRARY_SOUNDS: readonly SoundZone[] = [
  {
    id: 'gentle-wind',
    src: '/assets/audio/ambient/gentle-wind.mp3',
    description: '실내 옅은 바람 (도서관 단조)',
    maxVolume: 0.1,
    model: { kind: 'global' },
  },
] as const;

/**
 * 마스터 볼륨 — 전체 환경음 출력 곱. 1.0 = 개별 maxVolume 가 그대로 실효 음량.
 * spec D11 가드레일 "음량 ≤ 0.3" 은 maxVolume 기준으로 강제.
 */
export const MASTER_VOLUME = 1.0;
