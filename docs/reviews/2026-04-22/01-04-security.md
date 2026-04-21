# 보안 리뷰 — 2026-04-22 01-04

> 🔒 **이 문서는 2026-04-22 01:04 시점의 보안 스냅샷입니다.**
> 이후 커밋에서 Critical/High 항목이 반영되었습니다 (호스트 포트 127.0.0.1 loopback 바인딩,
> Grafana `:?required` 강제, ACTUATOR_ENDPOINTS `health` 기본값, prometheus.yml IP 제거 등).
> 각 finding은 시점 스냅샷으로 읽고, 최신 코드와 `docs/learning/40-observability-stack-decisions.md` 결합해 판단.

## 리뷰 스코프

- deploy/docker-compose.yml — Actuator prometheus endpoint 기본 노출 추가
- backend/src/main/resources/application.yml — ACTUATOR_ENDPOINTS 기본값에 prometheus 포함 + metrics tags
- monitoring/docker-compose.yml — 신규 Grafana + Prometheus 스택
- monitoring/prometheus/prometheus.yml — scrape target 운영 EC2 private IP
- monitoring/.env.example, monitoring/.gitignore — 비밀값 관리 체계
- .github/workflows/deploy.yml — 모니터링 스택 path filter 제외


## Codex 보안 리뷰 결과 (요약)

- [P1] deploy/docker-compose.yml:178 — /actuator/prometheus 인증 없이 노출 (SG가 없으면 인터넷 공개)
- [P1] monitoring/docker-compose.yml:54 — Grafana admin 패스워드 fallback changeme 존재
- [P2] monitoring/prometheus/prometheus.yml:15-20 — scrape target에 basic_auth 없음

Codex 원문은 /tmp/codex_security_01-04.txt 마지막 섹션에 있음 (review writeup 파트).

## 보완 검증 (Grep + 코드 대조 결과)

### 사실 관계 확인

**1. 현재 /actuator/prometheus는 인증 없이 누구든 접근 가능 상태로 배포된다.**

