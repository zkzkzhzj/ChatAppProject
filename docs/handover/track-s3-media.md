# Track: s3-media

> 작업 영역: 정적 에셋 외부 호스팅 인프라 (AWS S3 통일). BGM 운영 무음 문제 해결 + 환경음 운영 정상화 + 도서관/캐릭터/채팅 이미지 자산 토대.
> 시작일: 2026-05-17
> Issue: [#89](https://github.com/zkzkzhzj/ChatAppProject/issues/89)
> 브랜치: `infra/s3-media-step1` (Step 1) — 후속 step은 step 별 브랜치 분기
> Spec: [docs/specs/features/s3-media.md](../specs/features/s3-media.md)

## 0. 한 줄 요약

운영 환경에서 무음인 환경음·BGM을 살리고, 향후 도서관·NPC·채팅 자산까지 한 S3 버킷 + versioned prefix로 통일한다.

## 0.5 Acceptance Criteria (이게 통과하면 트랙 종료)

> spec §6 Verification 과 1:1 매핑. 트랙 종료 시 같이 체크.

- [ ] S3 버킷 생성 + public read 정책 + CORS 결로 `ghworld.co` origin 허용 확인 (AWS 콘솔 + curl 결로 검증)
- [ ] frontend 빌드 시 `NEXT_PUBLIC_ASSETS_BASE_URL` 환경변수 결로 S3 URL 주입 확인
- [ ] dev `npm run dev` 결로 환경음 4종 + BGM 정상 재생
- [ ] prod 배포 후 운영 환경(`ghworld.co`)에서 환경음 4종 + BGM 정상 재생 (현재 무음 해결 — 사용자 결로 청취 검증)
- [ ] GitHub Actions workflow 결로 `frontend/assets/` 변경 → S3 sync 자동 실행 확인
- [ ] BGM 음량 ≤ 0.3 (D11 가드) 코드 강제 확인 (`BgmManager.ts` 결로 상수 + 단위 테스트)
- [ ] LICENSE.md 결로 BGM 곡 출처·라이선스 명시
- [ ] 학습노트 51 (R2 vs S3 ADR + versioned prefix) + 52 (frontend 자산 외부화 패턴) 작성 완료

## 1. 배경 / 왜

운영 환경에서 환경음·BGM 모두 무음 — 원인은 `frontend/.gitignore`로 mp3 추적 X (spec D4' "외부 인프라 마이그 예정" 결로 미뤄둠) 결로 Docker 이미지에 자산 미포함. 사용자가 BGM mp3를 EC2에 SCP로 올렸으나 새 이미지 배포마다 사라짐.

도서관 트랙에서 자산이 더 늘어날 예정 (3D 인테리어·NPC 음성·채팅 이미지) — 지금 git에 묶었다가 빼는 두 번 일을 피하기 위해 정석으로 외부화.

- 관련 spec: [s3-media.md](../specs/features/s3-media.md)
- 관련 learning (예약): 51 (R2 vs S3 ADR), 52 (frontend 자산 외부화 패턴)
- 기존 OIDC CD 인프라: [learning 37](../learning/37-cd-pipeline-design.md)
- 환경음 무음 root cause: `frontend/.gitignore:44-50` + `frontend/public/assets/audio/ambient/README.md`

## 2. 전체 로드맵 (1 step = 1 PR — git.md §4)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 1 | AWS S3 버킷 + IAM + CORS + 버킷 정책. 인프라 수동 작업 + `docs/architecture/decisions/{NNN}-s3-asset-hosting.md` ADR | — | 🔧 진행 | #89 | (작업 시 채움) |
| 2 | frontend 코드 — `sound-config.ts` 환경변수화 + `.env`·`.env.local` 분리 + `.gitignore` 정리 | step 1 | 대기 | #89 | — |
| 3 | GitHub Actions workflow + OIDC IAM role 권한 추가 + `aws s3 sync` 자동화 | step 1 | 대기 | #89 | — |
| 4 | BGM mp3 S3 업로드 + `BgmManager.ts` 신규 + VillageScene 통합 + D11 가드(≤0.3) + LICENSE.md | step 2, 3 | 대기 | #89 | — |

## 3. 현재 단계 상세

### Step 1 — AWS S3 + IAM + CORS + ADR

**작업 항목**:

1. AWS 콘솔 결로 S3 버킷 신설 (`ap-northeast-2`, 이름 결로 결정 — 후보: `maeum-gohyang-assets`)
2. 버킷 정책 — public read (정적 자산 전체. 사용자 업로드 `uploads/`는 후속 트랙)
3. CORS 설정 — `https://ghworld.co` + `https://www.ghworld.co` + `http://localhost:3000` (dev) origin 허용
4. IAM role 결로 GitHub Actions OIDC 결로 `s3:PutObject`·`s3:DeleteObject` 권한 추가 (Step 3 결로 결로 결로 결로 결로 결로 — Step 1 결로 정책 박아둠)
5. ADR 작성 — `docs/architecture/decisions/{NNN}-s3-asset-hosting.md`
   - 결정: S3 통일 (R2 X), raw URL 시작 (CloudFront 후속), versioned prefix
   - 트레이드오프: spec.decisions D1·D2·D5와 동기화
6. spec §4 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 (decisions 변경 시)

**결정 사항** (spec §4 미리 박혔음 — Comprehension Gate 자동 통과):
- D1 스토리지 = S3 (R2 X)
- D2 도메인 = raw S3 URL (CloudFront 후속)
- D5 폴더 = versioned prefix (`v1/`)

**막힌 지점**: 없음. AWS 콘솔 수동 작업이 사용자 결로 필요.

## 4. 충돌 위험 파일

> 다른 트랙 (`harden-village-ops` 백엔드 운영) 과 영역 분리되어 있어 충돌 위험 낮음. parallel-work.md §3 Tier 분류 참조.

| 파일 | Tier | 동시 트랙 | 비고 |
|------|------|-----------|------|
| `docs/handover/INDEX.md` | 1 | 모두 | 트랙 추가/제거 시 충돌. 본 트랙은 이미 활성 표 박힘 (2026-05-17) |
| `docs/handover.md` | 1 | 모두 | **트랙 머지 PR 안에서만 갱신** — 진행 중에는 손대지 않음 |
| `docs/learning/RESERVED.md` | 1 | 모두 | 본 트랙 결로 51·52 이미 예약 |
| `frontend/.gitignore` | 1 | `harden-village-ops` 가능성 낮음 | 본 트랙 결로 mp3 정책 정리 |
| `frontend/package.json`·`package-lock.json` | 1 | Dependabot | 본 트랙 결로 손대지 않음 (의존성 변경 없음) |
| `.github/workflows/` | 1 | 거의 없음 | Step 3에서 신규 workflow 추가 (`asset-sync.yml`). 기존 workflow 수정 X |
| `frontend/src/three/audio/*` | 2 | 본 트랙 전용 | `BgmManager.ts` 신규, `sound-config.ts` 수정 |
| `frontend/public/assets/audio/` | 2 | 본 트랙 전용 | Step 4 결로 mp3 추가 (git 추적 X 유지) |

## 5. 다음 세션 착수 전 확인 사항

- main 동기화 (`git pull origin main`) — 다른 트랙 머지 시 변경 사항 점검
- `harden-village-ops` 트랙 상태 — PR #95 머지됐는지 (`gh pr list`)
- AWS 콘솔 접근 — Step 1 수동 작업 결로
- 사용자 보유 BGM mp3 파일 경로 확인 (Step 4 결로 S3 업로드 결로 결로 결로)

## 6. 보류 메모

- **CloudFront 도입** — raw S3 URL 시작, 후속 트랙. 트리거: latency 불만 / 캐시 hit ratio 부족 / 자산 합산 > 1GB
- **`uploads/chat/` 활성화** — 채팅 이미지 트랙으로 분리 (사용자 업로드 정책·유해 필터 별도 결정)
- **도서관 3D 모델 마이그** — 도서관 트랙으로 분리 (자산 폴더 구조 `v1/models/` 만 미리 박음)
- **BGM 곡 수 확장** — scene 별 분기 결로 결로 결로 (현재 마을·도서관 동일 곡). 트리거: 사용자 피드백 결로 곡 단조 결로
- **자산 압축 자동화** — mp3 비트레이트 결로 결로 결로 결로 (현재 사용자 사전 가공)
- **모니터링/알람** — S3 4xx·5xx 메트릭. 후속 인프라 트랙
