# Learning 52 — frontend 자산 외부화 패턴 (NEXT_PUBLIC_* 빌드 inline + 무중단 마이그)

> 트랙: `s3-media` (Issue #89)
> 작성일: 2026-05-20
> 관련: ADR 009 · learning 51 · spec [s3-media.md](../specs/features/s3-media.md)

---

## 0. 한 줄 요약

Next.js의 `NEXT_PUBLIC_*` 환경변수는 **빌드 시점에 클라이언트 번들에 평문 인라인**된다. 그래서 fallback·secret 가드 논의가 일반적인 backend env와 다르게 흘러야 한다.

## 1. 왜 NEXT_PUBLIC_*는 일반 env와 다른가

### 일반 env (backend, Node.js 서버사이드)
- 런타임에 `process.env.X` 결로 읽음
- 운영 결로 변경하면 재시작만으로 적용
- secret으로 안전하게 박을 수 있음 (서버 결로만 접근)

### NEXT_PUBLIC_*
- 빌드 시점에 `process.env.NEXT_PUBLIC_X`가 **문자열 그대로 코드에 대체** (string replacement)
- `.next/static/*.js` 결로 평문 인라인됨
- **브라우저에 그대로 노출** — Network 탭 결로 누구나 봄

→ secret으로 박는 의미 X. fallback git 노출 vs vars-only 보호도 사실상 동등 (어차피 빌드 결과로 노출됨).

## 2. 빌드·배포 파이프라인 어디 결로 박히나

마음의 고향 결로 NEXT_PUBLIC_ASSETS_BASE_URL이 박힌 곳 4개:

```
1. frontend/.env.local.example  ← 개발자 참고용
2. frontend/.env.local           ← dev 실행 결로 (gitignored)
3. frontend/Dockerfile           ← ARG default + ENV
4. .github/workflows/deploy.yml  ← build-args (vars 또는 fallback)
5. deploy/docker-compose.yml     ← frontend.build.args
```

배포 흐름:

```
GitHub Actions deploy.yml (runner)
  ↓ docker build --build-arg NEXT_PUBLIC_ASSETS_BASE_URL=...
Dockerfile ARG → ENV
  ↓ RUN npm run build
Next.js가 그 값 결로 .next/static/*.js 결로 string 인라인
  ↓ docker push GHCR
EC2 컨테이너 실행 — env 이미 박혀있음
```

핵심: **EC2 결로 별도 env 박을 필요 X**. 빌드 결과 결로 이미 인라인.

## 3. fallback 결정 결로 가드 논쟁

CodeRabbit이 두 번 같은 결로 지적:
> "fallback 제거하고 vars 미설정 시 빌드 실패하게 fail-fast로 가세요."

우리 결정 — **fallback 유지** (Skip with reason):

| 항목 | fallback 유지 | vars-only (fail-fast) |
|---|---|---|
| git history 노출 | URL 박힘 | URL 안 박힘 |
| 운영 클라 번들 노출 | 노출 | **여전히 노출** (NEXT_PUBLIC 특성) |
| vars 미설정 시 | 운영 동작 OK | 빌드 실패 |
| fork 사용자 | 동작 OK | 빌드 실패 |
| 실수 가드 | 약함 | 강함 |

핵심: **노출 회피 = 어차피 불가**. 그러면 fallback의 안전망 가치가 fail-fast 가드 가치보다 큼 (현재 단계 결로). vars 등록 운영 부담 + fork 호환성 결로.

## 4. 무중단 마이그 — env URL 갱신 시 순서

CloudFront 도입 결로 `NEXT_PUBLIC_ASSETS_BASE_URL`을 S3 URL → CloudFront URL로 바꿀 때:

순서 어기면 끊김:
1. **fallback 갱신** (Dockerfile + deploy.yml + docker-compose.yml + .env.local.example 4곳)
2. **로컬 .env.local 갱신** (dev 결로 즉시 검증)
3. PR push → CI 통과 → 머지 → CD 자동 배포
4. 운영 결로 새 URL 결로 fetch 확인 (Network 탭 결로 새 domain 보이는지)
5. **그 후** S3 Bucket Policy 결로 OAC 결로 교체 (S3 직접 차단)

5번을 1~4번 전에 박으면 = 코드가 여전히 옛 URL 결로 fetch → 403 → 운영 무음.

## 5. 4곳 동기화 부담

마이그 시 fallback URL 박힌 4곳 다 동기화 필요. 한 곳만 빠지면 환경별 동작 차이 발생:
- Dockerfile ARG default — `docker build`를 별도 옵션 없이 돌릴 때 (테스트·로컬 빌드)
- deploy.yml build-args — CD 빌드
- docker-compose.yml — 로컬 `docker compose up --build`
- .env.local.example — dev 참고

미래 결로 단일 source of truth 박을 수 있는지 검토 결로:
- 옵션: `.env` 파일 하나 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로
- 다만 빌드 컨텍스트 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로

YAGNI — 자산 자주 안 변하니 4곳 수동 동기화 결로 우선. 트리거: 마이그 빈도 > 분기 1회 결로 결로 결로 결로.

## 6. dev 결로 검증 — Next.js NEXT_PUBLIC_* 동작 확인

dev 환경 결로 검증할 때 주의:
- `.env.local` 변경 → `npm run dev` 재시작 필요 (HMR로 안 잡힘)
- 빌드 캐시 깨려면 `.next/` 결로 결로 삭제 후 재시작
- `npm run build` 결로 결로 결로 검증 — 빌드 결과 결로 string 인라인된 부분 grep 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로 결로

빌드 결과 검증 결로:

```
grep "gohyang-\\*\\*\\*\\.s3" frontend/.next/static/*.js
# 또는 CloudFront 결로 박힌 후
grep "d\\*\\*\\*\\.cloudfront\\.net" frontend/.next/static/*.js
```

## 7. 비교 — backend env와 다른 점 정리

| 차원 | NEXT_PUBLIC_* (frontend) | backend (Spring Boot 결로) |
|---|---|---|
| 위치 | 클라이언트 번들 (브라우저 결로) | 서버 메모리 (EC2 결로) |
| 노출 | 평문 (브라우저 결로 누구나) | 비공개 (서버 결로만) |
| secret 가능 | ❌ | ✅ (GitHub Secrets / SSM Parameter Store) |
| 변경 적용 | 재빌드 + 재배포 | 재시작 (또는 hot reload) |
| 빌드 결로 결정 시점 | docker build 시점 | 런타임 |

→ NEXT_PUBLIC_* secret 박지 마. 어차피 노출. 가드는 OAC 결로 결로 (S3 직접 차단).

## 8. 다음에 같은 패턴 결로 마이그할 때

- ✅ fallback URL 4곳 (Dockerfile / deploy.yml / docker-compose / .env.local.example) 동기화 — 한 곳도 빠뜨리지 말 것
- ✅ 무중단 마이그 순서 — 코드 갱신 → 운영 검증 → 마지막에 S3 정책 변경
- ✅ `npm run build` 결로 빌드 결과 grep — 새 URL 결로 박혔는지 확인
- ✅ vars 도입 시 — fallback과 같이 박을지(안전망) vs 제거(fail-fast) 트레이드오프 의식
- ❌ NEXT_PUBLIC_*를 secret으로 박지 말 것 — 어차피 노출
- ❌ dev 결로 캐시 안 깨고 검증 시도 — `.next/` 삭제 후 재빌드

---

> 본 패턴의 실전 적용 흐름은 ADR 009 §운영 매뉴얼과 트랙 [track-s3-media.md](../handover/track-s3-media.md) 결로 결로 결로.
