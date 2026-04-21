# MD 정합성 리뷰 — 2026-04-22 01-04

## 대상
- 종류: 문서 정합성 + 코드↔명세 교차검증 (관측성 레이어 도입 PR)
- 범위: `monitoring/`, `deploy/`, `backend/src/main/resources/application.yml`, `backend/build.gradle.kts`, `docs/handover.md`, `docs/architecture/`, `docs/knowledge/`, `docs/learning/INDEX.md`, `docs/wiki/INDEX.md`

---

## Codex 리뷰 원문 (주요 발췌)

Codex 원본 로그는 `./_codex_raw.txt` (1.1MB) 및 `./.codex_raw.txt` (직전 실행 결과) 에 보존.
핵심 findings 요약:

### [P1] 운영 env 예시가 관측성 설정을 반영하지 않음
- 파일: `deploy/.env.example:67, 71`
- 내용: 운영 가이드가 여전히 `ACTUATOR_ENDPOINTS=health`, `SECURITY_ENV_PUBLIC_PATHS=/actuator/health` 를 권장.
- 문제: 이 값대로 운영 배포 시 `/actuator/prometheus`가 막혀 `monitoring/prometheus/prometheus.yml` 의 scrape가 실패.
- 판정: **문서(주석)가 outdated — 코드/compose가 truth.**
  - `application.yml:68` 기본값 = `health,info,metrics,prometheus`
  - `deploy/docker-compose.yml:178` 기본값 = `health,info,metrics,prometheus`
  - `deploy/docker-compose.yml:182` 기본값 = `/actuator/**`
  - 하지만 `.env.example` 주석은 옛날 값(`health` 만) 그대로.

### [P1] Prometheus endpoint 운영 기본값이 방어층 없이 노출 가능 (보안 설계 이슈, 문서 정합성 아님)
- 파일: `deploy/docker-compose.yml:177-182`, `monitoring/docker-compose.yml:55`
- 내용:
  - compose 기본값이 `ACTUATOR_ENDPOINTS=...,prometheus` + `SECURITY_ENV_PUBLIC_PATHS=/actuator/**` — `.env` 누락 시 `/actuator/prometheus` 인증 없이 공개.
  - `GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-changeme}` — `.env` 누락 시 Grafana가 `changeme`로 기동.
- 판정: **코드/설정 자체 문제 — 문서 수정으로 해결 불가.** 사용자 판단 필요 (Critical Rule #6과 직접 상관은 없으나 보안).
- 완화 방안 제안:
  - `${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD required}` — 누락 시 compose가 실패하도록.
  - `deploy/docker-compose.yml` 기본 `ACTUATOR_ENDPOINTS`를 `health`로 되돌리고, 운영 `.env`에서만 `prometheus` 추가하도록 가이드.

### [P2] handover.md 20차 업데이트가 관측성 작업을 반영 안 함
- 파일: `docs/handover.md:174, 188-194`
- 내용:
  - line 174: "B. 관측 가능성 ... 🔜 **다음 작업**" — 이미 코드/설정/monitoring 디렉토리 도입 진행 중.
  - line 190: "모니터링 스택 호스팅 위치 — EC2 추가 vs t3.large 일시 확대 vs 로컬 스크린샷 [ ]" — 이미 `gohyang-monitor` EC2 방식으로 확정되어 `monitoring/README.md` 작성됨.
- 판정: **문서가 outdated — 현재 작업 상태 반영 필요. (단, 작업이 WIP이므로 완료 시점에 갱신이 더 정확.)**

### [P2] Prometheus scrape target이 private IP hardcoded
- 파일: `monitoring/prometheus/prometheus.yml:20`
- 내용: `172.31.45.140:8080` 하드코딩 — 운영 EC2 재생성 시 private IP 바뀌면 메트릭만 조용히 끊김.
- 판정: **코드/설정 — EIP 가정 또는 env 템플릿화 필요.** `monitoring/README.md`에 "운영 EC2 private IP 고정 전제" 명시 또는 EIP 부여 검토.

### [P2] architecture.md / knowledge/INDEX.md / wiki/INDEX.md / learning/INDEX.md 에 관측성 언급 없음
- 파일: `docs/architecture/architecture.md`, `docs/architecture/infra.md:51-58` (인프라별 역할 테이블), `docs/knowledge/INDEX.md`, `docs/wiki/INDEX.md`
- 내용: `infra.md` 의 "인프라별 역할" 테이블에 Prometheus/Grafana 행이 없음. architecture.md에 관측성 레이어 언급 없음.
- 판정: **문서 미반영 — 관측성 작업 완료 후 보강 필요. 현 WIP 단계에서는 우선순위 낮음.**

### [INFO] monitoring/README.md 자체 정합성
- `build.gradle.kts:27-30` 에 `spring-boot-starter-actuator` + `micrometer-registry-prometheus` 이미 추가됨 — README가 가정하는 `/actuator/prometheus` 와 일치. LGTM.
- `application.yml:64-78` actuator 노출 설정 — monitoring/README.md의 scrape 가정과 일치. LGTM.
- `monitoring/docker-compose.yml` 의 `prometheus` 포트 `127.0.0.1:9090` 바인딩 + `grafana` public `3001:3000` — README 체크리스트와 일치. LGTM.
- README의 git clone 경로 (`~/ChatAppProject/monitoring`) — 실제 레포 구조와 일치. LGTM.

---

## 보완 검증 및 수정 내역

### 수동 확인 결과
- `git status` — `monitoring/` 는 untracked (신규). `deploy/docker-compose.yml`, `application.yml`, `build.gradle.kts` modified. **이 PR은 WIP 상태.**
- `application.yml:60-78` 관측성 관련 주석/기본값이 일관됨.
- `build.gradle.kts:30` `micrometer-registry-prometheus` 의존성 정상 추가.
- `docs/learning/38-env-var-config-migration.md:220` 예시 yml 에서 `ACTUATOR_ENDPOINTS:health,info` 만 기술 — 이 학습노트는 CD 배포 시점 스냅샷이므로 그대로 둬도 무방. 단, 관측성 도입 이후 패턴이 바뀌었음을 학습노트 번호 40+ 로 별도 기록하는 게 일관적.

### 직접 수정한 문서
**없음.** — 본 작업이 WIP 이고, 사용자가 "반영해야 하는지 점검 필요"로 판단 요청한 상태이므로 에이전트 재량 수정을 보류함. 아래 "필수 업데이트 3곳"을 사용자에게 보고.

---

## 우선순위 정리

| 우선순위 | 항목 | 종류 |
|----------|------|------|
| P1 | `deploy/.env.example:67, 71` — 운영 env 예시에 `prometheus` 포함시키도록 갱신 | 문서 outdated |
| P1 | `monitoring/docker-compose.yml:55` + `deploy/docker-compose.yml:177-182` — Grafana 기본 비번/Prometheus endpoint 기본 공개 | 보안 설계 (코드) |
| P2 | `docs/handover.md:174, 188-194` — 관측성 "다음 작업" → "진행 중" 반영 및 결정 완료 체크 | 문서 outdated |
| P2 | `monitoring/prometheus/prometheus.yml:20` — hardcoded private IP | 코드 (EIP or 명시) |
| P2 | `docs/architecture/infra.md`, `docs/knowledge/INDEX.md` — 관측성 레이어 반영 | 문서 보강 |
| P2 | `docs/learning/INDEX.md` — 향후 "관측성" 카테고리 준비 | 문서 보강 |

