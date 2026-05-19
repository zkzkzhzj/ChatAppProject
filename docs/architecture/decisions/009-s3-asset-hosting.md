# ADR 009 — 정적 에셋 외부 호스팅 (AWS S3 + versioned prefix)

> **상태**: Accepted
> **결정일**: 2026-05-17
> **트랙**: [`s3-media`](../../handover/track-s3-media.md) (Issue #89)
> **spec**: [`docs/specs/features/s3-media.md`](../../specs/features/s3-media.md)
> **관련 learning**: 51 (R2 vs S3 ADR — 작성 예정), 52 (frontend 자산 외부화 패턴 — 작성 예정)

## 컨텍스트

운영 환경(`ghworld.co`)에서 환경음 4종 + BGM 무음 상태. 원인:

- `frontend/.gitignore:44-50`에서 mp3 추적 X (spec D4' "외부 인프라 마이그 예정" 결정으로 미뤄둠)
- Docker 이미지 빌드 컨텍스트에 mp3 미포함 → 컨테이너 재시작/재배포 시마다 무음
- 사용자가 BGM mp3를 EC2에 SCP로 직접 올렸으나, 새 이미지 배포 시 사라짐

도서관 트랙에서 자산이 더 늘어날 예정 (3D 인테리어·NPC 음성·채팅 이미지). 지금 git에 묶었다가 빼는 두 번 일 피하기 위해 정석으로 외부화.

## 결정

**AWS S3 단일 버킷 + versioned prefix 패턴**으로 정적 에셋을 외부 호스팅한다.

### 핵심 결정 3축

1. **스토리지 = AWS S3** (Cloudflare R2 X) — spec D1
2. **도메인 = raw S3 URL** (CloudFront 후속) — spec D2
3. **폴더 = versioned prefix** (`v1/`) — spec D5

### 인프라 사양

| 항목 | 값 |
|---|---|
| 버킷 이름 | `gohyang-s3-buket-20260514` |
| 리전 | `ap-northeast-2` (서울) |
| CloudFront distribution | `d9btdaowoaya0.cloudfront.net` (Step 5, 2026-05-19) |
| 클라 URL 형식 | `https://d9btdaowoaya0.cloudfront.net/v1/{path}` |
| 정적 prefix | `v1/audio/{ambient,bgm}/`, `v1/models/`, `v1/textures/` (확장 예정) |
| 사용자 업로드 prefix (후속) | `uploads/chat/{userId}/{messageId}.{ext}` — 비공개 유지 |

## 트레이드오프 (왜 R2 X)

| 차원 | AWS S3 | Cloudflare R2 |
|---|---|---|
| egress 비용 | $0.09/GB out | **무료** |
| storage 비용 | $0.023/GB·월 | $0.015/GB·월 |
| 도메인 통합 | CloudFront 추가 필요 | Cloudflare DNS 직결 |
| AWS 생태계 통합 | IAM·CloudWatch 깊음 | 별도 |
| 학습 곡선 | aws-cli (이미 익숙) | wrangler (새로) |

**S3 선택 이유**:
- AWS 친숙도 (EC2·SSM·OIDC CD 이미 보유 — [learning 37](../../learning/37-cd-pipeline-design.md))
- 자산 크기 작음 (현재 mp3 6.7MB) → egress 비용 < $1/월
- 채팅 이미지·NPC 음성·정적 에셋 통일로 운영 스택 1개

**재검토 트리거**: 월 egress > $5 / 글로벌 사용자 비중 > 30% / 자산 합산 > 1GB

## 운영 매뉴얼 (재현 가능한 설정)

### 1. Block Public Access 일부 해제

콘솔 → S3 → 버킷 → Permissions → "Block public access" → Edit:

- 상단 "모든 퍼블릭 액세스 차단" → **해제**
- 4개 개별 설정:
  - ✅ 유지: "새 ACL ... 차단" (ACL 안 씀)
  - ✅ 유지: "임의의 ACL ... 차단" (ACL 안 씀)
  - ⬜ 해제: "새 퍼블릭 버킷 또는 액세스 지점 정책 ... 차단"
  - ⬜ 해제: "임의의 퍼블릭 버킷 또는 액세스 지점 정책 ... 퍼블릭 및 교차 계정 액세스 차단"

저장 시 "confirm" 입력.

### 2. Bucket Policy

**Step 1 시점 (S3 raw, 임시 — 무중단 마이그 결로 결로 유지)**:

Permissions → "Bucket policy" → Edit → 붙여넣기 → Save:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadV1Assets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::gohyang-s3-buket-20260514/v1/*"
    }
  ]
}
```

`v1/` prefix만 public read. `uploads/` 같은 사용자 업로드 경로는 비공개 유지 — 후속 트랙에서 sigv4 또는 presigned URL로 접근 제공.

**Step 5 시점 (CloudFront + OAC, 최종)**:

S3 직접 GET 차단 + CloudFront만 접근. CloudFront distribution 생성 시 콘솔이 자동 생성한 정책 결로 결로:

```json
{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::gohyang-s3-buket-20260514/v1/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::{ACCOUNT_ID}:distribution/{DISTRIBUTION_ID}"
        }
      }
    }
  ]
}
```

→ S3 직접 GET 403. CloudFront 결로만 200.

**무중단 마이그 순서**:
1. CloudFront distribution 생성 (Bucket Policy는 Step 1 결로 유지 — public read)
2. 코드 결로 `NEXT_PUBLIC_ASSETS_BASE_URL` → CloudFront 도메인 갱신 + 운영 배포
3. 운영 결로 CloudFront 경로 환경음 동작 확인
4. Bucket Policy 결로 Step 5 버전 결로 교체 (S3 직접 차단)

### 3. CORS (브라우저 cross-origin fetch 허용)

Permissions → "Cross-origin resource sharing (CORS)" → Edit → 붙여넣기 → Save:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://ghworld.co",
      "https://www.ghworld.co",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

### 4. IAM Role (GitHub Actions OIDC — Step 3에서 박힘)

Step 3 CD sync workflow에서 필요. 기존 OIDC role(`learning 37` 참조)에 정책 추가:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListV1Prefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::gohyang-s3-buket-20260514",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["v1/*"]
        }
      }
    },
    {
      "Sid": "WriteV1Objects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::gohyang-s3-buket-20260514/v1/*"
    }
  ]
}
```

> 두 Statement로 분리한 이유: `s3:ListBucket`은 bucket-level action (object ARN에 못 붙음), `s3:PutObject`·`s3:DeleteObject`는 object-level action. ListBucket을 `s3:prefix` Condition으로 제한해서 CD가 `v1/` 밖을 못 본다.
>
> 본 Step 1에서는 정책 정의만 박아두고, 실제 권한 부착은 Step 3에서.

## versioned prefix 패턴

자산 갱신 시 prefix를 `v1` → `v2`로 올려서 **브라우저·CDN 캐시 일괄 무효화**.

```
s3://gohyang-s3-buket-20260514/v1/audio/ambient/gentle-wind.mp3   ← 현재
s3://gohyang-s3-buket-20260514/v2/audio/ambient/gentle-wind.mp3   ← 다음 세대 (전환 후)
```

전환 시 동시 갱신:
- `NEXT_PUBLIC_ASSETS_BASE_URL` (frontend env)
- GitHub Actions sync target prefix
- 이 ADR의 인프라 사양 표 + 운영 매뉴얼 prefix

> 첫 전환 절차는 Step 2~4 끝나고 정형화.

## 빈틈·재검토 트리거

- **CORS 헤더 직접 관리** — CloudFront 도입 후 단순화 가능
- **캐시 TTL S3 기본값** — 매 요청 fetch. CloudFront 또는 Cloudflare proxy로 캐시 레이어 보강 (latency 부담 발견 시)
- **다중 리전·글로벌 사용자 latency** — CloudFront 후속
- **자산 합산 > 1GB** — R2 마이그 재검토 (egress 비용 임계치 도달 시)

## 후속 결정

- Step 2 — `NEXT_PUBLIC_ASSETS_BASE_URL` 환경변수 패턴 (learning 52에서 정리 예정)
- Step 3 — GitHub Actions sync workflow + OIDC 권한 추가
- ~~Step 4 — BGM mp3 + `BgmManager.ts` 통합~~ — **폐기 (2026-05-18)**: BGM = 환경음 4종으로 확정. 별도 BGM 매니저 만들지 않음
- 후속 트랙 — `s3-media-uploads` (채팅 이미지용 비공개 sigv4·presigned URL)

## 참조

- spec: [`docs/specs/features/s3-media.md`](../../specs/features/s3-media.md)
- 트랙: [`docs/handover/track-s3-media.md`](../../handover/track-s3-media.md)
- 환경음 무음 root cause: `frontend/.gitignore:44-50` + `frontend/public/assets/audio/ambient/README.md`
- 기존 CD 인프라: [learning 37](../../learning/37-cd-pipeline-design.md), [learning 35](../../learning/35-aws-ec2-first-deployment.md)
- TLS·도메인 인프라: [learning 65](../../learning/65-cookie-security-attributes-deep-dive.md), `infra-tls-hardening` 트랙
