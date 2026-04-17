# 35. AWS EC2 첫 배포 전체 기록 -- Docker Compose + nginx + Cloudflare로 서비스 올리기

> 작성 시점: 2026-04-17
> 맥락: 마음의 고향 프로젝트를 실제 서버에 처음 배포하면서 겪은 전 과정 기록.
> Spring Boot + Next.js + Cassandra + Kafka + PostgreSQL + Redis를 단일 EC2에 올렸다.

---

## 배경

로컬에서 docker-compose로 잘 돌아가던 서비스를 실제 서버에 올려야 했다.
"일단 동작하는 상태"를 빠르게 만드는 게 목표였기 때문에, CI/CD 파이프라인이나 쿠버네티스 같은 것은 의도적으로 배제하고 **수동 배포 + 단일 EC2** 구성으로 갔다.

이 문서는 그 과정에서 부딪힌 모든 문제와 해결법을 시간순으로 기록한다.

---

## 1단계: 코드 준비 -- CORS 외부화

### 문제

`SecurityConfig`와 `WebSocketConfig`에 `localhost:3000`이 하드코딩되어 있었다.
로컬에서는 문제 없지만, 프로덕션에서는 도메인이 다르므로 CORS가 막힌다.

### 해결

```java
// Before: 하드코딩
.allowedOrigins("http://localhost:3000")

// After: 프로퍼티 주입
@Value("${app.cors.allowed-origins}")
private List<String> allowedOrigins;
```

각 프로필별 `application-xxx.yml`에 값을 분리했다:
```yaml
# application-local.yml
app:
  cors:
    allowed-origins: http://localhost:3000

# application-prod.yml
app:
  cors:
    allowed-origins: https://ghworld.co,https://www.ghworld.co
```

`docker-compose.yml`에서는 환경변수로 전달:
```yaml
environment:
  APP_CORS_ALLOWED_ORIGINS: ${APP_CORS_ALLOWED_ORIGINS}
```

### 교훈

환경마다 달라지는 값은 처음부터 프로퍼티로 빼는 게 맞다. "나중에 배포할 때 바꾸지 뭐"라고 생각하면 배포할 때 여기저기 하드코딩을 찾아다니게 된다.

---

## 2단계: Docker Compose 메모리 튜닝

### 문제

t3.medium은 4GB 메모리다. Cassandra, Kafka, PostgreSQL, Redis, Spring Boot, Next.js를 전부 올려야 하는데, 기본 설정대로 올리면 Cassandra만으로 4GB를 다 먹는다.

### 해결: 각 서비스별 힙 제한

| 서비스 | 기본값 | 튜닝 후 | 비고 |
|--------|--------|---------|------|
| Cassandra | 시스템 RAM의 1/4~1/2 (1~2GB) | MAX_HEAP=1G, NEW=200M | 가장 메모리 먹는 놈 |
| Kafka | 1GB | Xmx=512m, Xms=256m | 브로커 1대이므로 충분 |
| Spring Boot | 기본 ~256~512m | Xmx=384m, Xms=256m | 앱 규모에 맞춤 |
| PostgreSQL | ~128m (기본) | 기본 유지 | 튜닝 불필요 |
| Redis | ~50m | 기본 유지 | 메모리 거의 안 먹음 |
| Next.js | ~150m | 기본 유지 | SSR 부하에 따라 다름 |

**튜닝 후 예상 총 사용량: ~1.7GB**, 여유 2GB 정도 확보.

`docker-compose.yml`에서 환경변수 기본값 패턴을 사용했다:
```yaml
CASSANDRA_MAX_HEAP: ${CASSANDRA_MAX_HEAP:-1G}
KAFKA_HEAP_OPTS: ${KAFKA_HEAP_OPTS:--Xmx512m -Xms256m}
JAVA_TOOL_OPTIONS: ${JAVA_TOOL_OPTIONS:--Xmx384m -Xms256m}
```

`${VAR:-default}` 문법으로 `.env`에 값이 없으면 기본값을 사용하게 했다. 로컬에서는 `.env` 없이도 돌아가고, 프로덕션에서는 `.env`로 오버라이드 가능.

### 스케일 업이 필요한 시점

- Cassandra가 OOM으로 죽기 시작하면 → t3.large(8GB)로 올리거나 Cassandra를 별도 인스턴스로 분리
- Kafka 파티션이 늘어나면 → Kafka도 별도 분리 대상
- 현재 구성은 **동시 접속 수십 명** 수준에서 적합. 수백 명 이상이면 서비스 분리가 필요하다.

---

## 3단계: EC2 인스턴스 생성

