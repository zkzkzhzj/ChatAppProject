# Next.js Standalone + Docker Healthcheck: IPv6 바인딩 이슈

> 작성일: 2026-04-21
> 관련 PR: #17, #18, #19 (CD 파이프라인 healthcheck 연속 실패)
> 관련 파일: `deploy/docker-compose.yml`, `frontend/Dockerfile`
> 분류: Infra / Next.js 자체 호스팅

---

## 1. 요약 (TL;DR)

- **증상**: `node:22-alpine` 위의 Next.js 16.2.2 standalone 컨테이너에서 Docker `HEALTHCHECK`가 `wget http://127.0.0.1:3000/` 또는 `nc -z 127.0.0.1 3000`로 항상 실패. `docker compose up --wait`가 타임아웃.
- **근본 원인**: Next.js standalone `server.js`는 `process.env.HOSTNAME`이 설정되지 않으면 `localhost`에 바인딩한다. Node 17+는 `localhost`를 IPv6(`::1`) 먼저 해석한다. 반면 Alpine BusyBox의 `wget`/`nc`는 IPv6를 완전하게 지원하지 않으며 IPv4(`127.0.0.1`)로 접근하기 때문에 소켓이 맞지 않아 거부된다.
- **우리 해결**: `docker-compose.yml`의 frontend 서비스에 `HOSTNAME=0.0.0.0`을 주입하고 Dockerfile의 `HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ || exit 1`을 복원. 결과적으로 서버가 모든 인터페이스(IPv4 포함)에 바인딩되며 healthcheck가 즉시 통과.
- **표준 접근인가?** **예.** Vercel 공식 `examples/with-docker/Dockerfile` 자체가 `ENV HOSTNAME="0.0.0.0"`을 권장한다. 다만 Alpine에서 healthcheck 신뢰성을 위해 `curl`을 별도 설치하거나 `/api/health` 엔드포인트를 두는 것이 한 단계 더 권장되는 패턴이다.

---

## 2. 문제 재현 조건

모두 만족해야 이 이슈가 재현된다.

1. 베이스 이미지가 **Alpine 계열** (`node:*-alpine`, `alpine`) — BusyBox 유틸리티를 쓴다.
2. Next.js가 `output: "standalone"` 빌드이고 `node server.js`로 실행된다.
3. 컨테이너에 `HOSTNAME` 환경변수가 **없거나**, `localhost` / `127.0.0.1`로 명시되어 있다.
4. Node 17 이상이 사용된다 (우리는 node:22).
5. Dockerfile `HEALTHCHECK`나 `docker-compose.yml`의 `healthcheck.test`가 `wget`/`nc`를 `127.0.0.1` 또는 `localhost`로 때린다.

### 관찰되는 증상

- 브라우저/외부 포트매핑으로 접속 시 200 OK (애플리케이션은 정상).
- `docker exec <container> wget -qO- http://127.0.0.1:3000/` → `wget: can't connect to remote host (127.0.0.1): Connection refused`
- `docker exec <container> nc -z 127.0.0.1 3000` → 실패
- `docker exec <container> netstat -tlnp` 또는 `ss -tlnp` → `:::3000` 또는 `::1:3000`만 LISTEN (IPv4 127.0.0.1 없음)

---

## 3. 근본 원인 (1차 출처 기반)

### 3.1 Next.js standalone은 기본 호스트명이 `localhost`

