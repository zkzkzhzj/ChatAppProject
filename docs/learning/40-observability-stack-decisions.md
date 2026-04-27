# 40. 관측성 스택 도입기 — 호스팅·도구·보안 결정의 트레이드오프

> 작성 시점: 2026-04-22
> 맥락: Week 7 Step B(관측 가능성)의 첫 번째 작업. 부하 테스트를 위해 Prometheus + Grafana를 도입하면서
> 여러 결정점에서 실무 패턴과 개인 프로젝트 현실의 균형을 고민한 기록.
> 관련 학습노트: [37. CD 파이프라인 구축기](./37-cd-pipeline-design.md), [39. Next.js Docker healthcheck IPv6 트랩](./39-nextjs-docker-healthcheck-ipv6-trap.md)

---

## 1. 왜 이 노트가 필요한가

관측성 도입은 "라이브러리 하나 추가 + docker-compose 한 파일 작성"으로 끝나지 않는다.
**어디에 배포할지·어떤 도구를 쓸지·보안은 어떻게 할지** 같은 구조적 결정이 누적된다.
이번 작업에서 내린 6개 결정을 "왜 이 선택을 했고, 어떤 대안이 있었는가" 관점으로 정리한다.

---

## 2. 결정 #0 — 왜 Prometheus + Grafana 조합인가?

### 선행 질문

"모니터링"이라고 뭉뚱그리지만 실제로는 **관측성(observability) 3대 영역**이 나뉜다.

| 영역 | 질문 | 대표 도구 |
|------|------|----------|
| Metrics | "지금 수치가 어떤가?" (p95·CPU·GC·DB pool) | Prometheus, Datadog metrics |
| Logs | "방금 무슨 일이 있었나?" | ELK, Loki, CloudWatch Logs |
| Traces | "한 요청이 어디서 몇 ms 썼나?" | Jaeger, Tempo, Datadog APM |

은탄환은 없다. 스택 선택은 결국 **"어느 영역을 먼저 깔 것인가"** 의 선택이다.
이번 작업의 목적은 부하 테스트 — 필요한 건 숫자(Metrics)다.

### 후보 비교

| 스택 | 영역 | 모델 | 비용 | 이번 과제 적합성 |
|------|------|------|------|----------------|
| **Prometheus + Grafana** | Metrics | Self-host OSS | 무료 | ★★★★★ |
| Grafana Cloud (managed) | Metrics + Logs + Traces | SaaS | Free tier 10k 시리즈 | ★★★★ 운영 0, 학습 기회 ↓ |
| Datadog | 전부 | SaaS | 호스트당 $15+/mo | ★★ 비싸고 개인 프로젝트엔 과함 |
| New Relic | 전부 | SaaS | 100GB/mo 무료 | ★★★ Full-stack APM 강점 |
| ELK (Elasticsearch + Kibana) | Logs 중심 | Self-host | 무료(인프라 큼) | ★★ Metrics는 부차적 |
| Loki + Grafana | Logs | Self-host OSS | 무료 | ★★★★ Prometheus랑 같이 쓰면 이상적 |
| Jaeger / Tempo | Traces | Self-host OSS | 무료 | 별도 목적 |
| OpenTelemetry 단독 | 수집 표준 | - | - | 백엔드 별도 필요 |

### 선택: **Prometheus + Grafana**

**이유**:

1. **목표가 Metrics 영역이다** — 부하 테스트로 찾는 건 숫자다. p95 latency, CPU %, GC pause, DB connection pool. Logs·Traces가 아니다. Metrics 전용 도구가 가장 직선적
2. **Spring Actuator와 사실상 표준 조합** — `micrometer-registry-prometheus`가 1급 지원이다. JVM Micrometer 대시보드(Grafana ID 4701) 같은 기성 ecosystem이 압도적. Datadog·New Relic은 별도 레지스트리 의존성 + 유료 API 키 필요
3. **한국 백엔드 실무 주류** — 네이버·카카오·라인·쿠팡 공개 기술블로그의 모니터링 아키텍처 기본값이다. 취업 목표 회사(SOOP·치지직/네이버)에서 통하는 언어
4. **비용·학습 양쪽 유리** — 무료다 (t3.small 한 대). SaaS는 편하지만 "안에서 어떻게 돌아가는지"를 가려버린다. 직접 세팅하면 pull 모델·scrape config·relabeling 같은 실무 개념을 몸으로 익힌다