### 리전 선택 -- 실수에서 배운 것

처음 us-east-1(버지니아)에 만들었다. AWS 콘솔 기본 리전이 버지니아이기 때문.
한국에서 접속하니 **응답 지연이 2~3초**. 물리적 거리가 곧 레이턴시다.

ap-northeast-2(서울)로 재생성하니 **~10ms**로 개선.

> 리전은 "사용자가 어디에 있는가"로 결정한다. 한국 사용자 대상이면 서울 리전이 답.

### 인스턴스 사양

| 항목 | 선택 | 이유 |
|------|------|------|
| AMI | Ubuntu 24.04 LTS | Docker 공식 지원, 커뮤니티 자료 풍부 |
| 인스턴스 | t3.medium (2vCPU, 4GB) | 메모리 튜닝으로 충분, 부족하면 나중에 올리기 |
| 스토리지 | 20GB gp3 | Docker 이미지 + 로그 고려. gp3가 gp2보다 싸고 빠름 |
| 키 페어 | ED25519 | RSA보다 키가 짧고 보안 수준은 동등 이상 |

### 보안 그룹

| 포트 | 용도 | 소스 |
|------|------|------|
| 22 (SSH) | 서버 관리 | **내 IP만** |
| 80 (HTTP) | 웹 서비스 | 0.0.0.0/0 |
| 443 (HTTPS) | 웹 서비스 | 0.0.0.0/0 |
| 3000 | 프론트엔드 (디버깅용) | 0.0.0.0/0 |
| 8080 | 백엔드 API (디버깅용) | 0.0.0.0/0 |

> 3000, 8080은 nginx 리버스 프록시가 정상 동작하는 걸 확인한 후 닫아도 된다. 운영 안정화 후에는 80, 443만 열어두는 게 맞다.

### 비용

- t3.medium 온디맨드: **~$30/월** (서울 리전 기준 $0.0416/시간)
- EBS 20GB gp3: ~$1.6/월
- 네트워크 전송: 소규모라면 ~$1~3/월
- **총 예상: $33~35/월**
- AWS Budgets에서 월 $40 알림 설정해두면 안심.

**안 쓸 때 중지(Stop)하면 EBS 비용($2/월)만 발생한다.** 종료(Terminate)는 인스턴스 자체가 삭제되므로 주의.

---

## 4단계: SSH 설정

`~/.ssh/config`에 alias를 등록하면 접속이 편해진다:

```
Host gohyang
    HostName <EC2-PUBLIC-IP>
    User ubuntu
    IdentityFile ~/.ssh/gohyang-key.pem
```

이후 `ssh gohyang` 한 줄로 접속 가능.

### 리전 변경 시 주의

리전을 바꾸면 IP가 바뀐다. 이전 IP의 호스트 키가 `~/.ssh/known_hosts`에 남아 있으면 SSH가 "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED"를 뱉는다.

```bash
ssh-keygen -R <old-ip>
```

---

## 5단계: Docker 설치

```bash
# Docker 공식 설치 스크립트 (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sudo sh

# sudo 없이 docker 사용하려면
sudo usermod -aG docker $USER
# 그 후 SSH 재접속 (그룹 변경은 현재 세션에 반영 안 됨)
```

---

## 6단계: 배포 과정에서 만난 에러 5개

이게 이 문서의 핵심이다. 실제로 배포하면 "로컬에서는 됐는데 서버에서는 안 되는" 문제를 줄줄이 만난다.

### 에러 1: DataSource url not specified

```
Failed to configure a DataSource: 'url' attribute is not specified
```

**원인:** `application-prod.yml`이 `.gitignore`에 있어서 `git clone` 시 안 받아졌다. Spring Boot가 DB 접속 정보를 못 찾은 것.

**해결:** EC2에서 `src/main/resources/application-prod.yml`을 수동 생성.

**교훈:** gitignore된 설정 파일은 배포 시 별도로 관리해야 한다. 방법은 크게 세 가지:
1. 서버에서 수동 생성 (현재 방식, 가장 단순)
2. 환경변수로 모든 설정 주입 (12-Factor App 권장)
3. AWS Secrets Manager / Parameter Store 사용 (프로덕션 권장)

### 에러 2: .env 환경변수 미반영

Spring Boot가 올라왔는데 DB 연결이 안 됨. 원인은 `.env`에 인프라 호스트 변수가 누락되어 있었다.

**핵심 개념:** docker-compose 내부에서 컨테이너끼리 통신할 때는 **서비스 이름이 호스트명**이 된다.

