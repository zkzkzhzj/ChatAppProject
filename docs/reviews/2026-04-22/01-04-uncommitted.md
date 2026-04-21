# 코드 리뷰 — 2026-04-22 01-04

## 대상
- 종류: uncommitted changes (관측성 레이어 도입 PR)
- 변경 파일:
  - `.claude/hooks/stop-handover-check.js` (수정)
  - `.claude/hooks/session-start-snapshot.js` (신규)
  - `.claude/settings.json` (SessionStart hook 등록)
  - `.github/workflows/deploy.yml` (paths-ignore에 `monitoring/**`)
  - `.gitignore` (`.claude/cache/` 추가)
  - `backend/build.gradle.kts` (`io.micrometer:micrometer-registry-prometheus` 추가)
  - `backend/src/main/resources/application.yml` (`prometheus` endpoint + `metrics.tags.application`)
  - `deploy/docker-compose.yml` (`ACTUATOR_ENDPOINTS` 기본값에 `prometheus`)
  - `monitoring/` 디렉토리 (Prometheus+Grafana 스택, prometheus.yml, grafana provisioning, README, .env.example)

---

## Codex 리뷰 결과

Codex 최종 메시지(요약):
> The changes introduce a security-relevant default credential in the monitoring stack and weaken the handover hook's ability to detect edits to files that were already dirty at session start. These are actionable issues that should be corrected before accepting the patch.

**Codex 지적 이슈**

### [P1] Require a Grafana admin password — `monitoring/docker-compose.yml:55`
`GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-changeme}` 패턴은 `.env` 파일이 없거나 변수가 비어 있을 때 Grafana가 `admin/changeme` 공개 디폴트로 기동된다. EC2 모니터링 호스트에서 3001이 외부에 노출되는 만큼, 기본값으로 감추기보다 변수가 없으면 fail-fast로 기동을 중단시키는 편이 안전하다.

권장 수정:
```yaml
GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD must be set}
```
(`:?` 문법은 변수가 unset/empty일 때 docker compose가 에러로 종료)

### [P2] Detect edits to already-dirty files — `.claude/hooks/stop-handover-check.js:77-82`
SessionStart 시점에 이미 ` M foo.java` 상태였던 파일을 세션 중에 추가로 수정해도 porcelain 코드는 그대로 ` M`이다. `snapMap.get(file) !== status` 비교만으로는 이 케이스가 델타에 잡히지 않아, 세션 중 실제 작업이 있었는데도 Stop hook이 handover.md 요구를 스킵할 수 있다. 스냅샷 시점의 파일 해시/mtime이나 워킹 트리 내용 해시를 함께 저장해 비교하는 보강이 필요하다.

---

## 보완 검증

### 1. Spring Boot 4.x Prometheus 자동구성 (learning/12 패턴)
- `./gradlew dependencies --configuration runtimeClasspath` 실행 결과 `spring-boot-starter-actuator:4.0.3` + `micrometer-registry-prometheus:1.16.3` + `prometheus-metrics-*:1.4.3`까지 모두 정상 해석됨.
- Spring Boot 4.x는 `spring-boot-autoconfigure`가 기술별 모듈로 분리됐지만(learning/12), Actuator Prometheus는 `spring-boot-actuator-autoconfigure`가 포함하고 있어 별도 `spring-boot-actuator-autoconfigure-metrics-*` 모듈을 명시할 필요는 없다. 즉 현재 의존성 구성은 4.x 권장 패턴과 일치.
- **[Minor]** 다만 실제 `/actuator/prometheus` endpoint가 활성화되었는지는 기동해서 `curl` 확인이 필요. 본 리뷰 범위에서는 정적 확인만 가능하므로, PR 머지 전에 로컬 `docker compose up app` 후 `curl http://localhost:8080/actuator/prometheus | head` 로 exposition format이 나오는지 1회 검증할 것.

### 2. CLAUDE.md Critical Rules 영향
- 이번 PR에 도메인 코드 변경 없음 → Rule 1~4, 6 해당 없음.
- Rule 5(테스트): 인프라/설정 변경 위주라 단위 테스트 대상이 제한적이지만, `SecurityProperties`가 `/actuator/**`를 공개 경로로 노출하는 부분은 integration 테스트로 `/actuator/prometheus` 응답 검증을 남겨두면 회귀 방지에 유효.
- Rule 7(트레이드오프 학습노트): Prometheus endpoint 노출 방식(경로 공개 + SG 차단 vs Spring Security 인증)과 scrape target 하드코딩 vs 서비스 디스커버리 트레이드오프가 대화에 등장했다면 `docs/learning/`에 노트를 남겨야 한다. 현재 사본 확인한 learning 디렉토리에는 관측성 관련 번호가 없음(최신 39까지).

### 3. `deploy/docker-compose.yml` — 놓친 env 없음
- `application.yml`의 `management.metrics.tags.application`은 하드코딩(`gohyang-app`)이라 env 주입 변수를 추가할 필요 없음. 다만 향후 staging/prod를 같은 Prometheus로 수집한다면 `MANAGEMENT_METRICS_TAGS_APPLICATION` env로 분리해야 라벨 충돌이 없다. 현재 단일 EC2 전제라면 OK.
- `ACTUATOR_ENDPOINTS` 기본값에 `prometheus` 추가한 것만으로 `/actuator/prometheus`가 노출되려면 `SECURITY_ENV_PUBLIC_PATHS=/actuator/**`(기존 값)이 함께 필요한데, 이미 포함되어 있음 → 정상.
- Healthcheck(`curl -f http://localhost:8080/actuator/health`)는 그대로 유효.

