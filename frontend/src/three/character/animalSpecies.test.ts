import { describe, expect, it } from 'vitest';

import { hashDisplayId, scaleJitterFor, speciesFor, VILLAGER_SPECIES } from './animalSpecies';

describe('animalSpecies — displayId 결정적 동물 배정', () => {
  it('같은 displayId 는 항상 같은 종', () => {
    for (const id of ['user-1', 'user-42', 'guest-abc', 'user-9999']) {
      expect(speciesFor(id)).toBe(speciesFor(id));
    }
  });

  it('해시는 결정적 — 같은 입력 같은 출력', () => {
    expect(hashDisplayId('user-1')).toBe(hashDisplayId('user-1'));
    expect(hashDisplayId('user-1')).not.toBe(hashDisplayId('user-2'));
  });

  it('충분한 id 표본에서 모든 종이 등장 (분포 확인)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      seen.add(speciesFor(`user-${String(i)}`));
    }
    expect(seen.size).toBe(VILLAGER_SPECIES.length);
  });

  it('배정 결과는 종 목록 안의 값', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(VILLAGER_SPECIES).toContain(speciesFor(`guest-${String(i)}`));
    }
  });

  it('크기 변주는 0.92~1.08 범위 + 결정적', () => {
    for (let i = 0; i < 100; i += 1) {
      const jitter = scaleJitterFor(`user-${String(i)}`);
      expect(jitter).toBeGreaterThanOrEqual(0.92);
      expect(jitter).toBeLessThanOrEqual(1.08);
      expect(scaleJitterFor(`user-${String(i)}`)).toBe(jitter);
    }
  });

  it('종 선택과 크기 변주는 독립 시드 — 같은 종이라도 크기 다양', () => {
    const sameSpeciesIds: string[] = [];
    const target = speciesFor('user-0');
    for (let i = 0; i < 200 && sameSpeciesIds.length < 5; i += 1) {
      const id = `user-${String(i)}`;
      if (speciesFor(id) === target) sameSpeciesIds.push(id);
    }
    const jitters = new Set(sameSpeciesIds.map(scaleJitterFor));
    expect(jitters.size).toBeGreaterThan(1);
  });
});
