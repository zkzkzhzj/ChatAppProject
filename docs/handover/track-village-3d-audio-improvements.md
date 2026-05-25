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
| 1 | 음량 슬라이더 UI (상단 우측, 데스크탑·모바일 공통) + localStorage 영속 + master volume 곱 + 0=음소거 통합 | — | ✅ 코드 완료 (53601dd·a5adc7a) | #105 | #106 |
| 2 | Howler `html5: false` (Web Audio) 전환 + onloaderror·onplayerror graceful + iOS·Android 운영 검증 | step 1 | 🔧 코드 완료 / iOS·Android 검증 대기 | #105 | #106 (Step 1 통합) |

> **PR #106 결로 Step 1+2 통합** (사용자 결정, 2026-05-21). cloudflared 결로 iOS 검증 결로 슬라이더 자체가 안 먹는 결함 발견 → Step 1(슬라이더)·Step 2(iOS 위치 음향) outcome 이 같은 한 줄(`html5: true`) 결로 인한 공통 원인이라 한 PR 결로 종결. 정책 1step=1PR 위반이지만 사용자 결정.

## 3. 현재 단계 상세

### Step 1 — 음량 UI + localStorage 영속 (✅ 코드 완료)

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

**산출물**: commit 53601dd (Step 1 본 작업) · a5adc7a (UI 정합 — 채팅 FAB 결로 같은 동그라미 + 클릭 펼침)

**막힌 지점**: 없음. UI 컴포넌트 결로 기존 React 패턴 (`frontend/src/three/` 결로 .tsx 결로 결로 결로 결로 결로) 따라감.

### Step 2 — Web Audio 전환 + onloaderror/onplayerror graceful + iOS·Android 검증 (🔧 코드 완료 / 검증 대기)

**작업 항목**:

1. `frontend/src/three/audio/AmbientSoundManager.ts` L66 결로 `html5: true` → `html5: false`
2. L43-46 결로 `Howler.html5PoolSize = 30` 라인 제거 (Web Audio 모드 결로 무의미)
3. L63-64 결로 옛 코멘트 ("Web Audio 디코더 까다로워서") → spec D4 사유 결로 갱신
4. `onplayerror` 핸들러 추가 — Web Audio context 결로 첫 play 실패 (autoplay 정책) graceful 처리
5. iOS Chrome / Android Chrome 결로 cloudflared 결로 운영 검증 — 사용자 직접 단말
6. **🔍 진단 흐름 결박 결론 (2026-05-23, v1→v3 진단 + cors probe 결박 단정 후 제거)**. iOS Chrome cloudflared 접속 결박 슬라이더·위치 둘 다 안 먹는 결함의 근본 원인:
   - **사실**: v3 진단 결박 `r|W|h5/wa=F|0.00` + `probe: fail/Load failed` + `err=0` 잡힘. CORS 정책 결박 `AllowedOrigins`에 `https://ghworld.co`·`https://www.ghworld.co`·`http://localhost:3000` 셋만 박혀있고 cloudflared `*.trycloudflare.com` 결박 없음
   - **인과**: CORS 차단 → Howler XHR(arraybuffer) 즉시 reject → Howler **silent 폴백** (`_html5=true`, `_webAudio=false` 박은 후 html5 결박 재로드, `onloaderror`는 안 부름 — learning 84 line 238: "Howler default = Web Audio 우선, 실패 시 html5 fallback") → html5 cross-origin은 허용 결박 들리긴 함 → 그러나 iOS WebKit `HTMLMediaElement.volume` read-only 결박 슬라이더·위치 음량 무력화
   - **진짜 해결**: 운영 결박 (`https://ghworld.co`) 배포 결박 검증. S3 CORS 결박 이미 그 origin 결박 허용 결박 박혀있어서 추가 작업 0. cloudflared 결박 임시 검증은 CORS 함정 결박 부정확 — 더 쓰지 말 것
   - **진단 코드 제거 완료**: v3 배지·err 패널·cors probe·diag/probe useState·진단 useEffect 2종·`getDiag/getErrors/probeFirstAsset/pushError/serializeError` 메서드·`AudioErrorLog` 타입 모두 되돌림

**결정 사항** (spec §4 미리 박혔음):

- D4 Web Audio API 전환 (html5:false) — iOS WebKit HTMLMediaElement.volume read-only 제약 우회
- D5 onloaderror = 다른 자산 영향 X graceful (+ onplayerror 결로 첫 play 실패도 graceful)