```env
# .env
DB_HOST=postgres        # localhost가 아님!
REDIS_HOST=redis
CASSANDRA_HOST=cassandra
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
```

docker-compose 네트워크 안에서는 `localhost`가 아니라 서비스 이름으로 접근한다. 로컬 개발 시 `localhost`로 되어 있던 것이 서버에서는 안 되는 대표적 원인.

### 에러 3: Invalid keyspace gohyang (Cassandra)

```
InvalidQueryException: Keyspace 'gohyang' does not exist
```

**원인:** Cassandra는 PostgreSQL과 달리 **keyspace를 자동으로 만들지 않는다.** `spring.cassandra.schema-action: create_if_not_exists`는 **테이블**만 자동 생성하지, keyspace는 대상이 아니다.

**해결:**
```bash
docker compose exec cassandra cqlsh -e \
  "CREATE KEYSPACE IF NOT EXISTS gohyang \
   WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"
```

**교훈:** Cassandra keyspace 생성은 앱 기동 전에 수동으로 해야 한다. 운영에서는 init 스크립트나 entrypoint에 넣어 자동화하는 게 좋다.

> 참고: `SimpleStrategy`와 `replication_factor: 1`은 단일 노드 개발용 설정이다. 프로덕션 다중 노드에서는 `NetworkTopologyStrategy`를 써야 한다.

### 에러 4: .env 변경 후 미반영

`.env` 파일을 수정하고 `docker compose restart app`을 했는데 변경된 값이 안 먹혔다.

**원인:** `restart`는 **기존 컨테이너를 그대로 재시작**한다. 환경변수는 컨테이너 **생성(create) 시점**에 결정되므로, restart로는 새 값이 반영되지 않는다.

```bash
# 이렇게 하면 안 됨 (환경변수 안 바뀜)
docker compose restart app

# 이렇게 해야 함 (컨테이너 재생성)
docker compose up -d --force-recreate app
```

| 명령어 | 동작 | 환경변수 반영 |
|--------|------|-------------|
| `restart` | 기존 컨테이너 stop → start | X |
| `up -d` | 설정 변경 감지 시 재생성 | .env 변경은 감지 못 할 수 있음 |
| `up -d --force-recreate` | 무조건 컨테이너 재생성 | O |

**교훈:** Docker 컨테이너의 환경변수는 불변(immutable)이다. 바꾸려면 컨테이너를 새로 만들어야 한다. 볼륨이 마운트되어 있으면 데이터는 유지된다.

### 에러 5: nginx.conf 충돌

nginx 패키지를 설치하기 전에 `/etc/nginx/nginx.conf`를 먼저 만들어뒀더니, `dpkg`가 "기존 파일을 덮어쓸까요?"라고 물어봤다. SSH 세션에서 stdin이 없어서 설치가 멈춤.

**해결:**
```bash
sudo DEBIAN_FRONTEND=noninteractive dpkg --configure -a --force-confold
```

- `DEBIAN_FRONTEND=noninteractive`: 대화형 프롬프트 비활성화
- `--force-confold`: 기존 설정 파일 유지 (패키지의 새 파일로 안 바꿈)

**교훈:** 설정 파일은 패키지 설치 후에 작성한다. 또는 자동화 스크립트에서는 항상 `DEBIAN_FRONTEND=noninteractive`를 붙인다.

---

## 7단계: nginx 리버스 프록시

### 왜 nginx가 필요한가

사용자가 `ghworld.co:8080/api/...`로 접속하게 할 수는 없다. 포트 번호 없이 접속하려면 80번 포트로 들어오는 요청을 내부 서비스로 분배하는 리버스 프록시가 필요하다.

### 설정 구조

```
Client → :80 (nginx)
           ├─ /api/*     → 127.0.0.1:8080  (Spring Boot)
           ├─ /ws        → 127.0.0.1:8080  (WebSocket)
           └─ /*         → 127.0.0.1:3000  (Next.js)
```

### WebSocket 프록시 설정의 핵심