- application.yml:85 — env-public-paths 기본값이 /actuator/**
- deploy/docker-compose.yml:182 — SECURITY_ENV_PUBLIC_PATHS 기본값이 /actuator/**
- SecurityConfig.java:43 — requestMatchers(securityProperties.allPublicPaths()).permitAll()
- .env가 없거나 SECURITY_ENV_PUBLIC_PATHS를 덮어쓰지 않으면 /actuator/** 전체가 permitAll이다.

**2. 운영 EC2의 8080은 이 PR 이전에도, 그리고 레포상 현재 상태로도 0.0.0.0/0에 노출되어 있었다.**

- docs/learning/35-aws-ec2-first-deployment.md:128 — 최초 배포 시 app-sg 8080 = 0.0.0.0/0
- deploy/docker-compose.yml:149 — "${APP_PORT:-8080}:8080" (bind IP 미지정 → 0.0.0.0 바인딩)
- nginx는 /actuator/*를 프록시하지 않지만, 호스트 포트 8080이 외부 개방이면 http://ghworld.co:8080/actuator/prometheus로 우회 직접 접근 가능.
- SG-as-code가 레포에 없어 "이번 PR에서 app-sg 8080을 monitor-sg only로 변경" 주장은 레포만 보고는 검증 불가 (추정).

**3. 운영 EC2의 실제 SG 상태는 AWS 콘솔에서만 확인 가능하며, 이 레포에는 반영되지 않는다.**

- Terraform/CloudFormation 파일 없음.
- 이 PR의 Critical 판정은 "레포 시점의 기본값 기준"으로 한다.

### [CRITICAL]

- **C-1. /actuator/prometheus 인증 없이 공개 + 8080 인터넷 개방**
  - deploy/docker-compose.yml:178, backend/src/main/resources/application.yml:68,85
  - 운영 EC2 SG가 app-sg 8080 = 0.0.0.0/0이면 이 PR 배포 즉시 http://ghworld.co:8080/actuator/prometheus가 공개된다.
  - 아래 공격 시나리오 섹션 참조.

- **C-2. Grafana 기본 비밀번호 changeme 하드코딩 fallback**
  - monitoring/docker-compose.yml:55 — ${GRAFANA_ADMIN_PASSWORD:-changeme}
  - .env 없이 docker compose up 실행되면 admin/changeme 로그인 가능. 3001 SG /32 전제가 깨지는 순간 admin takeover.
  - 권장: ${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD must be set} 형태로 강제.

### [HIGH]

- **H-1. monitoring 스택은 SG-as-code 없이 "3001=My IP /32" 구성이 런타임에서만 강제됨**
  - monitoring/docker-compose.yml:50 — "3001:3000" (bind IP 미지정 → 0.0.0.0:3001)
  - 9090은 127.0.0.1:9090으로 묶여 있는데 Grafana는 0.0.0.0:3001. SG 잠금이 유일 방어선.
  - Cloudflare Tunnel / nginx basic_auth / SSM port-forward로 변경 권장.

- **H-2. Prometheus → Backend scrape 경로에 인증 부재 (다중 방어선 미비)**
  - monitoring/prometheus/prometheus.yml:15-20
  - 단일 AWS SG 층에만 의존. 권장: Actuator 전용 별도 포트(management.server.port) + 그 포트만 monitor-sg source.

- **H-3. APP_PORT:-8080 바인드 IP 미지정 — 프로덕션에서 0.0.0.0:8080 노출**
  - deploy/docker-compose.yml:149
  - 권장: ports: - "127.0.0.1:${APP_PORT:-8080}:8080" + PUBLIC_API_URL=https://ghworld.co.

### [MEDIUM]

- M-1. Grafana 외부 트래픽 최소화: GF_ANALYTICS_CHECK_FOR_UPDATES=false, GF_ANALYTICS_REPORTING_ENABLED=false 추가 권장 (monitoring/docker-compose.yml:60)
- M-2. Prometheus --web.enable-lifecycle 활성화: 127.0.0.1 바인딩이라 현재 OK. 모니터 EC2 단독 인스턴스라면 수용 가능.
- M-3. Grafana admin 계정 "admin" 하드코딩: GF_SECURITY_ADMIN_USER도 require 권장.
- M-4. grafana-data 볼륨 권한: named volume 사용 중 → UID 472 충돌 없음. 수용 가능.
- M-5. scrape_target private IP 하드코딩 172.31.45.140: EC2 재시작 시 재할당 가능. EC2 태그 기반 SD 권장.

### [LOW]

- L-1. .env.example placeholder가 실수로 기동되는 것 방지 구조 부재 → C-2와 동일한 ${VAR:?msg} 패턴으로 해결.
- L-2. /actuator/info 포함 — git.commit.id/build.version 노출 우려. 현재 info 설정 없음 → 실제 위험 낮음.

### LGTM

- CSRF STATELESS 정확히 비활성화 (SecurityConfig.java:39)
- CORS allowedOrigins는 env에서 구체적 도메인으로 주입, "*" 미사용 (SecurityConfig.java:58)
- .env gitignore 체계 완비: 루트 .gitignore:14의 .env 패턴이 deploy/.env, monitoring/.env 모두 커버 (git check-ignore 확인)
- 커밋된 .env 파일 없음 (git ls-files 확인)
- GF_AUTH_ANONYMOUS_ENABLED=false, GF_USERS_ALLOW_SIGN_UP=false 명시적 차단 (monitoring/docker-compose.yml:57-58)
- Prometheus UI 127.0.0.1:9090 바인딩 — 외부 노출 차단 (monitoring/docker-compose.yml:24)
- JWT filter 주입 구조 유지, 기존 공개 경로 변경 없음

## /actuator/prometheus 공개 시 공격 시나리오

### 시나리오 A — 운영 정찰 (Reconnaissance)

- jvm_memory_used_bytes, jvm_gc_pause_seconds → JVM 벤더/버전 특정 → Java/Spring CVE 매칭
- process_start_time_seconds → 배포 빈도, 재시작 패턴 → DoS 타이밍
- http_server_requests_seconds_count{uri=...} → 모든 엔드포인트 URL이 label로 노출. /api/v1/admin 같은 내부 API 경로 디스커버리.
- tomcat_threads_busy, hikaricp_connections_active → 포화도 실시간 공개
- spring_security_authentications_count{result="failure"} 존재 시 brute force 성공 여부 실시간 피드백

### 시나리오 B — 사이드채널

- /api/v1/auth/login 카운터 증가 시점으로 활성 사용자 타이밍 추적
- hikaricp_connections_timeout_total 증가 시점 = DB 과부하 타이밍 → DoS 증폭
- STOMP 메시지 전송량 커스텀 메트릭 존재 시 유저 활동 패턴 추적

### 시나리오 C — DoS 증폭

- /actuator/prometheus 응답은 수 KB~수백 KB. 인증 없으면 초당 수천 회 요청으로 gauge/counter 전체 직렬화 강제 → CPU 소모 DoS.

### 시나리오 D — 정보 재판별

- jvm_buffer_total_capacity_bytes, process_cpu_usage 장기 수집 → 타이밍 부채널 연구 매료. 실무 위험 낮음.

### 현재 구성에서 실제 발생 가능한가?

**요약: 이 PR이 그대로 운영에 반영되고 app-sg 8080이 0.0.0.0/0이면 YES. 전면 공격 가능.**

레포만 보고 판단할 수 있는 팩트:

1. SECURITY_ENV_PUBLIC_PATHS 기본값이 /actuator/** → Spring Security가 /actuator/prometheus를 permitAll
2. ACTUATOR_ENDPOINTS 기본값이 health,info,metrics,prometheus → /actuator/prometheus가 실제 응답
3. ports: "${APP_PORT:-8080}:8080" → 호스트 0.0.0.0:8080 바인딩
4. 과거 기록(learning/35): app-sg 8080 = 0.0.0.0/0로 배포된 적 있음
5. nginx는 /api/*, /ws만 프록시 (learning/35:285-288) → 8080 퍼블릭 접근 여부가 결정적

실제 발생 가능 여부는 현재 app-sg의 8080 inbound 규칙에 전적으로 달려 있다. "monitor-sg only"가 AWS 콘솔에서 실제로 반영됐는지가 유일한 차단 요소. 레포에는 증거가 없다.

### 방어 우선순위

1. (즉시) app-sg의 8080 inbound가 source=monitor-sg only인지 AWS 콘솔에서 확인
2. (즉시) deploy/docker-compose.yml:149에서 127.0.0.1:${APP_PORT:-8080}:8080 바인딩으로 변경 (nginx가 같은 호스트에서 127.0.0.1:8080 프록시 가능)
3. (중기) Actuator 경로를 별도 management.server.port로 분리 + /actuator/prometheus만 인증 요구
4. (중기) Prometheus scrape에 bearer token 또는 basic_auth 추가 (다중 방어선)
5. (조직) SG를 Terraform/CloudFormation으로 관리해 코드 리뷰에서 검증 가능하게


---

## Appendix: Codex CLI 원문

```
  77: # ?댁쁺: root=WARN, app=INFO 沅뚯옣
  78: # LOG_LEVEL_ROOT=INFO
  79: # LOG_LEVEL_APP=DEBUG
  80: 
  81: # ??????????????????????????????????????????
  82: # JVM 硫붾え由??쒕떇 (EC2 t3.medium 4GB ???
  83: # ??????????????????????????????????????????
  84: # 濡쒖뺄 湲곕낯: -Xmx384m -Xms256m
  85: # ?댁쁺(4GB ?쒕쾭): ?꾨옒 媛?沅뚯옣
  86: # CASSANDRA_MAX_HEAP=512M
  87: # CASSANDRA_HEAP_NEW=100M
  88: # KAFKA_HEAP_OPTS=-Xmx256m -Xms128m
  89: # JAVA_TOOL_OPTIONS=-Xmx256m -Xms128m
  90: 



exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$f='"'backend/src/main/java/com/maeum/gohyang/identity/adapter/in/security/SecurityProperties.java'; "'$i=1; Get-Content $f | ForEach-Object { '"'{0,4}: {1}' -f "'$i,$_; $i++ }' in C:\Users\zkzkz\IdeaProjects\ChatAppProject
 succeeded in 500ms:
   1: package com.maeum.gohyang.identity.adapter.in.security;
   2: 
   3: import java.util.List;
   4: import java.util.stream.Stream;
   5: 
   6: import org.springframework.boot.context.properties.ConfigurationProperties;
   7: 
   8: /**
   9:  * Security ?덉슜 寃쎈줈 ?ㅼ젙.
  10:  * - commonPublicPaths: 湲곕낯 ?덉슜 寃쎈줈 (application.yml 湲곕낯媛?+ SECURITY_COMMON_PUBLIC_PATHS env濡??ㅻ쾭?쇱씠??
  11:  * - envPublicPaths: ?섍꼍蹂꾨줈 異붽??섎뒗 寃쎈줈 (application.yml 湲곕낯媛?+ SECURITY_ENV_PUBLIC_PATHS env濡??ㅻ쾭?쇱씠??
  12:  *
  13:  * ??由ъ뒪??紐⑤몢 肄ㅻ쭏 援щ텇 臾몄옄?댁쓣 env濡?二쇱엯?섎㈃ Spring??List&lt;String&gt;?쇰줈 ?먮룞 諛붿씤?⑺븳??
  14:  * ?ㅻ? 遺꾨━???댁쑀: Spring Boot??由ъ뒪???꾨줈?쇳떚瑜?蹂묓빀?섏? ?딄퀬 ??뼱?곕?濡?怨듯넻 + ?섍꼍蹂?遺꾨━ ??肄붾뱶?먯꽌 ?⑹튇??
  15:  */
  16: @ConfigurationProperties(prefix = "security")
  17: public record SecurityProperties(
  18:         List<String> commonPublicPaths,
  19:         List<String> envPublicPaths
  20: ) {
  21:     public SecurityProperties {
  22:         if (commonPublicPaths == null) {
  23:             commonPublicPaths = List.of();
  24:         }
  25:         if (envPublicPaths == null) {
  26:             envPublicPaths = List.of();
  27:         }
  28:     }
  29: 
  30:     public String[] allPublicPaths() {
  31:         return Stream.concat(commonPublicPaths.stream(), envPublicPaths.stream())
  32:                 .toArray(String[]::new);
  33:     }
  34: }