### 기각한 이유

- **Datadog / New Relic**: 유료. 개인 프로젝트엔 과하고, 이력서 서사로도 "SaaS에 붙여봤다"는 덜 독보적
- **Grafana Cloud**: 좋은 대안이었다. 운영 부담 0, 세 영역을 한 번에. 다만 "직접 세워봤다" 학습 서사를 잃음 — 이번엔 배움 쪽을 택함
- **ELK**: Logs 중심 스택. Metrics를 Elasticsearch에 저장할 수 있지만 Prometheus 대비 쿼리·보존·알람 전부 불리. Metrics 목적엔 오버킬이자 엇나감
- **Loki**: 훌륭하고 Prometheus와 같이 쓰면 이상적이다. 다만 이번 과제 목표 밖 — 다음 확장 단계로 미룸
- **OpenTelemetry 단독**: OTel은 수집/전송 표준이지 저장·시각화 백엔드가 아니다. 백엔드로 Prometheus/Tempo/Loki 등을 여전히 붙여야 함

### 확장 경로

이번은 Metrics만. 장기적으로는 Grafana를 허브로 세 영역을 쌓는다.

| 단계 | 추가할 것 | 이유 |
|------|----------|------|
| 지금 | Prometheus + Grafana (Metrics) | 부하 테스트 증거 수집 |
| +Logs | Loki + Promtail | 같은 Grafana UI에서 metrics ↔ logs 상호 점프 |
| +Traces | Tempo + OpenTelemetry SDK | NPC 파이프라인 구간별 레이턴시 추적 |
| 장기 | OpenTelemetry 프로토콜 통합 | 세 도구 모두 OTLP로 통일 가능 |

### 트레이드오프

- Metrics 외 Logs/Traces 영역은 이 조합으로 자동 커버되지 않는다 → 확장 시 Loki/Tempo 별도 구축 필요
- Self-host의 운영 부담(백업, 디스크, 버전 업그레이드)을 감수
- 다만 **Grafana가 세 영역의 프런트엔드 공통 허브**라는 점이 장기 확장에서 일관성을 보장 — 나중에 Loki·Tempo 붙여도 UI는 하나

---

## 3. 결정 #1 — 모니터링 스택을 어디에 띄울까?

### 후보

| 옵션 | 특성 |
|------|------|
| A. 운영 EC2에 함께 설치 (Prometheus + Grafana를 app 옆에) | 인프라 0 추가, 비용 0 |
| B. Dedicated Monitor EC2 (t3.small 신규) | 운영 부하 격리, 실무 표준 |
| C. Grafana Cloud Free (managed) | 인프라 관리 0, 대시보드 공유 URL |
| D. 로컬 Docker + EC2 Actuator 원격 스크레이프 | 비용 0, 빠른 셋업 |

### 선택: **B (Dedicated Monitor EC2)**

**이유**:

1. **측정 신뢰성** — 부하 테스트 중 운영 서버 자원 경합이 있으면 "부하 테스트가 측정하는 것"과 "모니터링이 자기 부하로 왜곡된 것"이 섞인다
2. **보안** — 옵션 D(로컬에서 원격 스크레이프)는 운영 EC2의 `/actuator/**`를 인터넷에 노출해야 함 → 민감 정보 유출 위험 (메트릭의 `uri` 라벨에 내부 API 경로가 전부 드러남)
3. **비용 감당 가능** — t3.small 월 약 $15, 테스트 4~5일이면 $2~3
4. **실무 학습** — VPC 내부 Security Group 체이닝, SSM 접근 같은 실무 패턴 경험

