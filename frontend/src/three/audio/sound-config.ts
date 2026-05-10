/**
 * 환경음 자산 path + 볼륨 설정.
 * 자산 가이드: `frontend/public/assets/audio/ambient/README.md`
 *
 * 안식처 가드레일 D11 정합:
 * - 음량 ≤ 0.3 (잔잔한 결, EDM·시끄러운 BGM 위반 신호)
 * - 환경음 우선, BGM 잔잔
 * - loop 결 자연스러운 결 (loop point 잘 맞는 자산만 사용)
 */

export interface AmbientSoundDef {
  /** 자산 식별자 */
  readonly id: string;
  /** 공개 path (frontend/public 기준 상대) */
  readonly src: string;
  /** 볼륨 0~1 (D11: ≤ 0.3) */
  readonly volume: number;
  /** loop 여부 */
  readonly loop: boolean;
  /** 한 줄 설명 (UI 표기·디버그용) */
  readonly description: string;
}

export const AMBIENT_SOUNDS: readonly AmbientSoundDef[] = [
  {
    id: 'forest-birds',
    src: '/assets/audio/ambient/forest-birds.mp3',
    volume: 0.18,
    loop: true,
    description: '숲 새소리 (마을 외곽 자연 결)',
  },
  {
    id: 'gentle-wind',
    src: '/assets/audio/ambient/gentle-wind.mp3',
    volume: 0.12,
    loop: true,
    description: '잔잔한 바람 (옅은 베이스 결)',
  },
  {
    id: 'pond-water',
    src: '/assets/audio/ambient/pond-water.mp3',
    volume: 0.15,
    loop: true,
    description: '연못 물소리 (사용자 결 — "물소리 좋거든")',
  },
] as const;

/** 마스터 볼륨 (전체 환경음 결 결 결). D11: ≤ 0.3 */
export const MASTER_VOLUME = 0.25;

/** 자산 누락 시 무음 결로 graceful 진행 (개발 단계 결) */
export const ALLOW_MISSING_ASSETS = true;
