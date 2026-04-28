# Track: infra-tls-hardening

> 작업 영역: Cloudflare ↔ EC2 구간 TLS 강화 + nginx 표준 구조 마이그
> 시작일: 2026-04-28
> 종료일: 2026-04-28 (1세션)
> 상태: ✅ 종료

---

## 0. 한 줄 요약

`token-auto-renewal` (Issue #38) 본 작업의 전제 — Cloudflare SSL `Flexible` 의 보안 환상을 걷어내고, Secure cookie · HSTS · 보안그룹·nginx 표준 구조까지 정리해 토큰을 다룰 수 있는 인프라 토대를 만든다.

## 1. 배경 / 왜

`token-auto-renewal` 본 작업으로 들어가려고 cookie 깊은 다이브를 하다가 발견된 사실:

- 기존 Cloudflare SSL 모드가 `Flexible` — 사용자↔Cloudflare 만 HTTPS, Cloudflare↔EC2 는 평문(`reference_aws_deployment.md` 갱신 전 상태)
- 이 상태에서 Secure cookie 를 도입해도 Cloudflare↔origin 구간에서 토큰 평문 노출 → 보안 환상
- 토큰 작업 시작 전에 이 토대를 먼저 잡아야 한다는 결론 → 별도 트랙으로 분리

연관 학습노트: [65 — HttpOnly·Secure·SameSite cookie 깊은 다이브](../learning/65-cookie-security-attributes-deep-dive.md)

## 2. 전체 로드맵

| Step | 내용 | 상태 |
|------|------|------|
| 1 | Cloudflare SSL Flexible → Full (strict) 전환 | ✅ |
| 2 | Cloudflare Origin CA 인증서 발급 + EC2 nginx 에 설치 (RSA 2048, 15년) | ✅ |
| 3 | Always Use HTTPS 토글 ON (사용자가 http:// 시도 시 301 redirect) | ✅ |
| 4 | HSTS 헤더 (Cloudflare 측, 6 months / includeSubDomains ON / preload OFF) | ✅ |
| 5 | EC2 보안 그룹 인바운드 80/443 → Cloudflare IP 대역만 허용 (prefix list IPv4) | ✅ |
| 6 | nginx.conf 비표준 구조 → `sites-enabled/*` include 표준 마이그 | ✅ |
| 7 | `sites-available/default` 에 80 → HTTPS redirect + 443 ssl + location 4개(`/api/`·`/ws`·`/actuator/`·`/`) 통합 | ✅ |

## 3. 결정 이력 (트랙 종료 시점 정리)

### 3.1 SSL 모드

- **선택**: Full (strict). origin 인증서 검증까지 포함
- **대안**: Full (검증 없음 — origin 인증서 위변조 위험), Flexible (Cloudflare↔origin 평문)
- **이유**: 검증 없는 Full 은 표적성 있는 환경에서 위험. strict 가 표준

### 3.2 origin 인증서 — Cloudflare Origin CA

- **선택**: Cloudflare Origin CA. 무료 발급, 15년 유효, RSA 2048
- **대안**: Let's Encrypt (90일 자동 갱신 부담), AWS ACM (EC2 직접 사용 불가, ALB/CloudFront 전용)
- **이유**: Cloudflare 가 origin 접근할 때만 신뢰하는 사설 인증서로 충분. 운영 부담 0

### 3.3 HSTS — Cloudflare 측에서 활성화

- **선택**: Cloudflare Edge Certificates 메뉴에서 ON. max-age 6 months / includeSubDomains ON / preload OFF
- **대안**: Spring Security 측에서 헤더 명시 (정적 자산은 nginx 직접 응답이라 안 붙는 함정)
- **이유**: edge 에서 모든 응답에 일관 적용. 한 곳에서만 켜야 정합성

### 3.4 HSTS preload 보류

- **선택**: 미등록
- **이유**: 등록은 사실상 영구. 모든 서브도메인 HTTPS 가능 검증 후 별도 작업으로 미룸

### 3.5 CAA 레코드 보류

- **선택**: 미설정
- **이유**: Cloudflare Universal SSL 의 갱신 CA 가 시점마다 달라 잘못 좁히면 갱신 실패 → 사이트 다운. 본인이 갱신 채널을 명확히 통제할 때만 좁히기. 일반론과 반대 결정

### 3.6 DNSSEC 보류

- **선택**: 미설정
- **이유**: GitHub/Slack/Discord 같은 큰 서비스도 잘 안 씀. HSTS preload + CAA + CT 모니터링 조합이면 사실상 충분. 마음의 고향 규모에 ROI 낮음

### 3.7 보안 그룹 prefix list

- **선택**: 관리형 접두사 목록 + Cloudflare IPv4 15개 등록. HTTPS 443 만 허용, 80 은 닫음
- **이유**: Cloudflare 우회 차단. 80 은 Cloudflare 가 origin 호출 시 사용 안 하므로 닫아 보안 표면 축소. EC2 가 IPv6 비활성이라 IPv4 만 등록

### 3.8 nginx 구조 마이그

- **선택**: `sites-enabled/*` include 표준 구조
- **대안**: nginx.conf 안에 server 블록 직접 박아두기 (기존 비표준)
- **이유**: 새 사이트 추가/관리 표준화. Ubuntu 패키지 표준 따라 sites-available/sites-enabled 패턴

## 4. 디버깅 노하우 (다음 세션에 도움이 될 것)

1. **보안 그룹 prefix list 의 IPv4/IPv6 거꾸로 박힘** → Cloudflare 522 Connection timed out. HTTPS(443) 규칙에 IPv6 prefix list 가 박혀서 IPv4 트래픽이 매칭 안 돼 DROP. 주소 패밀리 항상 확인
2. **nginx.conf 가 sites-enabled 를 include 안 함** → sites-available 편집해도 적용 안 됨. `sudo nginx -T 2>&1 | grep -E "listen 443|ssl_certificate"` 로 로드된 설정에 들어갔는지 검증
3. **http2 디렉티브 버전 호환성** → nginx 1.18 은 `listen 443 ssl http2;`, 1.25+ 는 `http2 on;` 별도 디렉티브. 옛 문법으로 통일이 호환성 안전
4. **Cloudflare 521 vs 522** → 521 = TCP 도달 후 origin connection refused (nginx 가 443 안 듣고 있음). 522 = TCP 도달 자체 실패 (보안 그룹·방화벽). 에러 코드로 어디까지 도달했는지 좁히는 게 빠른 디버깅

## 5. 충돌 위험 파일

- `deploy/docker-compose.yml` (트랙에서 직접 수정 X, nginx 컨테이너화는 별도 트랙)
- nginx 설정 (`/etc/nginx/nginx.conf`, `/etc/nginx/sites-available/default`) — EC2 운영 환경에 있음. git 레포지토리에는 없음. IaC 화는 별도 작업

## 6. 산출물

- 학습노트 [65](../learning/65-cookie-security-attributes-deep-dive.md) — Cookie 보안 속성 깊은 다이브
- 리서치 [token-renewal-patterns.md](../knowledge/realtime/token-renewal-patterns.md) — 본 트랙 출발점 산업 사례
- 운영: ghworld.co 의 TLS 토대가 토큰 작업을 받을 수 있는 상태로 강화됨
- 메모리 갱신 필요: `reference_aws_deployment.md` 에 SSL 모드 갱신 (Flexible → Full strict)

## 7. 후속 트랙 — token-auto-renewal

본 트랙이 만든 토대 위에서 다음 트랙이 본격 토큰 작업 진행:

- 백엔드: `JwtProvider` refresh 발급, `POST /api/v1/auth/refresh`, JWT `gid` claim, HttpOnly cookie 발급, `forward-headers-strategy=framework`
- 프론트엔드: axios 401 interceptor → silent refresh, `useStomp` 401 → 재연결, `auth.ts` `guestId` LocalStorage 관리
- learning: #55 (sliding session 종합), #61 (idle 정의 — (나) WS 끊김 채택), #62 (rotation+reuse detection), #63 (게스트 영속 식별자), #64 (WS 토큰 갱신 패턴) 가 본 트랙 결과물

## 8. 다음 세션이 본 트랙을 다시 봐야 할 시점

- ghworld.co 가 SSL 오류로 다운된 경우 — `§4. 디버깅 노하우` 참조
- HSTS preload 등록 시점이 됐을 때 — `§3.4` 의 보류 근거 재검토
- CAA 켜고 싶을 때 — `§3.5` 의 Cloudflare CA 갱신 위험 재검토
- DNSSEC 검토 시 — `§3.6` 의 ROI 재평가 (서비스 규모·표적성 변화 시)