### 기각한 이유

- **A**: 운영 EC2 t3.medium 4GB가 이미 빠듯(Cassandra 1G + Kafka 512M + Spring 384M + Next.js). Prometheus+Grafana 1~1.5GB 추가 시 OOM 위험
- **C**: 좋은 대안이지만 "인프라 직접 운영" 학습 기회 상실. 블로그 소재로도 약함
- **D**: 보안상 말이 안 됨 (Actuator 인터넷 노출 = 사이드채널 유출)

### 트레이드오프

- t3.small 비용 ($2~3) vs 측정 신뢰성·보안
- 운영 중 모니터링 필요 시 인스턴스 stop 못함 (별도 관리 부담)

---

## 4. 결정 #2 — 부하 테스트 도구는 뭘로?

### 후보

| 도구 | 특징 | 우리 프로젝트 적합성 |
|------|------|--------------------|
| k6 | JavaScript 기반, WebSocket 네이티브, Grafana 친화 | ★★★★★ |
| Gatling | Scala/Java DSL, STOMP 공식 샘플 있음 | ★★★☆ JVM 친화적이나 러닝커브 |
| JMeter | GUI, WebSocket 플러그인 의존 | ★★ 초기 도입엔 과함 |
| nGrinder | 네이버제, Groovy | ★ 단일 EC2엔 오버킬 |

### 선택: **k6**

**근거** (리서치 기반):

- 한국 실무 2025~2026 신규 도입 주류 (월급쟁이부자들·SK DevOcean 등 사례)
- WebSocket 네이티브 지원 → STOMP 프레임 수동 조립으로 구현 가능
- 단일 바이너리 경량 → t3 환경에서 돌리기 부담 없음
- TypeScript 1.0 정식 지원(2025) → 스크립트 재사용·CI 통합 쉬움

### 기각한 이유

- **Gatling**: JVM 친화성은 매력적이나 Scala/Kotlin DSL 러닝커브. 1회성 과제엔 k6 JS가 빠름
- **JMeter**: WebSocket/STOMP 플러그인의 세션 협상(CONNECT/SUBSCRIBE/SEND)이 부실. GUI 기반이라 CI 재사용 약함
- **nGrinder**: 컨트롤러/에이전트 분리 구조 → 단일 EC2 1회성 과제에 불필요한 복잡도

### STOMP 지원 현실

**k6는 STOMP 네이티브 지원이 없다**. raw WebSocket 위에 STOMP 프레임을 수동 조립해야 함.
`xk6-stomp` extension도 있지만 빌드 별도 필요 → **raw 방식이 현실적**.

---

## 5. 결정 #3 — 부하 타겟은 무엇으로?

### 후보

| 타겟 | 특성 | 병목 가능성 |
|------|------|------------|
| A. 마을 공개 채팅(WebSocket + NPC) | 우리 서비스 핵심, 가장 복잡한 파이프라인 | NPC 파이프라인, Simple Broker, Cassandra dual-write |
| B. 회원가입(REST + Outbox) | Kafka 이벤트 발행 | Outbox polling, PostgreSQL |
| C. 로그인(REST) | JWT 발급 단순 경로 | 없음 |

### 선택: **A — 단 NPC(OpenAI API)는 제외**

**제외 이유**: VU 많을수록 OpenAI 호출비 폭증. VU 1000 × 수분이면 $수십~수백. 그리고 측정이 "우리 시스템 한계"가 아닌 "OpenAI rate limit"이 됨.

**우회 방법**: `NPC_ADAPTER=hardcoded`로 일시 전환. 하드코딩된 답변 반환으로 LLM·pgvector·임베딩 호출 전부 skip → 순수 시스템 한계만 측정.

### 트레이드오프

- "리얼한 서비스 부하"는 아니지만 WebSocket broker / Cassandra dual-write / STOMP 세션 관리의 실제 한계는 측정 가능
- NPC 포함 시나리오는 소규모 샘플링으로 "NPC 파이프라인 추가 시 감소치"만 별도 확인

