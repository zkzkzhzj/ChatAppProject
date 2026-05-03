# Village Asset Licenses

> 마음의 고향 마을 시각 자산의 라이선스 / Attribution 명시.
> 트랙 [`village-design-mvp`](../../../../docs/handover/track-village-design-mvp.md) 의 spec.decisions D4 정책에 따라 commercial-safe + GitHub-publishable 자산만 commit.

---

## 1. Kenney — Tiny Town

- **출처**: https://kenney.nl/assets/tiny-town
- **저작자**: Kenney (kenney.nl)
- **라이선스**: **Creative Commons Zero (CC0)** — Public Domain
- **라이선스 URL**: https://creativecommons.org/publicdomain/zero/1.0/
- **상업 사용**: ✅ 자유
- **재배포**: ✅ 자유
- **Attribution**: 비강제 (권장)
- **사양**: 16×16 px, 132 tiles, 12×11 grid, spacing 1px
- **사용 위치**: `kenney/tiny-town/`

## 2. Kenney — RPG Urban Pack

- **출처**: https://kenney.nl/assets/rpg-urban-pack
- **저작자**: Kenney (kenney.nl)
- **라이선스**: **Creative Commons Zero (CC0)** — Public Domain
- **라이선스 URL**: https://creativecommons.org/publicdomain/zero/1.0/
- **상업 사용**: ✅ 자유
- **재배포**: ✅ 자유
- **Attribution**: 비강제 (권장)
- **사양**: 16×16 px, 486 tiles, spacing 1px
- **사용 위치**: `kenney/rpg-urban-pack/`

## 3. LimeZu — Serene Village (revamped)

> ⚠️ 다운로드 후 `limezu/serene-village/` 에 배치 시 본 항목 활성화.

- **출처**: https://limezu.itch.io/serenevillagerevamped
- **저작자**: LimeZu (https://limezu.itch.io/)
- **라이선스**: **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **라이선스 URL**: https://creativecommons.org/licenses/by/4.0/
- **상업 사용**: ✅ 자유
- **재배포**: ✅ 자유 (Attribution 필수)
- **Attribution**: **필수** — "LimeZu" 와 라이선스 링크 명시
- **사용 위치**: `limezu/serene-village/`

### Attribution 표기 (화면 Credits 페이지 + 본 LICENSE.md)

```
Serene Village asset by LimeZu
https://limezu.itch.io/serenevillagerevamped
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
```

---

## 4. (참고) 사용 보류 / `.gitignore` 등록 자산

### LimeZu Modern Interiors Free

- **출처**: https://limezu.itch.io/moderninteriors
- **라이선스**: 작가 custom — "Edit and use OK, **Resell or distribute the asset to others 금지**"
- **GitHub commit 정책**: ❌ `.gitignore` 등록 (`frontend/public/assets/village/limezu/modern-interiors-free/`)
- **로컬 사용**: 가능 (사용자 본인 다운로드 후)
- **추후 결정**: Step 6 인벤토리 시점 — 작가 직접 문의 / 다른 CC0 가구 자산 / 또는 빌드 시 다운로드 도구

---

## 5. 자산 추가 시 절차

1. 자산 페이지의 라이선스 본문 직접 확인 (작가 페이지 / "More information" / "License" 섹션)
2. 다음 키워드 분류:
   - ✅ **CC0** / **CC BY** (with attribution) → git commit OK
   - ❌ **CC BY-NC** / "non-commercial only" → 광고 도입 의향 X 시만 (D4 거부)
   - ❌ "redistribute 금지" / "personal use only" → `.gitignore` 또는 다른 자산
3. 본 LICENSE.md 에 항목 추가 (출처·저작자·라이선스·재배포·attribution 의무)
4. `frontend/public/assets/village/{author}/{asset}/` 구조 유지

---

## 6. 화면 Credits 페이지 (TODO — Step 4 또는 별도)

마음의 고향 "About / Credits" 페이지에 본 LICENSE.md 의 attribution 의무 항목 모두 노출 필요. Step 4 (Welcome 모션) 또는 별도 step 에서 구현.

---

> 본 문서는 트랙 `village-design-mvp` (Issue #56) 산출물.
> 자산 정책 변경 시 spec.decisions D4 와 동기화.