Next.js Issue [#44043](https://github.com/vercel/next.js/issues/44043)과 Discussion [#44626](https://github.com/vercel/next.js/discussions/44626)에서 명시:

> "When building with `output: 'standalone'`, generated `server.js` has hardcoded `'localhost'` as hostname."

이후 PR을 통해 `HOSTNAME` 환경변수가 standalone `server.js`에서 읽히도록 반영되었다. 공식 문서 [next.config.js output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)과 [Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting)에서:

> "You can run `PORT=8080 HOSTNAME=0.0.0.0 node server.js` to start the server on `http://0.0.0.0:8080`."

즉, **`HOSTNAME` 미지정 시 기본은 `localhost`**이며 standalone 서버는 이것을 그대로 `server.listen(port, hostname)`에 넘긴다.

### 3.2 Node.js 17+는 localhost → IPv6 우선 해석

Node Issue [#40537](https://github.com/nodejs/node/issues/40537), [#48712](https://github.com/nodejs/node/issues/48712):

> "In Node.js 17, the resolution of `localhost` changed from favoring IPv4 in Node 16 and earlier, to favoring IPv6."
> "`--dns-result-order` now defaults to `verbatim` (instead of `ipv4first`), which means `localhost` will now resolve to `::1` (IPv6) instead of `127.0.0.1`."

이전 방어적 워크어라운드는 `--dns-result-order=ipv4first` 플래그 또는 `node --dns-result-order=ipv4first server.js`였으나(참고: [Matteo Collina X 포스트](https://twitter.com/matteocollina/status/1640384245834055680)), 이는 근본 해결이 아니다.

### 3.3 Next.js standalone의 IPv6 바인딩 회귀 보고

Discussion [#54025](https://github.com/vercel/next.js/discussions/54025)에서 13.4.12 → 13.4.15 사이에:

> "started server on `[::1]:3000`, url: `http://[::1]:3000`"

형태로 IPv6 루프백에만 바인딩되는 현상이 보고되었다. 원인은 Node 17+ DNS 순서 변경이 Next.js 내부 `localhost` 기본값을 만나 발생한 것으로, 이슈 [#46090](https://github.com/vercel/next.js/issues/46090)에서도 `next dev`/`next start` 간 바인딩 불일치로 교차 확인된다.

### 3.4 Alpine BusyBox wget/nc의 IPv6 미지원

Alpine GitLab Issue [#10937 — "wget included in alpine / busybox does not support IPv6"](https://gitlab.alpinelinux.org/alpine/aports/-/issues/10937):

> "BusyBox's `str2sockaddr` and `host2sockaddr` functions do not return a list of IP addresses but just a single IP address, so networking tools within BusyBox are not able to fallback to a next IP address."

Alpine GitLab Issue [#16286 — BusyBox netstat no IPv6 support](https://gitlab.alpinelinux.org/alpine/aports/-/issues/16286)와 합쳐 보면, **Alpine의 BusyBox 네트워크 툴은 IPv6 주소에 대한 fallback/연결이 신뢰할 수 없다**.

권장 우회는:
> "BusyBox's wget is not fully IPv6 compliant, so it's a good idea to replace the wget command with `apk add wget` or use the `curl` command."

### 3.5 종합 — 왜 실패하는가

```
[Next.js standalone: 기본 hostname='localhost']
         │
         ▼
[Node 22: localhost → '::1' IPv6 우선 해석]
         │
         ▼
[Node http.Server가 '::1'(IPv6 루프백)에만 LISTEN]
         │
         ▼
[BusyBox wget/nc 127.0.0.1:3000 시도]
         │
         ▼
[IPv4 127.0.0.1에는 LISTEN 소켓 없음 → Connection refused]
         │
         ▼
[Docker HEALTHCHECK: unhealthy]
```

> 참고: Linux에서 `::` (all-interfaces IPv6)에 바인딩하면 기본적으로 `IPV6_V6ONLY=0`이라 IPv4도 `::ffff:x.x.x.x` 형태로 수락된다 ([Node Issue #9390](https://github.com/nodejs/node/issues/9390), [#17664](https://github.com/nodejs/node/issues/17664)). 하지만 Next.js가 바인딩하는 것은 `::`가 아니라 **`::1` (IPv6 루프백 전용)** 이므로 이 dual-stack 마법은 작동하지 않는다. `::1`은 IPv4 fallback을 받지 않는다.

---

## 4. 우리의 해결과 대안들

### 4.1 우리가 채택한 해결: `HOSTNAME=0.0.0.0` + `wget` HEALTHCHECK

```yaml
# deploy/docker-compose.yml (발췌)
services:
  frontend:
    environment:
      HOSTNAME: "0.0.0.0"
```

```dockerfile
# frontend/Dockerfile (발췌)
# HOSTNAME=0.0.0.0 (compose에서 주입)으로 IPv4 바인딩 강제 → busybox wget 127.0.0.1 접근 가능.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
```

> `start-period=30s`는 Next.js 초기 컴파일/웜업을 감안, `retries=5`는 CD에서 `docker compose up --wait`가 일시적 네트워크 지연에도 안정적으로 판정되도록 설정. `>/dev/null 2>&1`은 healthcheck stdout/stderr이 Docker 로그에 불필요하게 쌓이는 것을 방지.

**왜 이것이 동작하는가**: 서버가 `0.0.0.0` (IPv4 전 인터페이스)에 LISTEN하므로 `127.0.0.1`로 오는 BusyBox wget도 문제없이 닿는다. Linux에서는 `0.0.0.0` 바인딩이 IPv4 전용이지만, 컨테이너 내부의 healthcheck는 IPv4 루프백만 쓰면 되므로 충분하다.

**이 방식이 표준인 증거**: Vercel 공식 [examples/with-docker/Dockerfile](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)과 [examples/with-docker-compose/next-app/prod.Dockerfile](https://github.com/vercel/next.js/blob/canary/examples/with-docker-compose/next-app/prod.Dockerfile) 모두 `ENV HOSTNAME="0.0.0.0"`을 기본으로 설정한다.

### 4.2 대안 A: `-H 0.0.0.0` CLI 플래그 (해당 없음)

`next start --hostname 0.0.0.0`은 정식 flag이지만, standalone 모드에서는 `next start`가 아니라 `node server.js`를 쓰기 때문에 CLI 플래그가 작동하지 않는다. 환경변수가 유일한 채널이다 ([Issue #44043](https://github.com/vercel/next.js/issues/44043)).

### 4.3 대안 B: `server.js` 포스트빌드 패치

Discussion #44626에 등장하는 과거 워크어라운드:

```bash
sed -i "s/hostname: 'localhost'/hostname: '0.0.0.0'/" .next/standalone/server.js
```

현재는 `HOSTNAME` env가 공식 지원되므로 **사용하지 말 것**. 빌드 산출물을 손대는 것은 유지보수성이 나쁘다.

### 4.4 대안 C: Alpine에 `curl` 설치 후 curl 사용

```dockerfile
RUN apk add --no-cache curl
HEALTHCHECK CMD curl --fail http://127.0.0.1:3000/ || exit 1
```

- **장점**: curl은 IPv6/IPv4 fallback이 제대로 동작한다. 이미지 크기 증가 약 1MB.
- **단점**: BusyBox wget과 달리 이미지에 없는 것이므로 설치 단계가 추가된다. **하지만 `HOSTNAME=0.0.0.0`이 이미 설정되어 있다면 BusyBox wget으로도 충분하므로, curl 설치는 과잉.**

### 4.5 대안 D: `node -e "require('http').get(...)"` 사용

```dockerfile
HEALTHCHECK CMD node -e "require('http').get('http://127.0.0.1:3000/', r => process.exit(r.statusCode < 400 ? 0 : 1)).on('error', () => process.exit(1))"
```

- **장점**: 추가 바이너리 필요 없음, 컨테이너 내 Node가 이미 있음.
- **단점**: 가독성 나쁨, 타임아웃 명시가 장황.
- [Matt Knight — Docker healthchecks in distroless Node.js](https://www.mattknight.io/blog/docker-healthchecks-in-distroless-node-js)에서 distroless 컨테이너용으로 권장되는 패턴. 일반 Alpine에서는 오버엔지니어링.

### 4.6 대안 E: 전용 `/api/health` 라우트

```ts
// app/api/health/route.ts
export async function GET() {
  return Response.json(
    { status: "healthy", uptime: process.uptime() },
    { status: 200, headers: { "Cache-Control": "no-cache, no-store" } }
  );
}
```

- **장점**: healthcheck가 루트 페이지의 SSR 비용을 건드리지 않는다. 의존성(DB, Redis 등) 체크 확장 가능. [Nurbak: Next.js Health Check Guide](https://nurbak.com/en/blog/how-to-add-health-checks-nextjs-app/), [Hyperping: Next.js Health Check Endpoint](https://hyperping.com/blog/nextjs-health-check-endpoint)에서 모두 권장.
- **단점**: 라우트 추가/테스트 부담.
- **우리 판단**: 현재는 루트 페이지가 가볍기 때문에 `/`로 충분하다. 단, 유저가 늘고 홈이 DB 쿼리를 하는 단계가 오면 `/api/health`로 분리한다. (블로그 소재로 쓸 때도 이 진화 과정을 보여주면 좋다.)

### 4.7 대안 F: `next-docker-compose` 공식 예제처럼 nginx 프록시 두기

nginx 앞단에서 `/healthz`를 처리하고 nginx가 내부에서 Next에 프록시. 너무 무거움. 단일 컨테이너 범위를 넘는 경우에만 고려.

---

## 5. 보안 고려사항: `0.0.0.0` 바인딩은 안전한가?

### 5.1 컨테이너 내부 한정이면 문제 없음

- Docker 컨테이너는 기본적으로 별도 network namespace를 갖는다. 컨테이너의 `0.0.0.0`은 **컨테이너 내부의 모든 인터페이스**일 뿐, 호스트의 공인 IP가 아니다.
- 외부 노출 여부는 `docker-compose.yml`의 `ports:` 매핑에 의해 결정된다. 우리 CD 설정은 EC2 단일 인스턴스에서 호스트 포트 3000을 매핑한 뒤 앞단의 **호스트 nginx → Cloudflare** 경로로 트래픽을 받는다. 즉 `HOSTNAME=0.0.0.0`은 컨테이너 내부 바인딩일 뿐이고, 실제 외부 접근은 nginx/Cloudflare 계층에서 통제된다. (후속 개선: 호스트 측에도 `127.0.0.1:3000:3000` 바인딩을 적용해 EC2 공인 IP 직접 접근을 차단하는 것이 더 안전하다.)
- 참고: [Next.js 공식 deploying 문서](https://nextjs.org/docs/app/getting-started/deploying)에서도 "binding to `0.0.0.0`"가 컨테이너 표준이라고 명시.

### 5.2 보안 강화가 필요한 경우

- 로컬 개발 머신에서 직접 `PORT=3000 HOSTNAME=0.0.0.0 node server.js`를 실행하면 같은 LAN의 다른 기기가 접근 가능. 그런 상황에서는 `HOSTNAME=127.0.0.1`이 올바르다.
- 실무 기준: **컨테이너 안에서만 `0.0.0.0`을 쓰고, 호스트에 바로 올릴 때는 `127.0.0.1`을 쓰고 앞에 reverse proxy를 둔다.**
- 우리 프로젝트는 AWS EC2 + Docker Compose + 호스트 nginx + Cloudflare 구조이므로 컨테이너 내부 `0.0.0.0` 바인딩이 적절. (호스트 포트 노출 여부는 `docker-compose.yml` 포트 매핑으로 추가 통제 가능.)

---

## 6. 실무에서 권장되는 Next.js Docker HEALTHCHECK 패턴 (2026 기준)

### 6.1 최소 구성 (우리 케이스 — 가장 흔함)

```dockerfile
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
```

**근거**: Vercel 공식 with-docker 예제 + [OneUptime 2026-01 가이드](https://oneuptime.com/blog/post/2026-01-24-nextjs-docker-configuration/view) 공통 패턴.

### 6.2 권장 구성 (프로덕션)

```dockerfile
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# /api/health 라우트 구현 전제
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**차이점**: 전용 health 라우트, 긴 `start-period` (Next.js 초기 컴파일 대비), 명시적 `no-cache` 응답 헤더.

### 6.3 distroless / 최소 이미지 구성

```dockerfile
# node:*-distroless 등 wget/curl 없는 이미지
HEALTHCHECK CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
```

**근거**: [Matt Knight 블로그](https://www.mattknight.io/blog/docker-healthchecks-in-distroless-node-js).

### 6.4 도구별 장단점 비교

| 도구 | 장점 | 단점 | 추천 상황 |
|------|------|------|-----------|
| BusyBox `wget` | Alpine 기본 포함, 가벼움 | IPv6 미지원, HTTPS 제한 | `HOSTNAME=0.0.0.0` 설정된 Alpine 기본 |
| BusyBox `nc -z` | 초경량, 포트만 체크 | HTTP 레벨 검증 불가 | 포트 열림만 확인하면 충분한 경우 (비추천) |
| `curl` (`apk add curl`) | 완전한 HTTP 지원, IPv6 OK | 이미지 크기 증가 | 여러 헬스체크가 필요하거나 TLS 체크 시 |
| `node -e "..."` | 추가 패키지 없음 | 가독성 나쁨 | distroless 이미지 |
| nginx `/healthz` | 앱 레이어 독립 | 컨테이너 구조 복잡화 | 멀티 컨테이너 프록시 아키텍처 |

---

## 7. 우리 해결책 검증 요약

### 표준 접근인가? — **Y**

**근거**:
1. Vercel 공식 [examples/with-docker/Dockerfile](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)이 `ENV HOSTNAME="0.0.0.0"`을 명시.
2. Next.js 공식 [Self-Hosting 가이드](https://nextjs.org/docs/app/guides/self-hosting)에서 `HOSTNAME=0.0.0.0 node server.js` 패턴을 직접 안내.
3. Issue [#44043](https://github.com/vercel/next.js/issues/44043)에서 `HOSTNAME` env 지원은 이 목적을 위해 추가된 기능.
4. Vercel 공식 `with-docker` 예제의 HEALTHCHECK 또한 `wget --spider http://127.0.0.1:3000` 형태.

### 더 나은 대안이 있는가? — **부분적으로 Y**

- **루트 경로 → `/api/health` 전용 라우트로 이동**: 홈이 무거워질 때를 대비. 지금은 불필요.
- **curl 설치**: `HOSTNAME=0.0.0.0`이 이미 있으면 이익 없음. 설치 코스트 > 이익.
- 즉, **현재 규모에서는 우리 선택이 최선**. 다음 이정표(DB 체크 필요 시)에 `/api/health`로 진화.

### 블로그 소재로 쓸 가치가 있는가? — **Y (상/중 난이도)**

- **흔하지만 잘 정리된 글이 드문 이슈**. GitHub Discussions/Issues에 조각 정보만 흩어져 있고, 많은 블로그가 "HOSTNAME=0.0.0.0 써라"만 말하고 **"왜"**를 설명하지 않는다.
- Node 17 localhost IPv6 변경 + Next.js standalone 하드코딩 + Alpine BusyBox IPv6 미지원 — **세 레이어의 우연한 교집합**이라는 점이 스토리텔링으로 매력적.
- 국내 한글 자료가 특히 부족. 실제 CD 파이프라인 3연속 실패 사례(PR #17/#18/#19)라는 리얼 드라마가 붙는다.
- **추천 제목 예**: "Docker healthcheck가 unhealthy로만 뜨는 이유 — Next.js, Node 17, Alpine의 삼중 교착"

---

## 8. 참고 출처

### 1차 출처 (공식 문서 / 핵심 이슈)

- [Next.js Issue #44043 — Server should allow hostname configuration with standalone mode](https://github.com/vercel/next.js/issues/44043)
- [Next.js Discussion #44626 — Same, converted to discussion](https://github.com/vercel/next.js/discussions/44626)
- [Next.js Discussion #54025 — 13.4.15 listening host issue in docker](https://github.com/vercel/next.js/discussions/54025)
- [Next.js Issue #46090 — next dev listens on IPv6 but next start does not](https://github.com/vercel/next.js/issues/46090)
- [Next.js Issue #58657 — AWS ECS HOSTNAME env overridden](https://github.com/vercel/next.js/issues/58657)
- [Next.js PR #77612 — Allow users to specify a bind address for self-hosted Next.js applications](https://github.com/vercel/next.js/pull/77612)
- [Next.js Discussion #13180 — Docker Healthcheck (가장 오래된 논의)](https://github.com/vercel/next.js/discussions/13180)
- [Next.js Discussion #18055 — generic health check build in NextJS](https://github.com/vercel/next.js/discussions/18055)
- [Next.js Official: next.config.js output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js Official: Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting)
- [Vercel examples/with-docker/Dockerfile (canary)](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)
- [Vercel examples/with-docker-compose/next-app/prod.Dockerfile (canary)](https://github.com/vercel/next.js/blob/canary/examples/with-docker-compose/next-app/prod.Dockerfile)

### Node.js IPv6 변경

- [Node Issue #40537 — "localhost" favours IPv6 in node v17, used to favour IPv4](https://github.com/nodejs/node/issues/40537)
- [Node Issue #48712 — Why the breaking change to default to ipv6](https://github.com/nodejs/node/issues/48712)
- [Node Issue #9390 — Why listening "::" also gets "0.0.0.0"](https://github.com/nodejs/node/issues/9390)
- [Node Issue #17664 — ipv6only listen option](https://github.com/nodejs/node/issues/17664)
- [Node DNS 공식 문서](https://nodejs.org/api/dns.html)
- [HTTP Toolkit — Fixing DNS in Node.js](https://httptoolkit.com/blog/configuring-nodejs-dns/)
- [Matteo Collina — --dns-result-order=ipv4first](https://twitter.com/matteocollina/status/1640384245834055680)

### Alpine BusyBox IPv6 미지원

- [Alpine aports #10937 — wget in alpine/busybox does not support IPv6](https://gitlab.alpinelinux.org/alpine/aports/-/issues/10937)
- [Alpine aports #16286 — busybox netstat no IPv6 support](https://gitlab.alpinelinux.org/alpine/aports/-/issues/16286)
- [Alpine aports #15861 — busybox wget HTTPS 실패](https://gitlab.alpinelinux.org/alpine/aports/-/issues/15861)
- [APNIC Blog — Running Docker / Alpine in IPv6-only environment (2022)](https://blog.apnic.net/2022/05/23/running-docker-alpine-linux-in-an-ipv6-only-environment/)

### 2차 자료 (보조 근거)

- [Matt Knight — Docker healthchecks in distroless Node.js](https://www.mattknight.io/blog/docker-healthchecks-in-distroless-node-js)
- [OneUptime 2026-01 — How to Configure Next.js with Docker](https://oneuptime.com/blog/post/2026-01-24-nextjs-docker-configuration/view)
- [OneUptime 2026-01 — Docker Health Check Best Practices](https://oneuptime.com/blog/post/2026-01-30-docker-health-check-best-practices/view)
- [Nurbak 2026 — Next.js /api/health 가이드](https://nurbak.com/en/blog/how-to-add-health-checks-nextjs-app/)
- [Hyperping — Next.js Health Check Endpoint](https://hyperping.com/blog/nextjs-health-check-endpoint)
- [Paul's Blog — Healthcheck in Docker Compose](https://www.paulsblog.dev/how-to-successfully-implement-a-healthcheck-in-docker-compose/)
- [BigMike — Modern Next.js deployment](https://bigmike.help/en/case/modern-next-js-deployment-github-actions-docker-and-zero-downtime/)
- [AnthonyMineo — Docker Healthcheck for Node.js](https://anthonymineo.com/docker-healthcheck-for-your-node-js-app/)

---

## 9. 이 프로젝트(마음의 고향) 적용 의미

- **CD 파이프라인의 신뢰성이 확보되었다.** `docker compose up --wait` 기반 자동 배포가 PR #19로 비로소 안정화. 이제 프론트엔드 변경이 SSM → EC2 → Docker 경로로 무중단 롤링 가능.
- **다음 단계**: 유저가 늘어 홈이 무거워지면 `/api/health`로 분리 (현재는 `/` 체크로 충분).
- **학습 포인트**: "표면 증상(unhealthy)"과 "근본 원인(IPv6 바인딩)" 사이의 거리를 좁히는 연습. 다음에 Alpine 기반 컨테이너에서 로컬 통신 이슈가 보이면 **가장 먼저 확인할 체크리스트**:
  1. `docker exec ... ss -tlnp` 로 LISTEN 주소가 IPv4인지 IPv6인지 본다.
  2. `HOSTNAME`/`HOST` 환경변수를 확인한다.
  3. Node 버전이 17+인지 확인한다.
