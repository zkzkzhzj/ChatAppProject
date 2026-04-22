# loadtest/ — 마음의 고향 부하 테스트 자산

> k6로 마을 공개 채팅 STOMP broadcast의 breaking point를 찾는다.
> 상세 설계·STOMP 프레임 설명은 [docs/learning/41-k6-load-testing-setup.md](../docs/learning/41-k6-load-testing-setup.md).

---

## 디렉토리

```text
loadtest/
├── lib/
│   └── stomp.js             # STOMP 프레임 조립/파싱 헬퍼 (재사용)
├── prepare-tokens.js        # 테스트 계정 사전 발급 (Node 실행, login-first 멱등)
├── village-mixed.js         # k6 시나리오 — position + chat 혼합 (ramping-vus)
├── tokens.json              # 발급 결과 (git ignored)
├── summary.json             # k6 실행 요약 (git ignored)
└── README.md
```

## 사전 요구

- k6 ≥ v0.49
- Node.js ≥ 20 (prepare/cleanup 스크립트용)
- 백엔드 운영 인스턴스 — `NPC_ADAPTER=hardcoded` 로 임시 전환되어 있을 것
- (선택) Origin IP 직결 시 EC2 `app-sg`에 테스트 IP 임시 허용

## 실행 순서

### 1) 토큰 풀 발급 (멱등 · 재사용 모델)

```bash
# 스모크용 소량 먼저 (최초 1회만 register, 이후는 login 재발급)
BASE_URL=https://ghworld.co COUNT=10 node loadtest/prepare-tokens.js

# 본 테스트용
BASE_URL=https://ghworld.co COUNT=1000 node loadtest/prepare-tokens.js
```

- 스크립트는 `login` 먼저 시도 → 401이면 `register`. 같은 이메일을 재사용해도 안전
- 결과: `loadtest/tokens.json` 에 JWT 배열 저장
- 계정: `loadtest-0001@test.local` ~ `loadtest-NNNN@test.local` (영구, cleanup 없음)
- 패스워드: `LOADTEST_PASSWORD` 환경변수로 오버라이드 (기본값 `LoadTest2026!` — 로컬 dev 편의용).
  운영/공유 인프라에서는 반드시 env로 주입, 주기적으로 로테이션.
- 동시 요청 수: `CONCURRENCY=10` (환경변수로 조정 가능)

### 2) 스모크 (VU 1, 30초)

```bash
BASE_URL=https://ghworld.co WS_URL=wss://ghworld.co/ws/websocket \
  k6 run --vus 1 --duration 30s loadtest/village-mixed.js
```

통과 기준: `checks` 100%, `ws_connecting` 성공, 서버 로그에 CONNECTED/POSITION broadcast 확인.

### 3) 정식 ramping 테스트

```bash
BASE_URL=https://ghworld.co WS_URL=wss://ghworld.co/ws/websocket \
  k6 run --summary-export=loadtest/summary.json \
  loadtest/village-mixed.js
```

프로파일(기본): `0 → 50 (1m) → 500 (3m) → 1000 (5m) → 0 (2m)` — 총 ~11분.
시나리오: position 500ms + chat 15~30s 랜덤. Grafana JVM/HTTP/DB와 **같은 시간축**으로 관찰.

### 4) 수동 가시적 관찰

테스트 실행 중 브라우저로 `https://ghworld.co` 접속 → Phaser 화면에서 유저 캐릭터 이동을 눈으로 확인. VU 100 / 500 / 1000 시점 스크린샷.

### 5) k6 메트릭을 Grafana에 직송 (선택)

k6의 `stomp_connect_latency` 등 클라이언트 관점 메트릭을 Prometheus에 PUSH → Grafana에서 시각화. 공식 대시보드 ID `19665` (k6 Prometheus) 와 매칭.

**전제조건**: 운영 Prometheus가 `--web.enable-remote-write-receiver` 활성화 (monitoring/docker-compose.yml에 반영됨).

**SSM 포트포워딩**으로 monitor EC2의 Prometheus 9090을 로컬로 끌어오기:

```bash
aws ssm start-session \
  --target <monitor-ec2-instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters "portNumber=9090,localPortNumber=9090" \
  --region ap-northeast-2
```

그 상태에서 k6 실행:

```bash
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
BASE_URL=https://ghworld.co WS_URL=wss://ghworld.co/ws/websocket \
  k6 run --out experimental-prometheus-rw \
  --stage 30s:100 --stage 1m:100 --stage 30s:150 --stage 1m:150 --stage 30s:200 --stage 1m:200 --stage 30s:0 \
  loadtest/village-mixed.js
```

**Grafana에 k6 대시보드 import**:

1. Grafana → `+` → Import → Dashboard ID: `19665` → Load
2. Data source: Prometheus
3. Load Test Live 옆에 새 탭으로 열어 두고 VU 시점 스크린샷

---

## 주의

- `tokens.json`에는 실 JWT가 들어간다 → **절대 커밋 금지** (`.gitignore` 처리됨).
- 1000 유저 회원가입은 Outbox → Kafka → 캐릭터/공간 생성 파이프라인을 자극한다. `prepare-tokens.js` 실행 직후 Grafana에서 backlog가 정상 해소되는지 확인 후 본 테스트 진행.
- Cloudflare 경로 사용 시 부하가 엣지에서 흡수되어 서버 breaking point가 안 드러날 수 있다. 병목 측정 목적이면 Origin IP 직결 권장.

## 참고

- [학습노트 41 — k6 사용법 설계](../docs/learning/41-k6-load-testing-setup.md)
- [학습노트 40 — 관측성 스택 도입기](../docs/learning/40-observability-stack-decisions.md)
- [API 명세 — auth](../docs/specs/api/auth.md)
- [WebSocket 명세](../docs/specs/websocket.md)
