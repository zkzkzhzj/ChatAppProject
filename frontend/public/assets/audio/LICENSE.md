# 오디오 자산 라이선스

> 본 디렉토리의 mp3 자산은 git에 추적되지 않는다 (`frontend/.gitignore` 참조).
> 운영 환경에서는 S3 버킷 `gohyang-s3-buket-20260514`의 `v1/audio/` prefix에서 fetch한다.
> ADR 009 (`docs/architecture/decisions/009-s3-asset-hosting.md`) 참조.

---

## 환경음 (`ambient/`)

4곡 모두 **Pixabay Content License** (CC0 기반, 상업적 사용 허용, attribution 비강제).

| 파일 | 출처 | 라이선스 | 다운로드 |
|---|---|---|---|
| `gentle-wind.mp3` | [Pixabay](https://pixabay.com/sound-effects/) | Pixabay Content License | 2026-05-17 |
| `crackling-fire.mp3` | [Pixabay](https://pixabay.com/sound-effects/) | Pixabay Content License | 2026-05-17 |
| `pond-water.mp3` | [Pixabay](https://pixabay.com/sound-effects/) | Pixabay Content License | 2026-05-17 |
| `forest-birds.mp3` | [Pixabay](https://pixabay.com/sound-effects/) | Pixabay Content License | 2026-05-17 |

> Pixabay Content License 요지: 자유롭게 사용·수정·배포 가능 (상업적 포함). attribution 권장이지만 필수 X. 단순 재배포 자체를 상품화하는 행위는 금지.

---

## 향후 자산 추가 시

본 표에 한 줄 추가:

- 파일명
- 출처 URL
- 라이선스 종류 (CC0 / CC BY / Pixabay Content License / Mixkit Free / 구매)
- 다운로드 일자
- (CC BY인 경우) 저작자 + 표기 의무 내용

자산이 변경되거나 추가되면 **사용자가 AWS 콘솔/CLI 결로 `v1/audio/`에 직접 업로드**. mp3는 git 추적 X 결로 자동 sync 불가 (CD trigger 안 됨). ADR 009 §운영 매뉴얼 참조.