WebSocket은 일반 HTTP와 다르게 **프로토콜 업그레이드**가 필요하다:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # 필수
    proxy_set_header Connection "upgrade";        # 필수
    proxy_read_timeout 86400;                     # 24시간 (기본 60초면 끊김)
}
```

- `Upgrade`와 `Connection` 헤더가 없으면 WebSocket 핸드셰이크가 실패한다
- `proxy_read_timeout`을 길게 잡아야 WebSocket 연결이 유지된다. 기본 60초면 1분마다 끊김.

### nginx를 Docker가 아닌 호스트에 설치한 이유

Docker 컨테이너로 nginx를 올릴 수도 있었지만, 호스트에 직접 설치했다.

- **장점:** docker-compose.yml 수정 불필요, 설정 변경이 간단(`nginx -t && systemctl restart nginx`)
- **단점:** 인프라 구성이 docker-compose에 완전히 담기지 않음 (서버 셋업 문서 필요)
- 단일 서버에서는 호스트 설치가 더 간단하다. 멀티 서버나 컨테이너 오케스트레이션을 쓸 때는 Docker nginx가 맞다.

---

## 8단계: 도메인 + SSL (Cloudflare)

### 도메인 연결

Cloudflare에서 `ghworld.co` 도메인을 구매하고, DNS A 레코드를 설정했다:

| 타입 | 이름 | 값 | 프록시 |
|------|------|-----|--------|
| A | @ | EC2 IP | Proxied |
| A | www | EC2 IP | Proxied |

**Proxied 모드**란 트래픽이 Cloudflare를 거쳐서 서버로 가는 것. 이걸 켜면:
- Cloudflare가 DDoS 방어, CDN 캐싱을 해준다
- 서버의 실제 IP가 숨겨진다
- 단, Cloudflare ↔ 서버 구간의 통신 방식은 SSL 모드에 따라 다르다

### SSL 모드 선택: Flexible vs Full (Strict)

| | Flexible | Full | Full (Strict) |
|--|----------|------|---------------|
| 브라우저 ↔ Cloudflare | HTTPS | HTTPS | HTTPS |
| Cloudflare ↔ 서버 | **HTTP (평문)** | HTTPS (인증서 검증 안 함) | HTTPS (인증서 검증) |
| 서버 인증서 필요 | X | 자체서명 가능 | Let's Encrypt 등 필요 |
| 보안 수준 | 낮음 | 중간 | 높음 |
| 설정 난이도 | 매우 쉬움 | 쉬움 | 보통 |

**현재 선택: Flexible**

이유: 빠르게 동작 확인이 목표였고, 서버에 인증서를 설치하는 과정을 생략하고 싶었다.

**그러나 Flexible은 보안상 권장되지 않는다.** Cloudflare와 서버 사이 트래픽이 평문이기 때문에, 같은 네트워크에서 패킷을 가로채면 내용이 보인다. Cloudflare 공식 문서에서도 Flexible 사용을 권장하지 않는다.

**나중에 반드시 Full (Strict)로 전환해야 한다:**
1. Let's Encrypt + Certbot으로 서버에 인증서 설치
2. nginx에 SSL 설정 추가
3. Cloudflare SSL 모드를 Full (Strict)로 변경

### 프론트엔드 URL 설정

Next.js의 `NEXT_PUBLIC_*` 환경변수는 **빌드 타임에 번들에 인라인**된다. 런타임에 바꿀 수 없다.

```env
NEXT_PUBLIC_API_URL=https://ghworld.co
NEXT_PUBLIC_WS_URL=https://ghworld.co/ws
```

URL을 바꾸면 **프론트엔드를 다시 빌드해야** 한다:
```bash
docker compose up -d --build frontend
```

---

## 9단계: 트레이드오프 총정리

| 선택 | 대안 | 왜 이걸 골랐나 | 언제 바꿔야 하나 |
|------|------|---------------|----------------|
| t3.medium (4GB) | t3.large (8GB) | JVM 튜닝으로 충분, 월 $15 절약 | Cassandra OOM 발생 시 |
| 서울 리전 | 버지니아 | 한국 사용자 대상, 200ms → 10ms | 글로벌 서비스로 확장 시 |
| nginx 호스트 설치 | Docker nginx | docker-compose 수정 불필요, 간편 | 멀티 서버 or K8s 전환 시 |
| Cloudflare Flexible SSL | Let's Encrypt Full (Strict) | 빠른 동작 확인, 인증서 관리 불필요 | **가능한 빨리 전환** (보안 취약) |
| 수동 배포 (git pull + build) | CI/CD (GitHub Actions) | 동작 확인 우선 | 배포 빈도가 주 3회 이상 시 |
| 단일 EC2 | ECS/EKS/서비스 분리 | 비용 최소화, 단순성 | 동시접속 100+ 시 |

---

## 10단계: 운영 명령어 모음

```bash
# === 접속 ===
ssh gohyang

# === 전체 기동/중지 ===
cd ~/ChatAppProject && docker compose up -d
docker compose down

# === .env 변경 후 반영 (restart 아님!) ===
docker compose up -d --force-recreate app

# === 로그 ===
docker compose logs app --tail 50       # 최근 50줄
docker compose logs app -f              # 실시간 스트리밍
docker compose logs --tail 20           # 모든 서비스

