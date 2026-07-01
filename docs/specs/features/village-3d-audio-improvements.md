---
feature: village-3d-audio-improvements
track: village-3d-audio-improvements
issue: "#105"
status: draft
created: 2026-05-20
last-updated: 2026-05-20
---

# 음량 조절 (0=음소거 통합) + 모바일 위치 기반 환경음 fix

> 이 spec 은 트랙 `village-3d-audio-improvements` (Issue #105) 의 **요구사항 진실** 이다.
> 진행 이력은 이 spec에 보존한다. 결정의 사고 과정은 `docs/learning/84-*.md`·`docs/learning/85-*.md` (예약).

---

## 1. Outcomes

> 이 spec 이 만족되면 무엇이 가능해지나? (유저 / 시스템 관점)

- **유저**: 운영에서 환경음 음량을 0~100 슬라이더로 조절 가능. 0 = 자동 음소거 (별도 음소거 버튼 X)
- **유저**: 음량 설정이 페이지 재로드 후에도 유지됨 (localStorage 영속)
- **유저 (iOS)**: 아이폰 Chrome에서 위치 기반 환경음이 정상 동작 (캠프파이어·연못·숲 가까이 갈 때 해당 음 ↑, 멀어지면 ↓)
- **유저 (Android)**: 안드로이드 Chrome에서도 동일하게 위치 기반 정상 동작
- **시스템**: 한 mp3 디코딩 실패 시 graceful fallback (다른 환경음은 정상 재생 유지)

## 2. Scope

### 2.1 In (이번 트랙에서 만든다)

- 마스터 음량 슬라이더 UI (0~100, 데스크탑·모바일 분기)
- 음량 0 ↔ 자동 음소거 통합 (별도 토글 X)
- localStorage 결로 음량 영속화 (`audio.master.volume` key)
- `AmbientSoundManager` 결로 master volume 곱 적용
- Howler.js `html5: false` (Web Audio API) 전환 — iOS volume API 비호환 해결
- onloaderror 핸들링 보강 — 디코딩 실패 시 console.warn + 다른 자산 영향 X
- iOS Chrome / Android Chrome 운영 검증

### 2.2 Out (이번 트랙에서 명시적으로 안 만든다)

> Out 이 spec 가치의 절반.

- **자산 재인코딩** — Web Audio 디코딩 실패 자산 발견 시 별건 (필요하면 후속 commit / 트랙 후순위)
- **음량 단축키** — 데스크탑 결로 `M` 같은 키보드 단축키 X (UI 슬라이더만)
- **개별 환경음 음량 조절** — 4종 각각 슬라이더 X (마스터 1개만)
- **BGM/SFX 분리 채널** — 현재 환경음만. 향후 BGM 채널 추가 시 별건
- **scene 별 음량 프로파일** — 마을 vs 도서관 자동 다른 음량 X (현재 sound-config.ts 결로 zone maxVolume 결로 표현 충분)
- **모바일 시스템 음량 인식** — OS 결로 무음 모드 감지 X (browser 권한)

## 3. Constraints (비기능 제약)

| 차원 | 제약 |
|------|------|
| 성능 | Web Audio API 전환 결로 메모리 ↑ 가능. learning 78 결로 dev 메모리 폭주 진단 참조. budget — pool size 결로 통제 |
| 호환성 | iOS Chrome (WebKit) + Android Chrome (Blink) + 데스크탑 Chrome/Safari/Firefox 모두 동작 |
| UI | D11 안식처 가드레일 정합 — 음량 컨트롤도 잔잔한 결로 (튀는 색·큰 버튼 X) |
| 영속 | localStorage (server 영속 X, 디바이스 별 독립) |
| 가드 | 음량 ≤ D11 가드 (≤ 0.3) — 마스터 슬라이더 100% = 기존 maxVolume (0.25 결로) 유지. 슬라이더 결로 D11 위반 못 함 |

## 4. Decisions

> 각 결정마다 **왜 · 대안 · 빈틈 · 재검토 트리거 4축**.

### D1. [API 설계] 음소거 = 음량 0 통합 (별도 토글 X)

- **왜**: UI 단순화. 별도 음소거 토글 = 슬라이더와 상태 불일치 가능 (음량 50인데 음소거 ON 같은 어색한 상태)
- **대안**:
  - 별도 음소거 버튼 — 빠른 토글 UX. 다만 슬라이더와 동기화 로직 추가, 상태 둘
  - "이전 음량 기억" 결로 음소거 → 복원 — 음량 0이 음소거니까 0에서 슬라이더 올리면 자동 복원. 추가 로직 X
- **빈틈**: "한 번에 음소거" UX 부담. 슬라이더 끝까지 끌어내려야 함. 모바일 결로 손가락 정확도 결로 부담 가능
- **재검토 트리거**: 사용자 피드백 결로 "한 번 탭으로 음소거" 요구

### D2. [UI 설계] 음량 UI 위치 = 상단 우측 (데스크탑·모바일 공통)

- **왜**: 데스크탑·모바일 둘 다 같은 위치. 하단은 모바일 결로 가상 조이스틱·채팅 FAB 결로 사용 중. 상단 우측은 비어있고, 시야 방해 최소
- **대안**:
  - 좌측 하단 (데스크탑) — 모바일 가상 조이스틱과 겹침
  - 우측 하단 — 모바일 채팅 FAB와 겹침
  - 햄버거 메뉴 결로 숨김 — 클릭 한 번 더. UX 부담
- **빈틈**: 상단 우측 결로 모바일 노치/상태바 결로 겹침 가능. safe-area-inset-top 결로 보강 필요
- **재검토 트리거**: 사용자 피드백 결로 위치 불편

### D3. [API 설계] 영속 = localStorage (`audio.master.volume`)

- **왜**: 디바이스 별 음량 선호. 서버 영속 결로 결로 결로 결로 결로 결로 결로 결로 — 디바이스마다 환경(헤드폰 vs 스피커)이 다를 수 있어 디바이스 로컬이 맞음
- **대안**:
  - 서버 영속 (User 도메인 결로 audio_preference 필드) — 디바이스 간 동기화. 다만 게스트 결로 미지원, 백엔드 변경 부담
  - sessionStorage — 탭 닫으면 사라짐. UX 부담
- **빈틈**: 시크릿 모드 / localStorage 비활성 결로 영속 X. 기본값 결로 fallback
- **재검토 트리거**: 디바이스 간 동기화 요구 (계정 도메인 결로 결로 결로 결로 결로)

### D4. [새 기술·의존성] Howler `html5: false` (Web Audio API) 전환

- **왜**: iOS WebKit이 HTML5 `<audio>` element의 `volume` API를 무시. Web Audio는 GainNode 결로 audio context 결로 직접 제어 → iOS도 정상 동작
- **대안**:
  - 현 상태 유지 (`html5: true`) — iOS 음량 조절 불가. 트랙 목표 못 함
  - UA 분기 결로 iOS만 Web Audio — 코드 복잡도 증가, 이중 path
  - 다른 라이브러리 (Tone.js 결로) — 학습 비용 + 대규모 변경
- **빈틈**: 일부 mp3 결로 "Decoding audio data failed" 가능 (Step 2 보강에서 만남). onloaderror 결로 처리. 디코딩 실패 자산 결로 재인코딩 필요 가능성
- **재검토 트리거**: 디코딩 실패 자산 빈도 > 30% / Web Audio context 결로 메모리 폭주

### D5. [예외 처리] onloaderror = 다른 자산 영향 X graceful

- **왜**: 한 mp3 디코딩 실패해도 다른 환경음은 정상 재생. 사용자 경험 결로 일부 무음 < 전체 무음
- **대안**: 첫 실패 시 throw — 즉시 알 수 있음. 다만 운영 결로 단일 자산 결로 전체 무음 위험
- **빈틈**: 어떤 자산이 실패했는지 모니터링 누락 가능. console.warn 결로 결로 결로 결로 결로 — 사용자 단 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로
- **재검토 트리거**: 운영 결로 실패율 모니터링 필요 시 (CloudWatch / Sentry 결로 결로 결로)

### D6. [헥사고날 경계] master volume = `AmbientSoundManager` 책임

- **왜**: 환경음 매니저가 이미 zone별 maxVolume + smoothing 결로 음량 결정. master volume 곱은 자연 결합 (`current * master`)
- **대안**:
  - `Howler.volume()` 전역 결로 박음 — 향후 BGM 채널 추가 시 분리 어려움
  - 별도 `AudioMasterController` 클래스 — 매니저 1개 결로 충분, YAGNI
- **빈틈**: BGM 채널 추가 시 master volume 곱을 어디 결로 박을지 재설계 (그때 결로 별도 controller)
- **재검토 트리거**: BGM 채널 신규 / SFX(클릭음) 신규

## 5. Tasks (= Steps)

> **1 step = 1 PR (엄격)** — `docs/conventions/git.md` §4.

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| 1 | 음량 슬라이더 UI (상단 우측, 데스크탑·모바일 공통) + localStorage 영속 + master volume 곱 + 0=음소거 통합 | — | `frontend/src/three/audio/AmbientSoundManager.ts`, `frontend/src/three/audio/sound-config.ts` (선택), `frontend/src/components/ui/AudioControls.tsx` (신규), CSS 결로 결로 | #105 | #106 |
| 2 | Howler `html5: false` (Web Audio) 전환 + onloaderror·onplayerror graceful + iOS·Android 운영 검증 | step 1 | `frontend/src/three/audio/AmbientSoundManager.ts` | #105 | #106 (Step 1 통합) |

## 6. Verification (수용 기준)

**Step 1 (음량 UI + 영속)**:
- [ ] 상단 우측 결로 음량 슬라이더 보임 (데스크탑·모바일 둘 다)
- [ ] 슬라이더 결로 0~100 조절 시 환경음 4종 음량 즉시 반영 (lerp smoothing OK)
- [ ] 슬라이더 0 = 모든 환경음 무음 (음소거 통합)
- [ ] 페이지 재로드 후 마지막 음량 값 유지 (localStorage)
- [ ] D11 가드 — 슬라이더 100% = 기존 maxVolume 결로 결로 (≤ 0.3 정합)
- [ ] 모바일 결로 safe-area-inset 결로 노치 가림 없음

**Step 2 (모바일 위치 기반 fix)**:
- [ ] iOS Chrome 결로 마을 진입 → 캠프파이어 가까이 가면 crackling-fire ↑, 멀어지면 ↓
- [ ] iOS Chrome 결로 연못(-5,-5) 가까이 가면 pond-water ↑, fadeRadius 6 밖 = 무음
- [ ] iOS Chrome 결로 마을 외곽(28) 가까이 가면 forest-birds ↑
- [ ] Android Chrome 결로 동일 검증
- [ ] 디코딩 실패 자산 발견 시 console.warn + 다른 자산 정상 재생

**트랙 종료 공통**:
- [ ] learning 84 (iOS WebKit Howler html5 vs Web Audio 트레이드오프) + 85 (음소거 UI 통합 패턴 + localStorage 영속화) 작성 완료

## 7. References

- 트랙 파일: baseline reset cleanup에서 삭제, 진행 이력은 이 spec에 보존
- 관련 wiki: [frontend/asset-guide.md](../../wiki/frontend/asset-guide.md) (자산 호스팅 정책 — Web Audio fetch 흐름)
- 관련 learning: [78 (Next.js + Three.js + Howler dev 메모리 진단)](../../learning/78-next-three-howler-dev-memory-diagnosis.md), [51 (R2 vs S3 + CloudFront + OAC)](../../learning/51-s3-vs-r2-cloudfront-oac-decision.md) (자산 fetch 경로)
- 관련 ADR: [009 S3 자산 호스팅](../../architecture/decisions/009-s3-asset-hosting.md) (Web Audio fetch 시 CloudFront 경유)
- 코드: `frontend/src/three/audio/AmbientSoundManager.ts` (현재 `html5: true` 박힘 — D4에서 전환)
- 외부:
  - Howler.js Web Audio vs HTML5: <https://github.com/goldfire/howler.js#documentation>
  - iOS WebKit audio volume 제약: <https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/PlayingandSynthesizingSounds/PlayingandSynthesizingSounds.html>

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-20 | 초안 작성 (decisions 6축 미리 박음 → Comprehension Gate 자동 통과 의도). UI 위치·음소거 통합·Web Audio 전환·localStorage 영속 결정 |
| 2026-05-21 | PR #106 결로 Step 1+2 통합 결정 (사용자 결정). cloudflared 결로 iOS 검증 중 슬라이더 자체가 안 먹는 결함 발견 — Step 1 outcome(슬라이더)·Step 2 outcome(iOS 위치 음향) 둘 다 같은 한 줄(`html5: true`) 결로 인한 공통 원인이라 한 PR 결로 종결. 정책 1step=1PR 위반이지만 한 결함이 두 outcome 회복시키므로 통합 결로 박음. spec §5 Tasks 결로 요구사항 차원 결로는 분리 유지, PR 컬럼만 통합 표기. `onplayerror` 핸들러 추가 (Web Audio context autoplay 정책 결로 첫 play 실패 graceful) — Step 2 작업 항목에 함께 박음 |