### 4. `monitoring/docker-compose.yml` 안전성
- **[OK]** Prometheus `127.0.0.1:9090` 바인딩 — 퍼블릭 인터페이스 노출 없음.
- **[OK]** Grafana `GF_USERS_ALLOW_SIGN_UP=false`, `GF_AUTH_ANONYMOUS_ENABLED=false`.
- **[OK]** healthcheck, retention 7d, `--web.enable-lifecycle`, `depends_on: service_healthy` 구성 적절.
- **[P1 — Codex와 동일]** `GRAFANA_ADMIN_PASSWORD` 기본값 `changeme`. `:?` 문법으로 교체 권장. 현재 README에 "수정 필수" 문구는 있으나 운영 가드는 없음.
- **[Minor]** Grafana 3001은 `0.0.0.0:3001`로 바인딩된다. README의 "SG로 내 집 IP만 허용" 가드가 운영 런북에만 존재한다는 점을 배포 체크리스트에 명시 필요. (compose 레벨에서는 강제할 수 없음.)
- **[Minor]** `GF_INSTALL_PLUGINS: ""` 주석("플러그인 설치 허용")이 실제 동작과 다름. 빈 문자열이면 설치되는 플러그인이 없다는 뜻이지 "UI 설치 허용"을 의미하지 않음. 오해 소지 있는 주석 정리 권장.

### 5. `prometheus.yml` scrape config
- **[P2/Minor]** `targets: ['172.31.45.140:8080']`는 VPC Private IP 하드코딩. 문서(README)와 주석에 "gohyang-server-ko Private IPv4"로 맥락이 기록되어 있어 현재로선 수용 가능하나, EC2 재생성 시 IP가 바뀌면 조용히 scrape가 실패한다. 개선 방안:
  - 단기: prometheus 자체 모니터링(job_name: `prometheus`)이 있으므로 `up{job="gohyang-app"} == 0` alert rule 추가 시 조기 탐지 가능.
  - 중기: EC2에 정적 private IP(ENI) 고정, 또는 `ec2_sd_configs`(AWS SD) 활용.
- `external_labels`(environment/cluster) + per-target labels(service/env/instance_name) 라벨링은 합리적. Micrometer가 붙이는 `application=gohyang-app` 태그와 `service=backend`가 중복되지 않아 향후 다중 인스턴스 확장 시 구분 용이.
- **[Info]** scrape_interval 15s + scrape_timeout 10s — timeout이 interval의 67% 수준이라 네트워크 지연 시 쉽게 겹칠 수 있다. 운영 초기에는 OK지만 타임아웃이 자주 관찰되면 timeout 5s 또는 interval 30s로 조정.

### 6. `paths-ignore`에 `monitoring/**` 추가 — 부작용 검토
- 기존 ignore 리스트: `docs/**`, `**.md`, `.claude/**`, `.github/ISSUE_TEMPLATE/**`, `llm-test/**` + 신규 `monitoring/**`.
- CD 워크플로우는 `push: branches: [main]`에서만 트리거되고, `detect-changes` 단계에서 `backend/**`, `frontend/**`, `deploy/**` + `deploy.yml` 자체만 빌드/배포 필터로 사용. `monitoring/**`은 운영 EC2 CD와 완전히 분리되므로 무시해도 안전.
- **[Caveat]** `paths-ignore`는 "모든 변경 파일이 ignore 패턴과 매칭될 때"만 트리거를 건너뛴다. 따라서 한 커밋에 `monitoring/` + `backend/`가 섞여 있으면 기존처럼 CD가 돈다. 의도와 일치.
- **[Minor]** CI(`ci.yml` 등 다른 워크플로우)에는 `monitoring/**` ignore가 추가되지 않았다. 모니터링 YAML만 고쳐도 CI가 돌지만, prometheus.yml은 Spring 빌드와 무관하므로 CI 실행 자체가 특별한 비용은 아니다. 필요 시 별도 PR로 정리.

### 7. `.claude/hooks` 변경 관련 보조 관찰
- Codex의 [P2] 외에도 `session-start-snapshot.js`는 **스냅샷 파일이 커밋되지 않도록** `.gitignore`에 `.claude/cache/`가 포함된 것이 맞게 추가되었다(확인).
- 스냅샷 실패 시 snap-less 상태에서 Stop hook이 통과해버리는(over-permissive) 동작은 의도라고 주석에 명시되어 있으나, 이로 인해 해당 이슈를 재현하기 어려워질 수 있다. 세션이 길어지는 날을 대비해 `snapshot.timestamp`가 너무 오래됐을 때 경고 로그를 남기는 것도 고려.

---

## 종합 평가

| 심각도 | 건수 | 요약 |
|--------|------|------|
| Critical | 0 | 즉시 차단할 사안 없음 |
| Major (P1) | 1 | Grafana 기본 비밀번호 fallback 제거 (fail-fast) |
| Minor (P2) | 2 | handover hook 이미 dirty 파일 감지 미흡, prometheus target 하드코딩 장애 감지 |
| Info | 3 | 기동 후 `/actuator/prometheus` 1회 검증, Grafana 주석 정리, scrape timeout/interval 비율 |

전반적으로 관측성 레이어 도입은 구조·보안 측면에서 깔끔하다. P1(Grafana 비밀번호)만 머지 전에 고치면 된다.
