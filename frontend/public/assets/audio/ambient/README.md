# 환경음 자산 가이드

> spec [village-3d.md](../../../../../docs/specs/features/village-3d.md) D6 (v) 자연 환경음 + D11 안식처 가드레일 6축 정합.
> Step 2 (PR 진행 중) — 글로벌 BGM 3종.

---

## 필요 파일 (3개)

| 파일명 | 용도 | 길이 권장 | 음량 (`sound-config.ts`) |
|---|---|---|---|
| `forest-birds.mp3` | 숲 새소리 (마을 외곽 자연 결) | 30초~2분, loop 자연스러운 결 | 0.18 |
| `gentle-wind.mp3` | 잔잔한 바람 (옅은 베이스 결) | 30초~2분 | 0.12 |
| `pond-water.mp3` | 연못 물소리 (사용자 결 — "물소리 좋거든") | 30초~2분 | 0.15 |

마스터 볼륨 0.25 × 개별 볼륨 = 실제 음량. D11 가드레일 ≤ 0.3 정합.

---

## 자산 받는 곳 (CC0 / Mixkit Free)

### 1. Pixabay (CC0, attribution 비강제)

[pixabay.com/sound-effects](https://pixabay.com/sound-effects/) — 검색어 추천:

- **forest-birds**: `forest birds ambient`, `birds chirping`
- **gentle-wind**: `wind ambient gentle`, `breeze loop`
- **pond-water**: `water stream loop`, `pond water`

다운로드 → mp3 변환 (필요 시) → 본 디렉토리에 위 파일명으로 저장.

### 2. Mixkit Free (Mixkit 라이선스, commercial OK)

[mixkit.co/free-sound-effects/ambience/](https://mixkit.co/free-sound-effects/ambience/)

- "Forest birds chirp" 결
- "Light wind through trees" 결
- "Stream water flowing" 결

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

`sound-config.ts` 의 `ALLOW_MISSING_ASSETS = true` 결로 무음 graceful 진행 (개발 단계).
운영 배포 전 반드시 자산 박고 `ALLOW_MISSING_ASSETS = false` 결로 박음.

---

## 통합 흐름 (`AmbientSoundManager.ts`)

1. 페이지 진입 시 `Howl` 인스턴스 3개 preload
2. 사용자 첫 interaction (click·keypress·touchstart) → 자동 unlock + 재생
3. Scene 전환 시 음량 fade:
   - 마을 진입: 모두 ON (새 0.18 / 바람 0.12 / 물 0.15)
   - 도서관 진입: 새·물 OFF, 바람만 0.05 (실내 결)

브라우저 autoplay 정책 결 — 사용자 interaction 없으면 재생 불가. 빈 마을 첫 진입 시 무음, 캐릭터 한 번 움직이면 재생 시작.