codex
The patch enables unauthenticated Prometheus actuator scraping by default and relies on external Security Group configuration that is not enforced in this repository. If app-sg truly limits 8080 to monitor-sg and Grafana 3001 to My IP /32, Internet exploitation is unlikely; otherwise `/actuator/prometheus` can be used for operational reconnaissance and side-channel monitoring.

Full review comments:

- [P1] Require auth before exposing Prometheus actuator metrics — C:\Users\zkzkz\IdeaProjects\ChatAppProject\deploy\docker-compose.yml:178-178
  With the default compose values, this adds `prometheus` to `ACTUATOR_ENDPOINTS` while `SECURITY_ENV_PUBLIC_PATHS` still defaults to `/actuator/**` and the app publishes `8080` on all interfaces. If the production EC2 app-sg still allows 8080 from the Internet, unauthenticated users can fetch `/actuator/prometheus` and infer JVM memory/GC, request rates/statuses/URIs, DB pool saturation, and service labels for reconnaissance or side-channel timing; I do not see SG-as-code here, so the claim that the monitor SG blocks this is 추정 rather than enforced by this patch.

- [P1] Remove the usable default Grafana admin password — C:\Users\zkzkz\IdeaProjects\ChatAppProject\monitoring\docker-compose.yml:54-54
  Grafana can start without a `.env` file and will then expose the admin account with the predictable password `changeme` on port 3001. If the monitoring EC2 security group is ever left at `0.0.0.0/0` or broader than the intended My IP /32, this becomes an immediate admin takeover of Grafana and access to Prometheus-backed operational data.

