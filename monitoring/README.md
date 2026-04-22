# Monitoring Stack (gohyang-monitor EC2)

운영 EC2(`gohyang-server-ko`)의 Prometheus 메트릭을 수집·시각화하는 모니터링 스택.

## 아키텍처

```text
┌─ gohyang-server-ko (운영 EC2, t3.medium) ─┐
│                                            │
│  Spring Boot                               │
│  /actuator/prometheus (port 8080)          │
│                                            │
└────────────────┬───────────────────────────┘
                 │ scrape every 15s (VPC 내부)
                 ▼
┌─ gohyang-monitor (모니터링 EC2, t3.small) ─┐
│                                            │
│  Prometheus (9090, localhost bind)         │
│  ↓ query                                   │
│  Grafana (3001, public IP 접근)             │
│                                            │
└────────────────┬───────────────────────────┘
                 │
                 ▼
             개발자 브라우저
             (SG로 내 집 IP만 허용)
```

## 전제 조건

### ① 운영 EC2의 Actuator endpoint 확장 필요

`deploy/docker-compose.yml` 기본값은 secure-by-default로 `ACTUATOR_ENDPOINTS=health`만 노출.
Prometheus scrape를 받으려면 운영 EC2의 `deploy/.env`에서 Actuator 확장 설정이 필요하다.

**설정 위치**: `deploy/.env.example` 의 "운영 보안 강화" 섹션에 주석 처리된 예시가 있음.
해당 줄의 `#`을 제거해 `deploy/.env`에 반영한다.

> 값의 single source of truth = `deploy/.env.example`. README는 "어디를 봐야 하는지"만 안내 (drift 방지).

### ② Scrape 대상 IP는 `.env`의 `APP_PRIVATE_IP`로 관리

Prometheus는 env 치환을 지원하지 않으므로 Docker compose의 `extra_hosts`로 우회한다.
`prometheus.yml`의 scrape target은 `gohyang-app:8080` **호스트명으로 고정**되어 있고,
실제 IP는 `monitoring/.env`의 `APP_PRIVATE_IP`에서만 관리된다.

IP 변경 시: `.env` 한 줄 수정 → `docker compose up -d`. `prometheus.yml`·소스 수정 불필요.

**선택적 안정화**: 운영 EC2에 ENI(Elastic Network Interface)를 고정 연결하면 Private IP가 stop/start 간에도 유지되어 `.env` 갱신 빈도 감소.

## 배포 (gohyang-monitor EC2에서)

### 1. 이 디렉토리 가져오기

```bash
cd ~
git clone https://github.com/zkzkzhzj/ChatAppProject.git
cd ChatAppProject/monitoring
```

### 2. 환경변수 설정

```bash
cp .env.example .env
vi .env
# 필수 설정 2가지:
#   GRAFANA_ADMIN_PASSWORD=강력한-비밀번호
#   APP_PRIVATE_IP=운영-EC2-Private-IPv4  (예: 172.31.45.140)
#                  또는 로컬 테스트 시 host.docker.internal
```

둘 다 필수 (`:?required` 구문) — 누락 시 `docker compose up`이 기동 실패로 거부한다.

### 3. 기동

```bash
docker compose up -d
docker compose ps
# prometheus + grafana 두 개 모두 healthy 여야 함
```

### 4. 브라우저 접속

`http://<monitor-public-ip>:3001`

- 계정: `admin`
- 비밀번호: `.env`에 설정한 `GRAFANA_ADMIN_PASSWORD`

## 초기 검증

Grafana 접속 후:

1. 좌측 메뉴 → **Data sources** → `Prometheus` 가 자동 등록됐는지 확인
2. 좌측 메뉴 → **Explore** → Metrics browser → `jvm_memory_used_bytes` 검색 → 값이 나오면 scrape 정상
3. 값 안 나오면 Prometheus 컨테이너 내부에서 target 상태 확인:

   ```bash
   docker exec prometheus wget -qO- http://localhost:9090/api/v1/targets | jq
   ```

## 대시보드 추가

### 공개 대시보드 import (권장)

Grafana UI → `+` → Import → Dashboard ID 입력:

- **4701** — JVM (Micrometer) — 가장 널리 쓰임
- **10280** — Spring Boot Statistics
- **14523** — JVM dashboard (alternative)

### 커스텀 대시보드

`grafana/provisioning/dashboards/*.json` 에 JSON 파일 추가 → 재기동(`docker compose restart grafana`) 하면 자동 import.

## 운영

```bash
# 로그 보기
docker compose logs -f prometheus
docker compose logs -f grafana

# 재시작
docker compose restart prometheus
docker compose restart grafana

# 중지 (데이터 유지)
docker compose down

# 완전 삭제 (데이터까지 날림)
docker compose down -v
```

## prometheus.yml 수정 시

### Hot reload (재시작 없이)

```bash
docker exec prometheus wget -qO- --post-data '' http://localhost:9090/-/reload
```

### 재시작

```bash
docker compose restart prometheus
```

## 보안 체크리스트

- [x] Prometheus UI 9090은 `127.0.0.1` 바인딩 — 인터넷 노출 X
- [x] Grafana 3001은 SG로 내 집 IP만 허용
- [x] Grafana admin 비밀번호 env 주입
- [x] 익명 접근/회원가입 비활성화
- [ ] 장기 운영 시 Grafana SSO/OAuth 연동 검토
- [ ] 장기 운영 시 Elastic IP + 도메인 + HTTPS (Let's Encrypt) 적용

## 비용 절약

부하 테스트 완료 후 모니터링 EC2를 계속 켜둘 필요 없으면:

```text
EC2 콘솔 → gohyang-monitor → Stop instance
  → 인스턴스 과금 중단, EBS만 월 $1 미만 과금
```

재개하려면 Start instance. **Terminate는 하지 말 것** — EBS 볼륨까지 삭제됨.

## k6 메트릭 수집 (Remote Write)

Prometheus가 `--web.enable-remote-write-receiver` 플래그로 기동되므로 외부 툴(k6 등)이 `http://<prometheus>:9090/api/v1/write` 엔드포인트에 메트릭 PUSH 가능.

**사용 시나리오**: 부하 테스트 중 k6의 `stomp_connect_latency`, `position_sent` 등 클라이언트 메트릭을 Grafana에 시각화.

**접근 방법**: Prometheus는 127.0.0.1 바인딩 유지. 외부 k6는 SSM 포트포워딩으로 9090 접근.

```bash
aws ssm start-session \
  --target <monitor-ec2-instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters "portNumber=9090,localPortNumber=9090" \
  --region ap-northeast-2
```

**Grafana에서 시각화**:

- `+` → Import → Dashboard ID `19665` (k6 공식) → Prometheus 데이터 소스 선택
- k6_* 라벨 달린 메트릭 자동 매핑

상세 실행 커맨드: `loadtest/README.md` 5번 섹션.

## IP 변경 대응 (운영 EC2 Private IP가 바뀌었을 때)

```bash
cd ~/ChatAppProject/monitoring
vi .env
# APP_PRIVATE_IP=<새 Private IP>  (AWS 콘솔 → EC2 → gohyang-server-ko → Details)

docker compose up -d
# → extra_hosts 매핑 갱신 + Prometheus 재기동
```

검증: Grafana의 Explore에서 `up{job="gohyang-app"}` 쿼리 → `1`로 나오면 성공.