---

## 6. 결정 #4 — Grafana 접근은 어떻게?

### 후보

| 방식 | 보안 | 편의성 |
|------|------|--------|
| A. 3001 포트 `0.0.0.0/0` + Grafana 로그인 | ❌ SG 실수 시 전면 노출 | ★★★ 설정 간단 |
| B. 3001 포트 내 집 IP(`/32`)만 허용 | ★★ IP 변하면 SG 수정 | ★★ 현실적 |
| C. VPN + private 바인딩 | ★★★★ 가장 안전 | ★ VPN 서버 관리 |
| D. nginx + HTTPS + basic auth | ★★★ | ★★ Let's Encrypt 자동화 필요 |

### 선택: **B (내 집 IP만 허용)**

**이유**:

- 개인 프로젝트 규모엔 VPN 오버킬
- 집 IP가 가끔 바뀌어도 SG 수정 한 번이면 됨 (월 1회 정도)
- nginx + HTTPS는 장기 운영 시 해볼 것, 이번엔 생략

### 추가 장치

- Grafana `:?required` env 문법: `.env` 없으면 기동 실패 → 기본 비밀번호 사고 원천 차단
- Prometheus UI는 `127.0.0.1:9090`만 바인딩 → 외부 노출 X, 접근은 SSM port-forwarding으로

---

## 7. 결정 #5 — Actuator endpoint 기본값을 secure by default로

### 문제 상황

이번 PR 초기엔:

```yaml
# deploy/docker-compose.yml
ACTUATOR_ENDPOINTS: ${ACTUATOR_ENDPOINTS:-health,info,metrics,prometheus}
```

기본값에 `prometheus` 포함. `.env` 없이 기동되면 `/actuator/prometheus`가 무인증 공개.

### 3개 층의 조합이 만든 위험

```text
A. ports: "${APP_PORT:-8080}:8080"     → 0.0.0.0:8080 (외부 노출)
B. ACTUATOR_ENDPOINTS 에 prometheus    → endpoint 활성화
C. security.env-public-paths: /actuator/** → Spring Security permitAll
```

A+C는 **기존부터 존재**. 이번 PR이 B를 추가해 A+C의 잠재 취약성을 실제 공격 표면으로 전환.

### 해결: 두 층 수정 (+ 환경별 오버라이드)

```yaml
# 1. 포트 바인딩 인터페이스를 env로 제어 (환경별 다른 요구 대응)
ports:
  - "${APP_BIND_IP:-127.0.0.1}:${APP_PORT:-8080}:8080"

# 2. Actuator 기본값 축소 — secure by default
ACTUATOR_ENDPOINTS: ${ACTUATOR_ENDPOINTS:-health}
```

운영 `.env`에서 명시적으로 확장:

```bash
APP_BIND_IP=0.0.0.0                                              # VPC 내부 scrape 허용
ACTUATOR_ENDPOINTS=health,info,metrics,prometheus
SECURITY_ENV_PUBLIC_PATHS=/actuator/health,/actuator/prometheus
```

### 왜 `APP_BIND_IP` env화인가 — 시행착오 노트

처음엔 `127.0.0.1`을 **하드코딩**했다 ("loopback 바인딩으로 SG 실수 시 2중 방어").
그런데 배포 후 monitor EC2의 Prometheus가 `connection refused`.

- 운영 EC2 호스트의 `lo` 인터페이스에만 8080 오픈 → `eth0`(VPC private IP) 8080 닫힘
- monitor EC2가 VPC 내부 IP로 접근 시도 → 해당 인터페이스에 listener 없음 → refused

**"loopback 2중 방어"와 "VPC 내부 scrape"가 충돌**. 이걸 해결하려고:

