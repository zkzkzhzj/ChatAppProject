# Learning 51 — R2 vs S3 + CloudFront + OAC 설계 결정

> 트랙: `s3-media` (Issue #89)
> 작성일: 2026-05-20
> 관련: ADR 009 · spec [s3-media.md](../specs/features/s3-media.md) · 블로그 [zlog/study/2026-05-19](https://github.com/zkzkzhzj/zlog/blob/main/src/content/blog/study/2026-05-19/index.mdx)

---

## 0. 한 줄 요약

정적 자산 호스팅 결정에서 R2 대신 S3를 골랐고, 위에 CloudFront + OAC를 박았다. **공개 자산은 보호가 아니라 비용·운영 가드가 진짜 목표**라는 시야가 핵심 인사이트.

## 1. 결정 사이클 — 한 번에 안 끝났다

처음 옵션:
- A. `.gitignore` 예외 + git commit (MVP)
- B. Docker volume mount (EC2 호스트 결로 mp3 보존)
- C. S3 / R2 / CDN 결로 외부화

mp3 6.7MB만 보면 A가 가장 단순. 다만 도서관 트랙에서 자산이 더 늘어날 거(3D 모델·NPC 음성)라 **두 번 일 안 하려고** C 선택.

C 안에서 또 갈래:
- R2 (Cloudflare) — egress 무료
- S3 (AWS) — AWS 친숙도

R2가 비용상 매력 있었지만, **현재 자산이 작아서 egress < $1/월**. 그 이득 < 새 스택(wrangler) 학습 비용. 게다가 채팅 이미지·NPC 음성 같이 한 버킷에 통일하면 운영 스택 1개. → **S3 선택**.

> Gemini가 "S3 노출 = 무단 데이터 접근 위험"이라고 일반론을 답했는데, **우리 컨텍스트(public asset)와 분리**해야 했다. LLM이 컨텍스트 모르고 답할 때 끌려가지 말 것 (마플 커피챗 인사이트 [marpple_coffee_chat_insights.md] 결로 결로 결로).

## 2. URL 노출 ≠ 접근 가능

처음 박은 정책 = `v1/*` public read. 누구나 URL만 알면 GET 가능. "보안 위협 아니냐"고 자문했지만:

| 위협 | 진짜 위험 |
|---|---|
| URL 노출 | ❌ (public asset이라 의도된 결) |
| DDoS 비용 폭주 | ✅ (egress $0.09/GB → 1TB 다운로드 = $90+) |
| hotlinking (다른 사이트 무단 임베드) | ✅ (우리 트래픽 부담) |
| Layer 7 HTTP flood | ✅ (CloudFront도 Standard로 못 막음) |

→ 보안이 아니라 **비용·운영 가드**가 진짜 목표. Budget alert $40 + CloudFront로 가드 박았다.

## 3. CloudFront가 주는 5가지

1. **Edge 캐싱** — 자산 1개 100만 요청 결로 S3 fetch 1번. origin 부하 99.99% ↓
2. **글로벌 latency** — 600+ edge 결로 사용자 가까운 곳에서 응답
3. **DDoS 흡수 (Layer 3-4)** — AWS Shield Standard 무료 결합. SYN flood / UDP reflection 자동 mitigation
4. **HTTPS 자동** — cert 발급·관리 0
5. **Anycast 분산** — 1만 봇 공격도 600+ edge로 자연 분산

**완전 차단 ≠ CloudFront**. Layer 7은 WAF rate-limit ($5~10/월) 또는 Shield Advanced ($3,000/월) 별건. 우리 단계 결로 과함.

## 4. OAC 본질 — confused deputy 방어

Bucket Policy = `Principal: cloudfront.amazonaws.com` + `AWS:SourceArn = 우리 distribution`.

두 조건이 같이 박혀야 하는 이유:
- Principal만 박으면 = 전 세계 누구나 자기 CloudFront로 우리 S3 fetch 가능
- SourceArn 추가 = **우리 distribution만** 통과

이게 AWS에서 confused deputy 공격 방어 패턴. 신뢰 서비스(CloudFront)가 공격자 거 결로 위장 못 하게 막는 가드.

검증:

```
curl -I https://gohyang-***.s3.ap-northeast-2.amazonaws.com/v1/audio/ambient/gentle-wind.mp3
→ 403 Forbidden (직접 차단)

curl -I https://d***.cloudfront.net/v1/audio/ambient/gentle-wind.mp3
→ 200 OK (CloudFront 경유만 통과)
```

## 5. 무중단 마이그 절차 (실제 적용)

운영에 환경음이 들리는 상태에서 보호를 박을 때 순서가 중요:

1. CloudFront distribution 생성 (Bucket Policy는 Step 1 그대로 — public read 유지)
2. 코드 `NEXT_PUBLIC_ASSETS_BASE_URL` → CloudFront 도메인 갱신 + 운영 배포
3. 운영에서 CloudFront 경유 동작 확인
4. **마지막에** Bucket Policy를 OAC 전용으로 교체 → S3 직접 GET 403

순서 어기면 끊긴다:
- 1번 직후 4번 박으면 = S3 직접 차단 + CloudFront edge 캐시 비어있어서 origin fetch 실패 → 503/403
- 2번 안 박고 4번 박으면 = 코드가 여전히 S3 직접 GET → 운영 무음

## 6. 시행착오 — 처음에 박지 못한 결정 3개

| 항목 | 처음 의도 | 정정 후 |
|---|---|---|
| Step 3 (CD 자동 sync) | mp3 변경 → GitHub Actions로 S3 자동 sync | **폐기** — mp3가 git 추적 X라 trigger 불가. 사용자 콘솔 직접 업로드 |
| Step 4 (BGM 분리 매니저) | `BgmManager.ts` 신규 + 환경음 매니저 분리 | **폐기** — 사용자 의도가 "환경음 = BGM"이라 별도 매니저 X |
| Acceptance Criteria | "v1/* public read 확인" + "S3 직접 GET 403" 동시 | **단계별 분리** — Step 1·Step 2·Step 5 시점별 검증 |

→ spec.decisions 4축 미리 박았어도, 트랙 진행하면서 **현실 컨텍스트가 정정 강제하는 결정**이 있다. 폐기 흔적은 보존 (왜 처음에 그렇게 가려 했는지 의도 기록).

## 7. 핵심 인사이트

1. **공개 자산 URL 노출 ≠ 보안 위협** — 정책으로 누구나 GET 의도된 결로 박힘
2. **진짜 위협은 비용·운영** — egress 폭주·hotlinking·Layer 7
3. **CloudFront = 흡수·비용 가드** — 완전 보호 X. WAF·Shield Advanced 별건
4. **OAC = Principal + SourceArn 조합** — 둘 다 박혀야 confused deputy 방어
5. **무중단 마이그 순서가 핵심** — 보호 박는 시점 잘못 잡으면 운영 끊김
6. **LLM 일반론과 자기 컨텍스트 분리** — Gemini가 "S3 노출 위험"이라 했지만 우리 케이스에 안 맞았다

## 8. 다음에 같은 결정 결로 결로 점검할 것

- 자산이 정말 캐싱 가능한가? (가변 데이터면 CDN 효과 작음)
- egress 임계치 — 월 5TB 넘어가면 R2 재검토
- 글로벌 사용자 비중 — 30% 넘으면 edge 분산 효과 큼
- WAF rate-limit 도입 트리거 — Layer 7 공격 흔적 감지 시
- 자산 합산 1GB 넘어가면 — CloudFront 캐시 미스 비용 + invalidation 비용 모니터링 결로 결로

---

> 본 결정의 외부 정리는 zlog 블로그 [study/2026-05-19](https://github.com/zkzkzhzj/zlog/blob/main/src/content/blog/study/2026-05-19/index.mdx) 결로 더 깊이 풀었다 (마스킹 결로 — 버킷명·distribution ID 등).