**막힌 지점**: 없음 (코드 1줄 + 핸들러 1개). 다만 운영 검증 결로 디코딩 실패 자산 가능성 — 발견 시 사용자 결정 결로 재인코딩 vs 후속 트랙 결로 미루기 (spec D4 빈틈 박힘).

**검증 절차** (사용자 협업):

```powershell
# 1. frontend 컨테이너 stop (port 3000 해제)
docker compose -f deploy/docker-compose.yml stop frontend
# 2. dev 서버 결로 띄움 (hot reload 결로 코드 변경 즉시 반영)
cd frontend && npm run dev
# 3. cloudflared 그대로 두면 3000 결로 향함 → 모바일 결로 동일 URL 결로 접속
```

**검증 포인트**:

- iOS Chrome 결로 슬라이더 0~100 결로 음량 즉시 반영
- 슬라이더 0 = 모든 환경음 무음
- 캠프파이어(0,8) 가까이 가면 crackling-fire ↑
- 연못(-5,-5) 가까이 가면 pond-water ↑, fadeRadius 6 밖 = 무음
- 마을 외곽(28+) 가까이 가면 forest-birds ↑
- 콘솔 결로 `[AmbientSound] '...' 자산 로드 실패` 메시지 캡쳐 — 디코딩 실패 자산 있나 확인

## 4. 충돌 위험 파일

> 다른 트랙(`harden-village-ops` 백엔드) 과 영역 분리. 충돌 위험 낮음.

| 파일 | Tier | 비고 |
|------|------|------|
| `docs/handover/INDEX.md` | 1 | 트랙 추가/제거 시 충돌 |
| `docs/handover.md` | 1 | 트랙 머지 PR 안에서만 갱신 |
| `docs/learning/RESERVED.md` | 1 | 본 트랙 결로 84·85 예약 |
| `frontend/src/three/audio/AmbientSoundManager.ts` | 2 | 본 트랙 전용 (master volume + Step 2 결로 Web Audio) |
| `frontend/src/three/audio/sound-config.ts` | 2 | 본 트랙 전용 (선택 — 변경 없을 가능성 ↑) |
| `frontend/src/components/ui/AudioControls.tsx` | 2 | 신규 (충돌 X) |

## 5. 현재 작업 위치 — m4a 전환 (2026-05-25)

### 5.1 가설 확정 완료

- **gentle-wind.m4a cheap test 성공** (2026-05-25): iOS Chrome + cloudflared로 슬라이더 정상 반응 확인
- 근본 원인 확정: iOS WebKit `decodeAudioData()`가 mp3 디코딩 실패 → Howler html5 폴백 → iOS `HTMLMediaElement.volume` read-only → 슬라이더·위치 무력
- 해결: m4a(AAC) = Apple 네이티브 포맷 → `decodeAudioData()` 성공 → Web Audio 모드 유지 → GainNode 음량 제어 정상

### 5.2 S3 CORS 개선 (이번 세션)

- `https://*.trycloudflare.com` 추가 → 배포 없이 cloudflared로 iOS 검증 가능해짐
- 이전에 배포 필수였던 이유: cloudflared 도메인이 CORS 미허용 → Web Audio XHR 차단 → html5 폴백 → m4a든 mp3든 같은 증상

### 5.3 남은 작업 (현재 위치)

- [x] sound-config.ts 경로 변경 (4종 + 도서관 1종, .mp3 → .m4a)
- [x] gentle-wind.m4a 변환 + S3 업로드 + iOS 검증
- [x] crackling-fire, pond-water, forest-birds m4a 변환 + S3 업로드 (ffmpeg -c:a aac -b:a 128k)
- [x] PR #112 생성
- [ ] iOS 전체 4종 검증 (cloudflared로 가능)
- [ ] PR 머지 + 운영 배포

### 5.4 환경 정보

- `aws cli` v2.34.34, `ffmpeg` 설치 완료
- S3 버킷: `gohyang-s3-buket-20260514`, prefix `v1/audio/ambient/`
- CloudFront: `d9btdaowoaya0.cloudfront.net`
- S3 CORS AllowedOrigins: `ghworld.co`, `www.ghworld.co`, `localhost:3000`, `*.trycloudflare.com`

## 6. 보류 메모

- **🟢 진단 결박 제거 완료** (2026-05-23) — §3 항목 6 결박 history. 운영 배포 결박 검증 결박만 남음
- 단축키 (`M` 같은 키보드) — 데스크탑 결로 후속 의제
- 개별 환경음 음량 조절 — 4종 각각 슬라이더 X (마스터 1개만)
- BGM/SFX 분리 채널 — 향후 BGM 채널 추가 시 별건
- 모바일 시스템 음량 인식 — browser 권한 한계