- 로컬·CI 환경: 기본값 `127.0.0.1` 유지 (여전히 안전)
- 운영: `.env`로 `APP_BIND_IP=0.0.0.0` 명시 (SG가 monitor-sg만 허용하니 인터넷 노출은 차단됨)
- 더 타이트하게 하려면 `APP_BIND_IP=<private-ip>` 로 특정 인터페이스만

교훈:

- "Secure by default"가 **실제 사용 시나리오**를 깨뜨리면 무의미
- 인프라 결정은 데이터 흐름 전체(app → SG → eth0 → VPC → 다른 EC2)를 그려본 뒤 해야 함
- env 오버라이드 패턴은 "기본 안전 + 필요 시 개방"의 가장 깔끔한 해답

### 왜 `health` 하나만 기본값?

- Docker healthcheck가 `/actuator/health` 사용 → 이 endpoint는 무조건 있어야 함
- 나머지(`info`, `metrics`, `prometheus`)는 **선택적 노출** — 필요한 환경에서만 명시적으로 확장
- "Secure by default" vs "Convenient by default" 사이에서 보안 쪽 선택

### 트레이드오프

- 로컬 개발자가 metrics 확인하려면 `.env`에 `ACTUATOR_ENDPOINTS=...` 추가해야 함
- 약간의 불편 ↔ 운영 `.env` 실수 시 정보 유출 방지

---

## 7.5. 결정 #5-보조 — Prometheus scrape target을 env 템플릿화

### 문제

`prometheus.yml`에 Private IP를 하드코딩하면:

- EC2 재생성 시 IP 변경 → scrape 실패 (소리 없는 고장)
- git history에 내부 IP 영구 기록 (history rewrite 필요)
- README에 "이 IP가 무엇인지" 설명이 필요 → 정보 중복 노출

### Prometheus의 env 치환 미지원

Prometheus 2.x는 scrape config에서 환경변수 치환을 기본 지원하지 않는다.
`--enable-feature=expand-external-labels`는 external_labels에만 적용되고 target에는 안 먹음.

### 선택: Docker `extra_hosts` + 호스트명 고정

```yaml
# monitoring/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'gohyang-app'
    static_configs:
      - targets: ['gohyang-app:8080']   # 호스트명 고정 (하드코딩 제거)

# monitoring/docker-compose.yml
services:
  prometheus:
    extra_hosts:
      - "gohyang-app:${APP_PRIVATE_IP:?APP_PRIVATE_IP must be set in .env}"

# monitoring/.env
APP_PRIVATE_IP=172.31.45.140
```

**동작 원리**:

1. Docker가 Prometheus 컨테이너의 `/etc/hosts`에 `172.31.45.140 gohyang-app` 추가
2. Prometheus가 `gohyang-app:8080` 스크레이프 시 OS의 name resolution → `/etc/hosts` → IP 획득
3. 실제 IP는 `.env` 한 곳에서만 관리

### 장점

- 소스(prometheus.yml, compose.yml)에 IP 하드코딩 **0**
- git history에 내부 IP 노출 없음
- IP 변경 시 `.env` 한 줄 + `docker compose up -d`
- 로컬 테스트 시 `APP_PRIVATE_IP=host.docker.internal`로 호스트 머신 app 스크레이프 가능

### 대안 검토

| 대안 | 평가 |
|------|------|
| `ec2_sd_configs` (AWS SD) | 가장 정석이지만 IAM Role·tag 기반 복잡. 단일 타겟엔 과함 |
| envsubst로 기동 전 치환 | init container 추가 필요, 복잡도 ↑ |
| DNS 이름 등록 (Route 53 private zone) | ENI 있어야 하고 설정 많음 |
| **extra_hosts** | 가장 단순·우아. Docker 표준 기능 |

---

## 8. 결정 #6 — 모니터링 스택 CD를 둘까?

### 후보

| 방식 | 장점 | 단점 |
|------|------|------|
| A. 수동 배포 (`git pull && docker compose up -d`) | 단순, YAGNI | 실수 가능성 |
| B. 전용 CD workflow (`deploy-monitoring.yml`) | 자동화 | 변경 빈도 낮은 영역에 CI/CD 도입 비용 |

