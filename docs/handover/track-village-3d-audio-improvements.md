# Track: village-3d-audio-improvements

> 작업 영역: 음량 조절(0=음소거 통합) + 모바일(iOS/Android) 위치 기반 환경음 fix
> 시작일: 2026-05-20
> Issue: [#105](https://github.com/zkzkzhzj/ChatAppProject/issues/105)
> 브랜치: `feat/village-3d-audio-improvements-step1` (Step 1) — 후속 step은 step 별 브랜치 분기
> Spec: [docs/specs/features/village-3d-audio-improvements.md](../specs/features/village-3d-audio-improvements.md)

## 0. 한 줄 요약

운영 환경음이 너무 시끄럽다는 피드백 + iOS Chrome 결로 위치 기반 작동 안 함 — 마스터 음량 슬라이더(0=음소거) + Web Audio API 전환 결로 둘 다 해결.

## 0.5 Acceptance Criteria

> spec §6 Verification과 1:1 매핑.

**Step 1 (음량 UI + 영속)**:

- [ ] 상단 우측 결로 음량 슬라이더 표시 (데스크탑·모바일 공통)
- [ ] 슬라이더 0~100 결로 환경음 4종 음량 즉시 반영
- [ ] 슬라이더 0 = 모든 환경음 무음
- [ ] 페이지 재로드 후 음량 유지 (localStorage)
- [ ] D11 가드 정합 (100% = 기존 maxVolume ≤ 0.3)
- [ ] 모바일 safe-area-inset 결로 노치 가림 없음

**Step 2 (모바일 위치 기반 fix)**:

- [ ] iOS Chrome 결로 위치 기반 4종 정상 동작 (캠프파이어·연못·숲)
- [ ] Android Chrome 결로 동일 동작
- [ ] 디코딩 실패 자산 결로 graceful (console.warn + 다른 자산 영향 X)

**트랙 종료 공통**:

- [ ] learning 84 (iOS WebKit Howler 트레이드오프) + 85 (음소거 UI 통합 패턴) 작성 완료

## 1. 배경 / 왜

- `s3-media` 트랙 종료 후 운영 환경음 정상화 — 다만 시끄럽다는 피드백
- iOS Chrome 결로 환경음 4종이 위치 무관하게 다 들림 — 데스크탑 모바일 모드는 정상, iOS만 깨짐
- 가설: iOS WebKit이 HTML5 `<audio>` volume API 무시. Web Audio API 전환 결로 해결 (spec D4)

관련 spec / learning / 코드:

- spec: [village-3d-audio-improvements.md](../specs/features/village-3d-audio-improvements.md)
- 코드: `frontend/src/three/audio/AmbientSoundManager.ts:60` (현재 `html5: true`)
- 관련 learning: [78 (Howler dev 메모리 진단)](../learning/78-next-three-howler-dev-memory-diagnosis.md)

## 2. 전체 로드맵 (1 step = 1 PR — git.md §4)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 1 | 음량 슬라이더 UI (상단 우측, 데스크탑·모바일 공통) + localStorage 영속 + master volume 곱 + 0=음소거 통합 | — | 🔧 진행 | #105 | (작업 시 채움) |
| 2 | Howler `html5: false` (Web Audio) 전환 + onloaderror graceful + iOS·Android 운영 검증 | step 1 | 대기 | #105 | — |

## 3. 현재 단계 상세

### Step 1 — 음량 UI + localStorage 영속

**작업 항목**:

1. `AmbientSoundManager` 결로 master volume 필드 + setter (`setMasterVolume(v: number)`)
2. updatePosition 결로 매 프레임 결로 `target * master` 곱 적용
3. React 컴포넌트 — `AudioControls.tsx` 신규 (상단 우측, slider 1개)
4. localStorage 결로 영속 — key `audio.master.volume`, range 0~1
5. 첫 마운트 결로 localStorage 결로 값 read → `AmbientSoundManager.setMasterVolume(v)` 호출
6. CSS — safe-area-inset-top + safe-area-inset-right (모바일 노치 가림 방지)

**결정 사항** (spec §4 미리 박혔음 — Comprehension Gate 자동 통과):

- D1 음소거 = 음량 0 통합 (별도 토글 X)
- D2 UI 위치 = 상단 우측 (데스크탑·모바일 공통)
- D3 영속 = localStorage
- D6 master volume = AmbientSoundManager 책임

**막힌 지점**: 없음. UI 컴포넌트 결로 기존 React 패턴 (`frontend/src/three/` 결로 .tsx 결로 결로 결로 결로 결로) 따라감.

## 4. 충돌 위험 파일

> 다른 트랙(`harden-village-ops` 백엔드) 과 영역 분리. 충돌 위험 낮음.

| 파일 | Tier | 비고 |
|------|------|------|
| `docs/handover/INDEX.md` | 1 | 트랙 추가/제거 시 충돌 |
| `docs/handover.md` | 1 | 트랙 머지 PR 안에서만 갱신 |
| `docs/learning/RESERVED.md` | 1 | 본 트랙 결로 84·85 예약 |
| `frontend/src/three/audio/AmbientSoundManager.ts` | 2 | 본 트랙 전용 (master volume + Step 2 결로 Web Audio) |
| `frontend/src/three/audio/sound-config.ts` | 2 | 본 트랙 전용 (선택 — 변경 없을 가능성 ↑) |
| `frontend/src/three/ui/AudioControls.tsx` | 2 | 신규 (충돌 X) |

## 5. 다음 세션 착수 전 확인 사항

- main 동기화 (`harden-village-ops` 트랙 머지 시 변경 사항 점검)
- iOS·Android 결로 운영 검증 — 사용자 단말 결로 직접 확인 (Step 2 결로)

## 6. 보류 메모

- 자산 재인코딩 — Web Audio 디코딩 실패 발견 시 별건
- 단축키 (`M` 같은 키보드) — 데스크탑 결로 후속 의제
- 개별 환경음 음량 조절 — 4종 각각 슬라이더 X (마스터 1개만)
- BGM/SFX 분리 채널 — 향후 BGM 채널 추가 시 별건
- 모바일 시스템 음량 인식 — browser 권한 한계
