# 환경음 자산 가이드

> spec [village-3d.md](../../../../../docs/specs/features/village-3d.md) D6 (v) 자연 환경음 + D11 안식처 가드레일 6축 정합.
> Step 2 — 위치 기반 환경음 4종 (사용자 결정 박음, 2026-05-11).
>
> **2026-05-18 갱신**: 자산은 S3 외부 호스팅 (`gohyang-s3-buket-20260514`, prefix `v1/audio/ambient/`).
> `frontend/.gitignore`로 추적 X, 코드에선 `NEXT_PUBLIC_ASSETS_BASE_URL` 환경변수로 fetch.
> 출처/라이선스는 [`../LICENSE.md`](../LICENSE.md), 호스팅 결정은 [ADR 009](../../../../../docs/architecture/decisions/009-s3-asset-hosting.md).

---

## 필요 파일 (4개)

| 파일명 | 위치 모델 | 동작 |
|---|---|---|
| `gentle-wind.mp3` | global | 마을 어디서든 옅게 (baseline). 도서관에서도 옅게. |
| `crackling-fire.mp3` | point (0, 8) | 캠프파이어 결 가까이 갈수록 ↑ (fadeRadius 8) |
| `pond-water.mp3` | point (-5, -5) | 연못 결 가까이 갈수록 ↑ (fadeRadius 6). 사용자 결 — "물소리 좋거든" |
| `forest-birds.mp3` | forest-edge | 마을 중심에서 멀어질수록 ↑ (outerRadius 28, 숲 wall 가까이) |

마스터 볼륨 0.5 × 개별 maxVolume (≤ 0.22) = 실제 음량. D11 가드레일 ≤ 0.3 정합.

---

## 자산 받는 곳 (CC0 / Mixkit Free)

### 1. Pixabay (CC0, attribution 비강제)

[pixabay.com/sound-effects](https://pixabay.com/sound-effects/) — 검색어 추천:

- **gentle-wind**: `wind ambient gentle`, `breeze loop`
- **crackling-fire**: `crackling fire`, `campfire ambient`, `fireplace`
- **pond-water**: `water stream loop`, `pond water`
- **forest-birds**: `forest birds ambient`, `birds chirping`

다운로드 → mp3 변환 (필요 시) → 본 디렉토리에 위 파일명으로 저장.

### 2. Mixkit Free (Mixkit 라이선스, commercial OK)

[mixkit.co/free-sound-effects/ambience/](https://mixkit.co/free-sound-effects/ambience/)

- "Light wind through trees" 결
- "Crackling fire" 결
- "Stream water flowing" 결
- "Forest birds chirp" 결

### 3. Freesound.org (CC0 / CC BY 페이지별 확인)

[freesound.org](https://freesound.org/) — 라이선스 페이지별 확인 필수. CC0 또는 CC BY 만 사용.

---

## 라이선스 명시

자산 다운로드 후 `LICENSE.md` 갱신 필요:

- 출처 (URL)
- 작가 (CC BY 결로 박음)
- 라이선스 (CC0 / CC BY / Mixkit Free)
- 다운로드 날짜

---

## 자산 없으면?

`AmbientSoundManager` 의 `onloaderror` 결로 무음 graceful 진행 (개발 단계).
운영 배포는 별도 트랙 [`s3-media`](../../../../../docs/handover.md) 결로 자산을 S3·Cloudflare R2 결로 마이그 — spec D4' 정정.

---

## 통합 흐름 (`AmbientSoundManager.ts`)

1. 페이지 진입 시 `Howl` 인스턴스 4개 preload (시작 음량 0)
2. 사용자 첫 interaction (click·keypress·touchstart) → 자동 unlock + 재생 시작
3. **매 프레임** `updatePosition(charX, charZ)` 호출 → 각 사운드의 위치 모델 결 결 거리 기반 음량 계산 + smoothing (lerp 0.05) 결로 부드럽게 fade
4. Scene 전환:
   - 마을 진입: 4개 사운드 활성 (위치 기반)
   - 도서관 진입: gentle-wind 만 옅게 (실내 단조), 다른 결 결 결 결 무음

브라우저 autoplay 정책 결 — 사용자 interaction 없으면 재생 불가. 첫 click 또는 Space (점프) 후 재생 시작.

---

## 자산 박지 않은 경우 (현재 결)

`frontend/.gitignore` 결로 mp3 추적 X (spec D4' — binary asset 외부 인프라 결). 사용자 본인 로컬 결로 받아서 박음. 자산 누락 시 `console.warn` 만 박고 무음 진행.