- [P2] Add authentication to the Prometheus scrape target — C:\Users\zkzkz\IdeaProjects\ChatAppProject\monitoring\prometheus\prometheus.yml:15-20
  The production scrape target calls `/actuator/prometheus` without `basic_auth` or any equivalent credential, so the backend must keep that actuator path public for monitoring to work. If the app security group/nginx rule is misconfigured or temporarily opened, the same unauthenticated metrics endpoint becomes reachable outside the monitor host; adding scrape credentials would make SG restrictions defense-in-depth instead of the only control.
The patch enables unauthenticated Prometheus actuator scraping by default and relies on external Security Group configuration that is not enforced in this repository. If app-sg truly limits 8080 to monitor-sg and Grafana 3001 to My IP /32, Internet exploitation is unlikely; otherwise `/actuator/prometheus` can be used for operational reconnaissance and side-channel monitoring.

Full review comments:

- [P1] Require auth before exposing Prometheus actuator metrics — C:\Users\zkzkz\IdeaProjects\ChatAppProject\deploy\docker-compose.yml:178-178
  With the default compose values, this adds `prometheus` to `ACTUATOR_ENDPOINTS` while `SECURITY_ENV_PUBLIC_PATHS` still defaults to `/actuator/**` and the app publishes `8080` on all interfaces. If the production EC2 app-sg still allows 8080 from the Internet, unauthenticated users can fetch `/actuator/prometheus` and infer JVM memory/GC, request rates/statuses/URIs, DB pool saturation, and service labels for reconnaissance or side-channel timing; I do not see SG-as-code here, so the claim that the monitor SG blocks this is 추정 rather than enforced by this patch.

- [P1] Remove the usable default Grafana admin password — C:\Users\zkzkz\IdeaProjects\ChatAppProject\monitoring\docker-compose.yml:54-54
  Grafana can start without a `.env` file and will then expose the admin account with the predictable password `changeme` on port 3001. If the monitoring EC2 security group is ever left at `0.0.0.0/0` or broader than the intended My IP /32, this becomes an immediate admin takeover of Grafana and access to Prometheus-backed operational data.

- [P2] Add authentication to the Prometheus scrape target — C:\Users\zkzkz\IdeaProjects\ChatAppProject\monitoring\prometheus\prometheus.yml:15-20
  The production scrape target calls `/actuator/prometheus` without `basic_auth` or any equivalent credential, so the backend must keep that actuator path public for monitoring to work. If the app security group/nginx rule is misconfigured or temporarily opened, the same unauthenticated metrics endpoint becomes reachable outside the monitor host; adding scrape credentials would make SG restrictions defense-in-depth instead of the only control.

```
