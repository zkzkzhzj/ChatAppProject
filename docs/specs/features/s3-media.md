---
feature: s3-media
track: s3-media
issue: "#89"
status: draft
created: 2026-05-17
last-updated: 2026-05-17
---

# 정적 에셋 외부 호스팅 인프라 (S3 + CD 자동 sync + BGM 운영 정상화)

> 이 spec 은 트랙 `s3-media` (Issue #89) 의 **요구사항 진실** 이다.
> 진행 상태는 `docs/handover/track-s3-media.md`, 결정의 사고 과정은 `docs/learning/51-*.md`·`docs/learning/52-*.md`.
> 4층 분리 모델: [conventions/spec-driven.md](../../conventions/spec-driven.md) §1.

---

## 1. Outcomes

> 이 spec 이 만족되면 무엇이 가능해지나? (유저 / 시스템 관점)

- **유저**: 운영 환경(`ghworld.co`)에서 환경음 4종(gentle-wind·crackling-fire·pond-water·forest-birds) + BGM 1곡이 정상 재생된다 (현재 무음 상태 해결)
- **유저**: BGM이 D11 안식처 가드레일(음량 ≤ 0.3) 내에서 잔잔하게 배경음 역할
- **시스템**: mp3 자산이 git 추적되지 않아도 외부 S3 fetch로 운영 정상 작동
- **시스템**: `frontend/assets/` 자산 변경 시 GitHub Actions 가 자동으로 S3 sync 실행 (수동 SCP 없음)
- **시스템**: dev/prod 환경 모두 동일 S3 endpoint fetch (환경 분기 없음 — "내 컴에선 되는데" 방지)
- **확장성**: 향후 도서관 3D 모델·NPC 음성·채팅 이미지 자산 모두 같은 S3 버킷 + versioned prefix(`v1/`)로 통일

## 2. Scope

### 2.1 In (이번 트랙에서 만든다)

- AWS S3 버킷 신설 (`ap-northeast-2`, public read)
- IAM 정책 + 버킷 정책 + CORS 설정 (`ghworld.co` origin 허용)
- `frontend/public/assets/` 의 mp3 4종 → S3 마이그 (`s3://bucket/v1/audio/ambient/`)
- 코드: `sound-config.ts`의 src를 환경변수 `NEXT_PUBLIC_ASSETS_BASE_URL`로 prefix해서 외부 URL 주입
- GitHub Actions 자산 sync workflow (`frontend/assets/` 변경 감지 → `aws s3 sync`)
- BGM `BgmManager.ts` 신규 (Howler.js, `AmbientSoundManager` 와 분리된 채널)
- BGM 곡 1개 S3 업로드 + VillageScene 통합 + D11 가드(≤0.3) 코드 강제
- LICENSE.md 갱신 (BGM 곡 출처·라이선스)
- 루트 `package-lock.json` 동반 commit (husky/markdownlint 재현성)
- `.gitignore` 정리 — 외부화 후 추적 정책 명시 (mp3 추적 X 유지 결정 의도 박음)

### 2.2 Out (이번 트랙에서 명시적으로 안 만든다)

> Out 이 spec 가치의 절반. "안 만드는 것" 을 적어야 다음 세션이 스코프 침범 안 함.

- **CloudFront 도입** — raw S3 URL 시작, 후속 트랙
- **`uploads/chat/` 사용자 업로드 경로 활성화** — 채팅 이미지 트랙에서
- **도서관 3D 모델 마이그** — 도서관 트랙에서 (자산 폴더 구조만 미리 박음)
- **캐시 무효화 자동화** — 수동 prefix 갱신(`v1` → `v2`)으로 시작
- **BGM 곡 수 확장** — 현재는 마을·도서관 동일 곡, 도서관에서 페이드만 (Scene 별 곡 분기는 후속)
- **자산 압축 자동화** (mp3 비트레이트 자동 조정) — 사용자 사전 가공으로 진행
- **monitoring/알람** (S3 4xx·5xx 메트릭) — 후속 인프라 트랙

## 3. Constraints (비기능 제약)

| 차원 | 제약 |
|------|------|
| 성능 | mp3 초기 로드 latency < 1s (서울 리전 직접, mp3 < 5MB) |
| 비용 | 월 < $1 예상 (자산 합산 < 50MB, egress < 5GB/월). S3 free tier 내에선 0 가능 |
| 시간 | 트랙 전체 4 step, 1~2 세션 예상 |
| 인프라 | AWS EC2 + Cloudflare(SSL·DNS) 기존 구조 유지, 신규 자산 호스팅은 AWS 친화 스택으로 통일 |
| 정책/규제 | D11 안식처 가드레일 6축 — 음량 ≤ 0.3, 잔잔한 결, EDM·시끄러운 BGM 위반 신호. 라이선스 LICENSE.md 명시 의무 |
| 브라우저 | autoplay 정책 — 사용자 first interaction 필요 (`AmbientSoundManager` 기존 unlock 흐름 유지, BGM도 동일 흐름) |

## 4. Decisions

> 각 결정마다 **왜 · 대안 · 빈틈 · 재검토 트리거 4축**.
> Comprehension Gate (`docs/conventions/comprehension-gate.md`, P3 산출물) 의 13 카테고리·Tier 시스템과 1:1 매핑.
> **미리 채우면 게이트가 자동 통과**. 빈 채로 진행하면 step 시점에 게이트가 묻는다.

### D1. [새 기술·의존성] 스토리지 = AWS S3 (Cloudflare R2 X)

- **왜**: AWS 친숙도(EC2·SSM·OIDC CD 이미 보유), 자산 크기 작음(현재 mp3 6.7MB) → egress 비용 < $1/월로 무시 가능. 채팅 이미지·NPC 음성·정적 에셋 통일로 운영 스택 1개
- **대안**:
  - Cloudflare R2 — egress 무료, Cloudflare DNS 직결. 자산 글로벌 fetch 임계치 미달이라 매력 작음. 신규 wrangler CLI 학습 비용
  - .gitignore 예외 + git commit — MVP로는 가장 단순. 다만 도서관 트랙 자산 늘어나면 두 번 일 (S3 마이그 강요)
- **빈틈**: 다중 리전 / 글로벌 사용자에게 fetch latency 부담. CloudFront로 후속 보강. 또한 사용자 업로드 비용(egress) 늘어나면 R2 재검토 필요
- **재검토 트리거**: 월 egress > $5 / 글로벌 사용자 비중 > 30% / 자산 합산 > 1GB

### D2. [API 설계] 도메인 = raw S3 URL (CloudFront 후속)

- **왜**: 단순 시작. 자산 작아서 latency 부담 적음. `https://{bucket}.s3.ap-northeast-2.amazonaws.com/v1/audio/ambient/gentle-wind.mp3` 형태로 직접
- **대안**:
  - CloudFront + `assets.ghworld.co` — SSL·캐싱·custom 도메인 정석. 다만 Route 53 또는 Cloudflare proxy 추가 작업, 트랙 범위 확장
  - Cloudflare proxy (S3 origin) — 도메인 통합 OK. 다만 origin 설정 + cache rule 별도 작업
- **빈틈**: CORS 헤더 직접 관리 필요. 캐시 TTL S3 기본값(없음 — 매 요청 fetch)
- **재검토 트리거**: latency 불만 / S3 비용 (cache miss) / 도서관 트랙 자산 늘어남

### D3. [환경 분기] 환경 = dev/prod 모두 외부 fetch

- **왜**: 일관성. 환경 분기 디버깅 없음. dev에서도 진짜 운영 endpoint로 검증. "내 컴에선 되는데" 방지
- **대안**:
  - dev = 로컬 mp3, prod = S3 — 오프라인 dev 가능. 다만 환경 분기 로직 필요 (`process.env.NODE_ENV` 분기)
- **빈틈**: 오프라인 dev 안 됨. dev 시작 시 S3 접근 필요 (간헐적 네트워크 환경에서 dev UX 저하 가능)
- **재검토 트리거**: 오프라인 dev 빈도 높음 / S3 latency가 dev에 지장 / 비행기 안에서 작업 빈번

### D4. [CD 파이프라인] CD 자동화 = GitHub Actions 묶음

- **왜**: 자산 변경마다 수동 sync 부담. CD 자연 통합. OIDC IAM role 기반 권한이 이미 박혀있음 (`docs/learning/37-cd-pipeline-design.md` 참조)
- **대안**:
  - 수동 `aws s3 sync` — 단순. 다만 잊어버리기 쉬움. 자산 변경 ↔ 배포 비동기로 운영 갈등
- **빈틈**: GitHub Actions S3 credential 권한 (IAM role + OIDC 신뢰 정책 갱신 필요). 기존 CD에 이미 OIDC가 박혀있어 권한 정책만 추가
- **재검토 트리거**: workflow 실패 빈번 / 자산 sync 누락 / IAM role 권한 회수 필요 시

### D5. [API 설계] 폴더 = versioned prefix (`v1/`)

- **왜**: 캐시 무효화 통합. 자산 갱신 시 prefix를 올려서 일괄 무효화 가능 (브라우저·CDN 캐시 1년 TTL을 안전하게 박을 수 있음). 채팅 업로드(`uploads/`)는 별도 prefix (immutable URL이라 캐시 무효화 무관)
- **대안**:
  - 평탄 구조 (`/audio/ambient/...`) — 단순. 다만 캐시 무효화 어려움 (개별 객체 invalidation 필요)
- **빈틈**: v1 → v2 전환 시 코드(env var)·CD(sync target prefix)·도큐 동시 갱신 필요. 자동화 안 되면 누락 위험
- **재검토 트리거**: 첫 prefix 전환 시 절차 정형화 / 자산 종류 늘어남 (운영 복잡도 측정)

### D6. [헥사고날 경계] BGM = `BgmManager.ts` 신규 (AmbientSoundManager와 통합 X)

> **2026-05-18 갱신 (Step 2 진행 중)**: 사용자 의도 확인 결과 **BGM = 환경음 4종**으로 확정. 추가 곡 없음. 본 결정은 폐기 — `AmbientSoundManager`만 살리고 별도 매니저 만들지 않음. 기록 보존 (왜 처음에 분리하려 했는지 의도 흔적).

- **왜 (폐기 전 원래 의도)**: 환경음(자연음, 위치 기반)과 BGM(곡, scene 기반)은 책임이 다름. 위치 모델(`SoundPositionModel`)은 환경음 전용, BGM은 scene별 single track. 통합 시 `calculateVolume`이 두 도메인을 알아야 함 (단일 책임 위반)
- **대안**:
  - `AmbientSoundManager`에 BGM zone 추가 — 매니저 1개. 다만 책임 섞임, 곡 vs 자연음 동작 차이(crossfade·loop·license)가 한 클래스에 들어가야 함
- **빈틈**: Howler.js 인스턴스 2개로 늘어나면 메모리·audio pool 압박. `Howler.html5PoolSize = 30` 기존 설정 내에서 흡수 가능 (`AmbientSoundManager.ts:39` 참조)
- **재검토 트리거**: BGM 곡 수 늘어남 (5곡 이상) / scene별 BGM 분기 요구 발생 (현재 마을·도서관 동일 곡)

## 5. Tasks (= Steps)

> **1 step = 1 PR (엄격)** — `docs/conventions/git.md` §4, `docs/conventions/spec-driven.md` §2.2.

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| 1 | AWS S3 버킷 생성 + IAM + CORS + 버킷 정책. 인프라 수동 작업 + ADR 박음 | — | `docs/architecture/decisions/009-s3-asset-hosting.md` (신규), AWS 콘솔 (수동) | #89 | #96 |
| 2 | frontend 코드 — `sound-config.ts` 환경변수화 + `.env`·`.env.local` 분리 + `.gitignore` 정리 + 루트 `package-lock.json` commit | step 1 | `frontend/src/three/audio/sound-config.ts`, `frontend/.env*`, `frontend/.gitignore`, 루트 `package-lock.json` | #89 | ... |
| 3 | GitHub Actions workflow 신규 (`frontend/assets/` 변경 감지 → `aws s3 sync`) + OIDC IAM role 권한 추가 | step 1 | `.github/workflows/asset-sync.yml` (신규), AWS IAM (수동) | #89 | ... |
| 4 | BGM mp3 S3 업로드 + `BgmManager.ts` 신규 + VillageScene 통합 + D11 가드(≤0.3) + LICENSE.md 갱신 | step 2, 3 | `frontend/src/three/audio/BgmManager.ts` (신규), `frontend/src/three/audio/sound-config.ts`, `frontend/src/three/scenes/VillageScene.ts`, `frontend/public/assets/LICENSE.md` | #89 | ... |

## 6. Verification (수용 기준)

> 이게 통과하면 spec 종료. track 파일의 `§0.5 Acceptance Criteria` 와 1:1 매핑.

- [ ] S3 버킷 생성 + public read 정책 (`v1/*` 한정) + CORS의 `ghworld.co` origin 허용 확인 (AWS 콘솔 + curl로 검증)
- [ ] frontend 빌드 시 `NEXT_PUBLIC_ASSETS_BASE_URL` 환경변수로 S3 URL 주입 확인 (`npm run build` 결과의 fetch URL 확인)
- [ ] dev `npm run dev`에서 환경음 4종 정상 재생 (사용자 청취 검증)
- [ ] prod 배포 후 운영 환경(`ghworld.co`)에서 환경음 4종 정상 재생 (현재 무음 해결 — 사용자 청취 검증)
- [ ] GitHub Actions workflow가 `frontend/assets/` 변경 시 S3 sync 자동 실행 확인 (workflow run 로그)
- [ ] 환경음 D11 음량 가드 (≤ 0.3) 코드 강제 확인 (기존 `AmbientSoundManager` + `sound-config.ts`의 maxVolume 상수)
- [ ] LICENSE.md에 환경음 4곡 출처·라이선스 명시
- [ ] 루트 `package-lock.json` commit 확인 (husky 재현성)
- [ ] 학습노트 51 (R2 vs S3 ADR + versioned prefix) + 52 (frontend 자산 외부화 패턴) 작성 완료

## 7. References

- 트랙 파일: [track-s3-media.md](../../handover/track-s3-media.md) (`/track-start` 산출물)
- 관련 wiki: [frontend/asset-guide.md](../../wiki/frontend/asset-guide.md) (에셋 소스·라이선스·호스팅 정책), [infra/hooks-automation.md](../../wiki/infra/hooks-automation.md) (CD 자동화 정책)
- 관련 learning: [37-cd-pipeline-design.md](../../learning/37-cd-pipeline-design.md) (기존 OIDC CD 파이프라인 기반), [78-next-three-howler-dev-memory-diagnosis.md](../../learning/78-next-three-howler-dev-memory-diagnosis.md) (Howler.js dev 메모리 진단 — 자산 늘어날 때 memory budget 주의)
- 관련 ADR: [009-s3-asset-hosting.md](../../architecture/decisions/009-s3-asset-hosting.md) (Step 1 산출물)
- 외부 자료:
  - AWS S3 CORS 설정: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html
  - GitHub Actions OIDC + AWS IAM: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
  - Howler.js: https://howlerjs.com/

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-17 | 초안 작성 (사용자 결정 4단계 사이클 — R2 vs S3 트레이드오프 끝에 S3 통일 + raw URL + dev/prod 외부 + CD 자동 + versioned prefix). decisions 6축 미리 박음으로 Comprehension Gate 자동 통과 의도 |
| 2026-05-18 | D6 (BgmManager 분리) 폐기 — BGM = 환경음 4종으로 확정, 별도 매니저 없음. 기록 보존. Verification에서 BGM 관련 항목 환경음으로 통합 |