### 선택: **A (수동)**

**이유**:

- 모니터링 스택은 한 번 세팅 후 거의 안 바뀜 (prometheus.yml 수정 1~2회/수개월)
- CD 추가 복잡도가 얻는 이득 대비 큼 (YAGNI)
- Grafana 대시보드는 UI에서 편집 → JSON export → 커밋 → `docker compose restart grafana` (수동 1번)

### 격리 장치

운영 CD(`.github/workflows/deploy.yml`)는 `paths-ignore`에 `monitoring/**` 추가:

- 모니터링 파일만 변경한 push는 운영 CD를 트리거하지 않음
- 반대로 운영 CD가 모니터링을 건드릴 일도 없음 (단방향 격리)

### 블로그 소재 측면

**"모니터링 CD 넣을까 말까"** 자체가 "YAGNI와 자동화의 균형" 서사로 쓸 만함.
"왜 운영은 CD를 두면서 모니터링은 수동으로 했는가" 한 단락.

---

## 9. Spring Boot 4.x 트랩 — 기본값 덮어쓰기

### 증상

`application.yml`에 다음 추가했는데:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: ${ACTUATOR_ENDPOINTS:health,info,metrics,prometheus}
```

`/actuator/prometheus`가 계속 404. 3시간 디버깅.

### 실제 원인

`deploy/docker-compose.yml`이 `ACTUATOR_ENDPOINTS` env var를 이미 주입 중이었음:

```yaml
environment:
  ACTUATOR_ENDPOINTS: ${ACTUATOR_ENDPOINTS:-health,info,metrics}  # prometheus 없음!
```

즉 **환경변수가 application.yml 기본값을 덮어쓰고 있어서** `prometheus`가 include 리스트에 포함 안 됨.

### 교훈

**12-factor 환경변수 주입과 application.yml 기본값 우선순위**:

```text
환경변수 (docker-compose environment)  ← 가장 높음
  > .env 파일
  > application.yml 기본값
  > 하드코딩 default
```

코드 수정 후 로컬 환경변수가 덮어쓰는지 확인하는 습관 필요.

---

## 10. 참고 자료

- [Prometheus scrape config 공식 문서](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Grafana provisioning 공식 문서](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [JVM Micrometer 대시보드 ID 4701](https://grafana.com/grafana/dashboards/4701)
- [k6 WebSocket 문서](https://k6.io/docs/using-k6/protocols/websockets/)
- [Spring Boot 4.0 Actuator 문서](https://docs.spring.io/spring-boot/reference/actuator/metrics.html)
- 부하 테스트 도구 비교 리서치 (외부 자료 — 회사 환경별 nGrinder/k6/JMeter 채택 사례)

---

## 11. 요약 테이블

| 결정 | 선택 | 핵심 이유 |
|------|------|----------|
| 관측성 스택 조합 | Prometheus + Grafana | Metrics 영역 목표 · Spring Actuator 1급 지원 · 한국 실무 주류 · 직접 세팅으로 실무 개념 체득 |
| 모니터링 호스팅 | Dedicated Monitor EC2 (t3.small) | 측정 신뢰성·보안·실무 패턴 |
| 부하 도구 | k6 | 한국 실무 주류·WebSocket 네이티브·경량 |
| 부하 타겟 | 마을 공개 채팅 (NPC 제외) | 핵심 기능·OpenAI 비용 회피 |
| Grafana 접근 | SG 내 집 IP만 | 개인 프로젝트 규모에 적합 |
| Actuator 기본값 | `health`만 (secure by default) | `.env` 실수 시 정보 유출 방지 |
| Scrape target IP 관리 | `extra_hosts` + `.env` | Prometheus env 치환 미지원 우회, 하드코딩 0 |
| 모니터링 CD | 수동 (YAGNI) | 변경 빈도 낮음, `paths-ignore`로 운영 CD 격리 |