# === 상태 확인 ===
docker ps --format 'table {{.Names}}\t{{.Status}}'

# === Cassandra keyspace 생성 (최초 1회) ===
docker compose exec cassandra cqlsh -e \
  "CREATE KEYSPACE IF NOT EXISTS gohyang \
   WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"

# === nginx ===
sudo nginx -t && sudo systemctl restart nginx

# === 코드 업데이트 배포 ===
git pull && docker compose up -d --build app frontend

# === 메모리 확인 ===
free -h
docker stats --no-stream
```

---

## 실전에서 주의할 점

1. **Elastic IP를 할당하지 않으면 EC2를 중지/시작할 때마다 IP가 바뀐다.** 도메인 연결 후에는 Elastic IP를 달거나, Cloudflare DNS를 매번 수정해야 한다. Elastic IP는 EC2에 붙어있으면 무료, 떼어놓으면 유료.

2. **t3 인스턴스는 "버스트 가능(burstable)" 인스턴스다.** CPU 크레딧이 소진되면 기본 성능(baseline)으로 제한된다. t3.medium의 baseline은 20%. 지속적으로 CPU를 많이 쓰는 워크로드에는 적합하지 않다.

3. **`docker compose logs`가 디스크를 채울 수 있다.** 로그 로테이션을 설정하지 않으면 20GB 디스크가 로그로 가득 찰 수 있다. `docker-compose.yml`에서 로깅 드라이버를 설정하거나, Docker 데몬 설정에서 max-size를 제한한다:
   ```json
   // /etc/docker/daemon.json
   { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
   ```

4. **보안 그룹에서 SSH(22번)를 0.0.0.0/0으로 열지 마라.** 봇들이 수 초 만에 무차별 대입 공격을 시작한다. 반드시 내 IP만 허용.

---

## 나중에 돌아보면

- **Flexible SSL을 쓰고 있다는 건 기술 부채다.** 실 사용자가 로그인 기능을 쓰기 전에 Full (Strict)로 전환해야 한다.
- **수동 배포가 귀찮아지는 시점이 곧 CI/CD를 도입할 시점이다.** "git pull하고 build하는 걸 매번 SSH 접속해서 하고 있다"고 느끼면 GitHub Actions를 붙인다.
- **단일 EC2에 모든 서비스를 올리는 건 프로토타입 수준이다.** 트래픽이 늘면 DB(PostgreSQL, Cassandra)를 RDS/Managed Service로 분리하는 게 첫 번째 스텝이 된다.
- **EBS 20GB는 Docker 이미지 몇 번 빌드하면 찬다.** `docker system prune`을 주기적으로 실행하거나, EBS를 30GB로 늘려야 할 수 있다.

---

## 더 공부할 거리

### 바로 다음에 해야 할 것
- **Let's Encrypt + Certbot으로 SSL 전환**: [Certbot 공식 가이드](https://certbot.eff.org/)
- **Docker 로그 로테이션 설정**: [Docker 공식 문서 - Configure logging drivers](https://docs.docker.com/config/containers/logging/configure/)
- **Elastic IP 할당**: [AWS Elastic IP 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)

### CI/CD 자동화
- **GitHub Actions + SSH 배포**: `appleboy/ssh-action`으로 EC2에 SSH 접속해서 배포 자동화
- **GitHub Actions + Docker Hub**: 이미지를 Docker Hub에 푸시하고 EC2에서 pull
- **AWS CodeDeploy**: AWS 네이티브 배포 도구, EC2와 궁합 좋음

### 스케일링
- **Docker Swarm**: 단일 서버에서 멀티 서버로 가는 가장 낮은 진입 장벽
- **AWS ECS Fargate**: 서버 관리 없이 컨테이너 실행, 비용은 높지만 운영 부담 최소
- **Managed DB 전환**: RDS (PostgreSQL), Amazon Keyspaces (Cassandra), ElastiCache (Redis)

### Cloudflare SSL 심화
- [Cloudflare SSL 모드 공식 문서](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Flexible SSL을 쓰면 안 되는 이유](https://community.cloudflare.com/t/why-flexible-ssl-mode-is-not-the-best-choice/63531)
- [Let's Encrypt vs Cloudflare 비교](https://nickjanetakis.com/blog/lets-encrypt-vs-cloudflare-for-https)

### Docker Compose 환경변수 심화
- [Docker 공식 - Set environment variables](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/)
- [docker compose restart는 환경변수를 반영하지 않는다 (GitHub Issue)](https://github.com/docker/compose/issues/4140)
