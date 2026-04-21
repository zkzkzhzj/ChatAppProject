# 39. Next.js Docker Healthcheck가 계속 unhealthy인 이유 — Node 17 + Alpine + standalone 삼중 교착

> [37. CD 파이프라인 구축기](./37-cd-pipeline-design.md) · [38. 12-factor Config 이관](./38-env-var-config-migration.md)의 연장선.
> CD 파이프라인이 PR #17, #18, #19까지 3연속으로 healthcheck 타임아웃 났다. 표면만 보면 "Docker가 죽었나?"지만 진짜 범인은 Next.js · Node 17 · Alpine BusyBox 세 레이어의 **우연한 교집합**이었다.
>
> 관련 1차 리서치: [docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md](../knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md)

---

## 1. 무슨 일이 일어났나

CI는 통과, 이미지도 잘 올라감, EC2에 `docker compose pull`도 성공. 그런데 `docker compose up -d --wait`가 계속 끝까지 실패.

```text
Error response from daemon: container gohyang-frontend is unhealthy
```

브라우저로 ghworld.co를 열면 **멀쩡히 200 OK**가 뜬다. 유저 입장에선 서비스 정상. 그런데 Docker 관점에서는 죽은 컨테이너. CD가 "배포 실패"로 판정하고 롤백 플로우가 돌기 시작한다.

이 상황의 기분 나쁜 점은 두 가지다.

1. **애플리케이션은 정상이다.** 로그도 깨끗하다. 에러가 없다.
2. **로컬에선 잘 됐다.** WSL2 Docker에서 `docker compose up`으로 똑같이 띄우면 healthy. 그런데 EC2에서만 안 된다? 아니, 사실은 **로컬에서도 안 됐다** — 그냥 로컬에선 `--wait`를 안 쓰고 있었기 때문에 증상이 안 보였을 뿐.

---

## 2. 삽질 타임라인 — PR #17, #18, #19

처음엔 "wget 옵션 문제겠지" 싶어서 얕게 고쳤다. 그게 함정이었다.

### PR #17 — "프로젝트명이 바뀌어서 그런가?" (오진)

첫 의심: deploy/ 디렉토리 분리로 compose project name이 바뀌면서 기존 네트워크·볼륨과 꼬인 게 아닐까?

```yaml
# docker-compose.yml 상단
name: chatappproject
```

프로젝트명을 고정해서 연속성 확보. 동시에 frontend healthcheck를 `wget --spider`로 바꿔봤다. 결과: **여전히 unhealthy**.

`--spider`는 HEAD 요청처럼 동작하는 옵션이지만 BusyBox wget에서는 구현이 얇아서 연결 자체가 실패하면 똑같이 죽는다. 원인이 wget 옵션이 아니라는 힌트는 여기서 얻었어야 했는데, 그러지 못했다.

### PR #18 — "HTTP 말고 포트만 체크해보자" (회피)

다음 시도: "애플리케이션이 뜨긴 떴을 텐데 HTTP 레벨 체크가 뭔가 이상한가?" 싶어서 TCP 포트 체크로 전환.

```dockerfile
HEALTHCHECK CMD nc -z 127.0.0.1 3000 || exit 1
```

`nc -z`는 TCP SYN만 보내고 끊는다. 포트가 LISTEN 중이면 성공. 가장 가벼운 방식. 그런데 **여전히 실패**.

이때 뭔가 이상하다는 걸 느꼈어야 했다. HTTP 응답이 오지 않는 게 아니라 **TCP 커넥션 자체가 안 맺어지고 있다**. 하지만 브라우저로 접속하면 멀쩡히 된다. 그럼 포트는 열려있다는 소리인데?

### PR #19 — "급한 불부터 끄자" (항복)

부하 테스트 일정이 밀리고 있어서 일단 `HEALTHCHECK NONE`으로 꺼버렸다. CD는 돌기 시작했지만 찜찜한 빚이 남았다. "왜 안 됐는지 모른 채 덮어뒀다"는 게 가장 위험한 상태다.

```dockerfile
HEALTHCHECK NONE
```

이 상태로 며칠을 보내다가 — 이번에 제대로 원인을 판 게 이번 작업이다.

---

## 3. 진짜 원인 — 세 레이어의 교집합

원인을 찾으려면 **컨테이너 안에 들어가서 "실제로 서버가 어느 주소에 LISTEN 중인지"** 봐야 한다.

```bash
docker exec gohyang-frontend ss -tlnp
# State    Local Address:Port
# LISTEN   ::1:3000
```

`::1`은 IPv6 루프백이다. `127.0.0.1`이 아니다. 여기서부터 퍼즐이 풀린다.

