/**
 * 마스터 음량 localStorage 영속 (spec village-3d-audio-improvements D3).
 *
 * - key: `audio.master.volume`
 * - 값: 0~1 사이 number (string으로 직렬화)
 * - 기본값: 1.0 (전체 음량)
 * - 시크릿 모드 / localStorage 비활성 시 graceful — try/catch 후 기본값 fallback
 */

const STORAGE_KEY = 'audio.master.volume';
const DEFAULT_VOLUME = 1.0;

/** localStorage에서 마스터 음량 read. 없거나 파싱 실패 시 기본값. */
export function loadMasterVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME; // SSR 가드
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, parsed));
  } catch {
    // 시크릿 모드 / quota / 접근 거부
    return DEFAULT_VOLUME;
  }
}

/** localStorage에 마스터 음량 save. 실패해도 throw 안 함 (UX 우선). */
export function saveMasterVolume(v: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, v));
  try {
    window.localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    // 시크릿 모드 / quota — 침묵 (다음 페이지 결로 기본값으로 동작)
  }
}
