/**
 * 마을 주민 배정 — displayId 기반 결정적 해시.
 *
 * 랜덤이 아니라 결정적이어야 하는 이유: 다른 유저의 화면에서도 내가 같은 주민으로
 * 보여야 한다. displayId 는 모든 클라이언트가 공유하는 유일한 식별자이므로
 * 이것을 시드로 쓰면 백엔드 변경 없이 전 클라이언트 표현이 일치한다.
 *
 * 로스터 = 사람 4 (동물 모델은 2026-06-15 디자인 피드백으로 제외).
 * 모델: Quaternius Animated Men/Women Pack (CC0) — public/models/animals/LICENSE.md
 */
export const VILLAGER_SPECIES = [
  'villager-m1',
  'villager-m2',
  'villager-f1',
  'villager-f2',
] as const;

export type AnimalSpecies = (typeof VILLAGER_SPECIES)[number];

/** FNV-1a 32bit — 짧은 문자열에서도 분포 양호, 의존성 0. */
export function hashDisplayId(displayId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < displayId.length; i += 1) {
    hash ^= displayId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function speciesFor(displayId: string): AnimalSpecies {
  return VILLAGER_SPECIES[hashDisplayId(displayId) % VILLAGER_SPECIES.length];
}

/**
 * 같은 종이라도 개체 차이가 보이도록 크기 미세 변주 (±8%).
 * 종 선택과 다른 비트를 쓰도록 시드에 suffix 를 박는다.
 */
export function scaleJitterFor(displayId: string): number {
  const t = (hashDisplayId(`${displayId}#scale`) % 1000) / 1000;
  return 0.92 + t * 0.16;
}