### 레이어 1 — Next.js standalone의 기본 호스트명은 `localhost`

`output: "standalone"` 빌드는 `.next/standalone/server.js`를 만드는데, 이 서버는 `HOSTNAME` 환경변수가 없으면 하드코딩된 `'localhost'`를 쓴다.

```js
// .next/standalone/server.js 내부 (발췌)
const hostname = process.env.HOSTNAME || 'localhost'
server.listen(port, hostname, ...)
```

이건 [Next.js Issue #44043](https://github.com/vercel/next.js/issues/44043)에서 공식 언급. 해결책으로 `HOSTNAME` env가 공식 지원된 지도 오래됐다. 그런데 **기본값이 `localhost`인 것은 여전하다**.

### 레이어 2 — Node 17부터 `localhost`는 IPv6 우선

Node 17에서 DNS 결과 순서 기본값이 `ipv4first` → `verbatim`으로 바뀌었다. 그 결과 `localhost` 해석이 `127.0.0.1` → `::1` 우선으로 바뀌었다.

```text
Node 16 이하:  localhost → 127.0.0.1 (IPv4)
Node 17 이상:  localhost → ::1       (IPv6)
```

즉 Next.js standalone을 Node 17+(우리는 node:22-alpine)로 돌리면 `server.listen(3000, 'localhost')`가 **`::1:3000`에만 LISTEN**하는 결과로 이어진다. IPv4 루프백은 열리지 않는다.

> 주의: Node에서 `server.listen(port, '::')`(IPv6 all-interfaces)에 바인딩하면 기본적으로 dual-stack이라 IPv4도 같이 받는다. 하지만 `::1`은 **IPv6 루프백 전용**이라 IPv4 fallback이 일어나지 않는다. 이 세부사항이 함정이다.

### 레이어 3 — Alpine BusyBox wget/nc는 IPv6를 제대로 못 다룸

`node:22-alpine`에 내장된 wget, nc, netstat은 모두 BusyBox 구현체다. BusyBox의 네트워크 유틸은 DNS 해석에서 **여러 주소 리스트를 다루지 못하고 하나만 잡아서 쓴다**. 게다가 `127.0.0.1`을 명시해도 IPv6 소켓에 연결을 시도하지 못한다.

그래서 healthcheck가 이렇게 돈다.

```text
wget http://127.0.0.1:3000/
   └─ IPv4 SYN to 127.0.0.1:3000
        └─ 서버는 ::1:3000에만 LISTEN
            └─ LISTEN 소켓 없음 → Connection refused
```

정확히 연결이 되지 않는 이유다. 브라우저는 다르다. 브라우저 → ALB → EC2 → 컨테이너의 포트매핑 경로로 들어오면 `172.x.x.x` 같은 컨테이너 IP로 접근하는데, Next.js가 `::1`에만 바인딩돼 있으면 그것도 안 돼야 한다. 그런데 왜 브라우저는 됐을까?

→ **다시 확인해보니 브라우저 접속도 사실 잘 안 됐다**. CD가 unhealthy 판정으로 컨테이너를 재시작하는 동안 우리가 확인한 200 OK는 이전 세션의 이미지(healthcheck 없던 버전)였다. 혼동을 가중시킨 원인이 여기였다.

### 종합 인과 그림

```text
[Next.js standalone]          기본 hostname = 'localhost'
          │
          ▼
[Node 22]                     localhost → ::1 우선 해석
          │
          ▼
[http.Server.listen]          ::1:3000 단일 바인딩 (IPv4 없음)
          │
          ▼
[BusyBox wget 127.0.0.1:3000] IPv4 접근 → 매칭되는 LISTEN 소켓 없음
          │
          ▼
[Docker HEALTHCHECK]          Connection refused → unhealthy
```

세 레이어 중 **어느 하나라도 달랐으면 이 문제는 안 일어난다**. Node 16이었거나, Alpine이 아니었거나, Next.js standalone이 `0.0.0.0`을 기본값으로 삼았다면. 그래서 이 문제가 "흔한 삽질 후보"인 동시에 "스택이 조금만 달라도 안 터지는" 특성을 가진다.

---

## 4. 해결책 — 그리고 왜 굳이 이 선택인가

### 우리가 채택한 것

```yaml
# deploy/docker-compose.yml
frontend:
  environment:
    HOSTNAME: 0.0.0.0
```

```dockerfile
# frontend/Dockerfile
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
```

변경점은 이게 끝이다. 한 줄짜리 env 주입.

왜 동작하나:
- `HOSTNAME=0.0.0.0`을 standalone server.js가 읽는다.
- `server.listen(3000, '0.0.0.0')`로 **IPv4 전 인터페이스에 바인딩**.
- Linux에서 `0.0.0.0` 바인딩은 IPv4 전용이지만, healthcheck는 컨테이너 내부의 `127.0.0.1`만 닿으면 되므로 충분.
- BusyBox wget도 IPv4 접근이니 문제없이 닿는다.

### 다른 길들 — 장단점 비교

| 대안 | 핵심 | 장점 | 단점 | 우리 판단 |
|------|------|------|------|----------|
| **A. `HOSTNAME=0.0.0.0`** (채택) | env 한 줄 | Vercel 공식 예제 방식. 변경 최소 | 없음 (컨테이너 내부 한정) | 채택 |
| B. `/api/health` 라우트 분리 | 전용 헬스 엔드포인트 | DB·Redis 의존성 체크 가능. 홈 페이지 SSR 비용 회피 | 라우트/테스트 추가 부담 | 지금은 과함. 홈이 무거워지면 전환 |
| C. `apk add curl` 후 curl 사용 | IPv6 fallback 지원 | IPv4/IPv6 둘 다 됨. TLS 검증 가능 | 이미지 크기 +1MB. HOSTNAME 문제는 해결 안 함 | HOSTNAME 고치면 이익 없음 |
| D. `node -e "http.get(...)"` | Node로 자체 체크 | 추가 패키지 불필요. distroless 호환 | 가독성 나쁨. 타임아웃 명시 장황 | distroless 쓸 때 재검토 |
| E. `nginx` 프록시 앞단 `/healthz` | 앱과 독립된 헬스 | 앱 레이어 영향 없음 | 단일 컨테이너 구조가 복잡해짐 | 컨테이너 추가할 가치 없음 |
| F. `sed`로 server.js 패치 | 빌드 산출물 직접 수정 | 옛날에 쓰던 워크어라운드 | 유지보수성 최악. 공식 env가 지원된 지금 안티패턴 | 금지 |

**A가 Vercel 공식 [examples/with-docker/Dockerfile](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)의 기본값**이라는 점이 결정적이었다. "레포 오너가 기본값으로 쓰는 방식"이면 그게 가장 유지보수 친화적이다.

### 이 선택의 한계 — 언제 B로 옮겨야 하나

`/` 체크는 페이지 SSR을 한 번 돌린다. 홈이 DB 조회·세션 확인 등을 붙기 시작하면 healthcheck가 매번 그 비용을 지불한다. 10초에 한 번씩 N 컨테이너가 때린다고 생각하면 금방 의미 있는 부하.

**전환 트리거**:
- 홈 페이지가 DB·Redis 호출을 포함하게 되는 순간
- healthcheck 응답 시간이 평균 500ms를 넘어가는 순간
- 여러 의존성(DB, Kafka, S3) 상태를 헬스에 묶고 싶어지는 순간

그때 `/api/health` 전용 라우트로 분리하면 된다. [Nurbak 가이드](https://nurbak.com/en/blog/how-to-add-health-checks-nextjs-app/) 패턴 참고.

---

## 5. 보안 한 줄 정리 — `0.0.0.0`은 위험하지 않나?

처음 의심이 드는 부분. 결론부터: **컨테이너 내부에서는 안전하다.**

- Docker 컨테이너는 자체 network namespace를 가진다. 컨테이너의 `0.0.0.0`은 **컨테이너 내부의 모든 인터페이스**일 뿐, 호스트의 공인 IP가 아니다.
- 외부 노출은 `docker-compose.yml`의 `ports:` 매핑이 결정한다. 우리는 EC2에서 프론트 컨테이너를 ALB 뒤로 숨기고 있으므로 `HOSTNAME=0.0.0.0`이 외부 공격면을 늘리지 않는다.
- 단, **호스트에 직접 Node를 띄울 때는 `0.0.0.0`이 LAN 전체 노출을 의미**하므로 `127.0.0.1`이 올바르다. 컨테이너 안이냐 밖이냐가 판단 기준.

---

## 6. 이 사건에서 배운 디버깅 체크리스트

같은 함정은 **Alpine + Node 17+ + 자체 HTTP 서버(Next/Nest/Fastify/Express)** 조합 어디에서나 터질 수 있다. 다음에 비슷한 증상이 보이면 순서대로:

1. **실제로 어디에 LISTEN하고 있나?**
   ```bash
   docker exec <container> ss -tlnp
   # 없으면 netstat -tlnp, 그것도 없으면 apk add iproute2
   ```
   IPv4(`0.0.0.0:3000`, `127.0.0.1:3000`)인지 IPv6(`:::3000`, `::1:3000`)인지 확인.

2. **Healthcheck 상세 상태 보기**
   ```bash
   docker inspect --format '{{json .State.Health}}' <container> | jq
   ```
   `Status`, `FailingStreak`, 최근 `Log`의 출력을 보면 wget이 어떻게 실패하는지가 보인다.

3. **컨테이너 안에서 직접 때려보기**
   ```bash
   docker exec <container> wget -qO- http://127.0.0.1:3000/
   docker exec <container> wget -qO- http://[::1]:3000/
   docker exec <container> nc -z 127.0.0.1 3000
   ```
   IPv4와 IPv6 중 어느 쪽이 통하는지가 드러난다.

4. **DNS 해석 확인**
   ```bash
   docker exec <container> getent hosts localhost
   # 127.0.0.1 vs ::1 중 어느 쪽이 먼저 나오는지
   ```

5. **프레임워크의 기본 바인딩 주소 확인**
   - Next.js: `HOSTNAME` env
   - Express/Fastify: `app.listen(port)` 시 기본 `'::'` 또는 `'0.0.0.0'` — 프레임워크마다 다름
   - Spring Boot: `server.address` (기본값 없음 = 전 인터페이스)

6. **start-period 넉넉히**
   Next.js standalone은 콜드 스타트가 10~20초 걸린다. `--start-period`가 짧으면 멀쩡한 컨테이너도 죽었다 판단한다. 우리는 30s로 뒀다.

---

## 7. 이 프로젝트에 남긴 의미

- **CD 파이프라인이 드디어 안정화됐다.** `docker compose up --wait`가 믿을 수 있는 신호가 됐다. 이제 main 머지 → 자동 배포 → healthy 확인 → 부하 테스트 사이클이 끊기지 않는다.
- **`HEALTHCHECK NONE`이라는 기술 부채를 갚았다.** 모르는 채로 덮어둔 문제는 나중에 더 큰 얼굴로 돌아온다. 이 경우도 "부하 테스트 중 컨테이너가 진짜로 죽어도 감지 못 하는 상태"였다. 덮어둔 상태로 프로덕션을 돌리지 않아서 다행.
- **"모른 채로 넘어가지 않는다"는 원칙을 한 번 지켰다.** PR #19에서 `HEALTHCHECK NONE`으로 회피할 때 기록을 남겨둔 덕에 이번에 되돌아올 수 있었다. 문서화된 기술 부채는 갚을 수 있는 부채다.

---

## 8. 더 공부할 거리

### 공식 · 1차 출처
- [Next.js Issue #44043 — HOSTNAME 환경변수 도입 논의](https://github.com/vercel/next.js/issues/44043)
- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) — `HOSTNAME=0.0.0.0 node server.js`를 직접 명시
- [Vercel examples/with-docker/Dockerfile](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile) — 레퍼런스 구현

### Node DNS 순서 변경
- [Node Issue #40537 — Node 17에서 localhost가 IPv6 우선이 된 경위](https://github.com/nodejs/node/issues/40537)
- [Node Issue #48712 — 왜 IPv6 우선이 기본이 됐는가](https://github.com/nodejs/node/issues/48712)
- [HTTP Toolkit — Fixing DNS in Node.js](https://httptoolkit.com/blog/configuring-nodejs-dns/)

### Alpine / BusyBox의 한계
- [Alpine aports #10937 — BusyBox wget의 IPv6 미지원](https://gitlab.alpinelinux.org/alpine/aports/-/issues/10937)
- [Alpine aports #16286 — BusyBox netstat의 IPv6 누락](https://gitlab.alpinelinux.org/alpine/aports/-/issues/16286)

### Docker Healthcheck 심화
- [Matt Knight — Docker healthchecks in distroless Node.js](https://www.mattknight.io/blog/docker-healthchecks-in-distroless-node-js) — distroless 환경에서 `node -e` 패턴
- [Paul's Blog — Docker Compose healthcheck 설계](https://www.paulsblog.dev/how-to-successfully-implement-a-healthcheck-in-docker-compose/)
- [OneUptime 2026-01 — Docker Health Check Best Practices](https://oneuptime.com/blog/post/2026-01-30-docker-health-check-best-practices/view)

### 관련 연결 주제
- IPv4/IPv6 dual-stack 동작 원리 — `IPV6_V6ONLY` 소켓 옵션
- `::`와 `::1`의 차이 (all-interfaces vs loopback-only)
- Docker의 network namespace가 실제로 뭘 격리하는가
- Kubernetes에서는 `livenessProbe`/`readinessProbe`가 이 역할 — 컨셉은 같지만 실행 주체와 범위가 다르다
