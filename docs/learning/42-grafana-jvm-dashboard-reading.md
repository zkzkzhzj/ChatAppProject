# 42. Grafana JVM Micrometer 4701 대시보드 읽는 법 — 부하 테스트 관점

> 작성 시점: 2026-04-22
> 맥락: Week 7 Step C(부하 테스트) 실행 중 4701 대시보드를 펼쳤더니 50+ 패널이 쏟아져 나옴.
> "뭘 보고 뭘 숨기고 어떻게 내 눈에 맞게 다듬을 것인가"를 정리. 다음 부하 테스트 때 5분 안에 관측 환경을 재구성할 수 있도록.
> 관련 학습노트: [40. 관측성 스택 도입기](./40-observability-stack-decisions.md),
> [41. k6 사용법·설계 학습노트](./41-k6-load-testing-setup.md)
> 실행 기록: [2026-04-22 부하 테스트 리포트](../reports/load-test-2026-04-22.md)

---

## 1. 배경 — 왜 이 문서인가

### 50+ 패널의 역설

Grafana 공식 ID **4701 (JVM (Micrometer))** 대시보드는 JVM 관측의 사실상 표준이다. Actuator + `micrometer-registry-prometheus`만 붙이면 10분 안에 "모든 JVM 메트릭이 그려진" 화면을 받을 수 있다.

문제는 그 "모든"이 너무 많다는 것. 첫 로드 시 **8개 섹션 · 30~50+ 패널**이 스크롤되는데, 부하 테스트 중엔:

- 패널이 많을수록 **브라우저가 무거워진다** (Chrome 메모리 1GB+ 쉽게 넘김)
- 어떤 게 신호이고 어떤 게 노이즈인지 **눈이 헤맨다**
- 동료에게 "여기 봐"라고 가리키기 어렵다 (스크롤 위치가 공유되지 않음)

관측의 본질적 원칙을 다시 쓴다.

> **"모든 걸 다 보는 건 아무것도 안 보는 것과 같다."**

Datadog이든 Prometheus든, 대시보드 설계의 첫 단계는 "안 보는 것을 정하는 것"이다.

### Week 7 Step C에서 실제로 벌어진 일

VU 500 ramping 중 Heap 그래프가 이렇게 움직였다.

```text
t=0m    Heap 22%   (idle baseline)
t=2m    Heap 42%   (VU 200 도달, SEND 폭주)
t=3m    Heap 23%   (급격 회복)
```

부하가 계속 증가하는데 Heap이 **줄었다**. 교과서대로라면 이상한 패턴이다. 그런데 사용자가 바로 짚어냈다.

> "이거 Kafka consumer가 뒤에서 밀린 메시지를 일괄 소비하면서 잡고 있던 `List<OutboxRecord>` 참조를 놓아서 G1이 다음 Mixed GC에 한꺼번에 회수한 거 아냐?"

정답이었다. `jvm_gc_pause_seconds_count{action="end of minor GC"}` 패널에서 같은 시각 Mixed GC가 두 번 연속 돌았고, `kafka_consumer_records_lag_max`는 3m 직전에 급감했다. **세 개 패널을 한 화면에 놓고 시각을 맞추니 인과가 나왔다.**

이 경험이 이 문서의 동기다. "Grafana가 숫자를 보여주는 것"과 "사람이 시스템을 이해하는 것"은 다르다. 대시보드는 **질문이 먼저**고 패널은 그 질문을 위해 배치되어야 한다.

---

## 2. 4701 대시보드 구성 개요

4701이 기본으로 제공하는 섹션과 각각의 출처 메트릭 계열.

| 섹션 | 패널 수 | 주요 메트릭 소스 |
|------|--------|----------------|
| **Quick Facts** | 4~5 | `jvm_memory_used_bytes`, `process_uptime_seconds`, `process_start_time_seconds` |
| **I/O Overview** | 3~4 | `http_server_requests_seconds_count/_sum`, `logback_events_total` |
| **JVM Memory** | 2~3 | `jvm_memory_used_bytes`, `jvm_memory_max_bytes`, `process_memory_*` |
| **JVM Misc** | 6~8 | `system_cpu_usage`, `process_cpu_usage`, `jvm_threads_live`, `jvm_threads_states`, `jvm_gc_overhead`, `logback_events_total` |
| **JVM Memory Pools (Heap)** | 3~4 | `jvm_memory_used_bytes{area="heap",id="..."}` (Eden / Survivor / Old Gen) |
| **JVM Memory Pools (Non-Heap)** | 3~4 | `jvm_memory_used_bytes{area="nonheap",id="..."}` (Metaspace / Compressed Class Space / CodeHeap *) |
| **Garbage Collection** | 3~4 | `jvm_gc_pause_seconds_*`, `jvm_gc_memory_allocated_bytes_total`, `jvm_gc_memory_promoted_bytes_total` |
| **Classloading** | 2 | `jvm_classes_loaded_classes`, `jvm_classes_unloaded_classes_total` |
| **Buffer Pools** | 3 | `jvm_buffer_count_buffers`, `jvm_buffer_memory_used_bytes`, `jvm_buffer_total_capacity_bytes` |

출처는 전부 Micrometer `JvmMemoryMetrics`, `JvmGcMetrics`, `JvmThreadMetrics`, `ProcessorMetrics`, `UptimeMetrics`, `ClassLoaderMetrics` binder들. Spring Boot가 기본 활성화한다.

> Micrometer가 노출하는 메트릭 전부를 보고 싶으면 운영 EC2에서 `curl localhost:8080/actuator/prometheus | grep "^# HELP"` 로 한 번에 훑을 수 있다. "이게 진짜 다야?"를 확인하는 데 5분이면 충분.

---

## 3. KEEP / 조건부 / HIDE 분류

부하 테스트 관점에서 내 기준을 명시적으로 적는다. 이 분류가 이 문서의 핵심이다.

### 3.1 KEEP — 항상 본다 (11개)

| # | 섹션 | 패널 | 왜 보는가 |
|---|------|------|----------|
| 1 | Quick Facts | **Heap used** | 부하가 메모리에 얼마나 찍히는지 가장 먼저 보는 단일 숫자 |
| 2 | I/O Overview | **Rate** | 초당 요청 수. 부하가 실제로 서버에 도착했는지 확인 |
| 3 | I/O Overview | **Duration** | p95/p99 latency. SLO 위반 지점 포착 |
| 4 | I/O Overview | **Errors** | 5xx 발생 타이밍. 임계점 신호 |
| 5 | JVM Memory | **JVM Heap (시계열)** | Quick Facts의 "현재값"을 시계열로 본다. 추세가 진짜 정보 |
| 6 | JVM Misc | **CPU Usage (process)** | 서버 포화 여부. 80% 지속이면 latency 튀기 시작 |
| 7 | JVM Misc | **Threads (live)** | 스레드 폭주 감지. Tomcat worker + 비동기 커스텀 스레드풀 합산 |
| 8 | JVM Misc | **Thread States** | RUNNABLE vs BLOCKED 비율. 락 경합 시그니처 |
| 9 | JVM Misc | **GC Pressure** | `jvm_gc_overhead` — GC가 CPU 시간을 얼마나 잡아먹는가. 5% 이상이면 GC 튜닝 필요 |
| 10 | JVM Misc | **Log Events (ERROR/WARN)** | 에러 로그 급증은 다른 어떤 메트릭보다 빠른 경보 |
| 11 | GC | **Pause Durations (p99)** | 단일 GC 멈춤 시간. STW 200ms+ 떴다면 사용자 UX에 찍힘 |

추가 1개 선택 KEEP:

| + | Memory Pools Heap | **G1 Old Gen** | Eden/Survivor는 부하 테스트에서 숨겨도 되지만, Old Gen만큼은 "장기 객체가 쌓이는가"의 직접 증거 |

### 3.2 조건부 — 상황 따라 편다 (5개)

| 패널 | 어떤 상황에서 펴는가 |
|------|--------------------|
| JVM Non-Heap | Heap은 정상인데 Process Memory가 튀는 경우. 네이티브 누수 의심 시 |
| Metaspace | ClassLoader leak 의심 시. 평소엔 flat이라 볼 필요 없음 |
| File Descriptors | `Too many open files` 에러가 로그에 뜰 때. 한계값(ulimit) 대비 사용률 확인 |
| GC Allocated / Promoted | Young→Old 승격이 비정상으로 많으면 Heap 튜닝 필요 (XX:MaxGCPauseMillis, G1NewSizePercent) |
| System Load (1m/5m) | EC2 호스트 자체 부하. 컨테이너 스케줄링/이웃 프로세스 영향 의심 시 |

### 3.3 HIDE — 기본 숨김 (10+개)

| 패널 | 왜 숨기는가 |
|------|------------|
| Uptime · Start time | "언제 재시작했나"는 배포 이력 / SSM 로그에서 본다. 부하 테스트 중엔 잡음 |
| JVM Total / Process Memory | Heap + Non-Heap 합계. 둘을 따로 보는 게 더 유용 |
| G1 Eden | 매우 빠르게 출렁임 → 그래프가 톱니. 정보 밀도 낮음 |
| G1 Survivor | Eden과 동일 사유 |
| Compressed Class Space | 정적인 값. 거의 안 변함 |
| CodeHeap 'non-nmethods' / 'profiled nmethods' / 'non-profiled nmethods' | JIT 내부 상태. 튜닝 목적 아니면 무의미 |
| Classes loaded / delta | 런타임에 거의 고정. Metaspace 의심 시에만 참고 |
| Buffer Pools (direct / mapped / 3종) | NIO 직접 메모리. WebSocket/Netty 누수 의심 시만 펼침 |
| I/O Utilisation | 대부분 0 근처에 깔림. Tomcat에선 거의 안 쓰는 섹션 |

**결과**: 50+ → 11개(+1) 로 줄이면 한 화면에 모두 담긴다. 스크롤 없이 부하 테스트를 지켜볼 수 있다.

---

## 4. 각 핵심 지표 읽는 법 (KEEP 11개 + 1)

각 패널에 대해: **메트릭 이름 / idle 정상 범위 / 부하 중 위험선 / 연관 패널**.

### 4.1 Heap Used (Quick Facts)

- **메트릭**: `jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}`
- **idle 정상**: 15~30% (Spring Context 로딩 + idle connection pool)
- **위험선**: **지속 80%+** = OOM 임박. 단발성 스파이크(60~70%)는 정상 GC 주기
- **연관**: G1 Old Gen (장기 객체 축적?), GC Pause (Full GC 유발?)
- **주의**: 절대값보다 **추세**가 중요. 평탄하게 80%는 OK, 우상향 80%는 위험

### 4.2 HTTP Rate (I/O Overview)

- **메트릭**: `rate(http_server_requests_seconds_count[1m])`
- **idle 정상**: healthcheck 주기에 따라 0.1~1 req/s
- **위험선**: 없음 (이건 원인이 아니라 "부하가 도착했다"는 확인)
- **연관**: Duration (부하에 비례해 지연 커지나?), CPU (처리 가능한가?)

### 4.3 HTTP Duration p95/p99 (I/O Overview)

- **메트릭**: `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[1m])) by (le))`
- **idle 정상**: p95 < 50ms (단순 REST 기준)
- **위험선**:
  - p95 > 500ms: UX상 "느리다" 체감 시작
  - p99 > 1s: SLO 위반 구간, 유저 이탈 시작
- **연관**: CPU Usage, GC Pause, DB connection pool wait
- **주의**: histogram의 버킷 해상도를 넘는 정밀도는 안 나온다. Spring의 기본 버킷은 `[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` (초 단위). p95가 500ms 근처면 0.5s 버킷이 경계 → 실제는 400~800ms 사이 어디쯤

### 4.4 HTTP Errors (I/O Overview)

- **메트릭**: `rate(http_server_requests_seconds_count{status=~"5.."}[1m])`
- **idle 정상**: 0 (5xx가 평소에 있으면 그게 문제)
- **위험선**: **단 1 req/s도 주의**. 5xx는 "정상 동작 범위를 넘었다"는 서버의 고백
- **연관**: Log Events (ERROR 급증과 시각 일치?), Thread States (스레드풀 포화?)

### 4.5 JVM Heap 시계열 (JVM Memory)

Quick Facts의 현재값과 **같은 메트릭**이지만 시계열로 본다. 둘 다 KEEP인 이유:

- Quick Facts: "지금 얼마?" — 한눈에
- JVM Memory: "어떻게 움직였나?" — 추세·주기
- Week 7 Step C의 22→42→23 같은 패턴은 시계열에서만 보인다

### 4.6 CPU Usage Process (JVM Misc)

- **메트릭**: `process_cpu_usage`
- **idle 정상**: 0.5~3% (healthcheck + background tasks)
- **위험선**:
  - 60~70%: 부하 증가 시 latency 튀기 시작
  - **80%+ 지속**: 스로틀링 구간. 요청이 큐에 쌓이기 시작
- **연관**: HTTP Duration (같이 튀면 CPU 바운드 확정), Thread States (RUNNABLE 수 대비 코어 수)
- **주의**: `system_cpu_usage` (호스트 전체)와 다름. 컨테이너 내 JVM 프로세스만

### 4.7 Threads Live (JVM Misc)

- **메트릭**: `jvm_threads_live_threads`
- **idle 정상**: 30~50 (Spring Boot 기본 + Tomcat NIO)
- **위험선**: **기대치를 넘는 수**. Tomcat `max-threads: 200` 인데 살아있는 스레드가 300이면 커스텀 스레드풀이 누수 중
- **연관**: Thread States (어떤 상태에서 살아있나?), CPU (컨텍스트 스위칭 과다?)

### 4.8 Thread States (JVM Misc)

- **메트릭**: `jvm_threads_states_threads{state="..."}`
- **idle 정상**: 대부분 WAITING/TIMED_WAITING (idle worker)
- **위험선**:
  - **BLOCKED 급증**: 락 경합. `synchronized`나 DB row lock 후보
  - **RUNNABLE > 코어 수 × 2**: CPU 바운드 확정, 컨텍스트 스위칭 오버헤드
- **연관**: CPU, HTTP Duration
- **부하 테스트 팁**: VU 500에서 BLOCKED가 50+ 뜨면 동시성 설계 재검토 필요

### 4.9 GC Pressure (JVM Misc)

- **메트릭**: `jvm_gc_overhead` (Micrometer 1.10+)
- **정의**: 최근 시간 창 안에서 **GC에 쓴 CPU 시간 비율** (0.0 ~ 1.0)
- **idle 정상**: < 0.01 (1%)
- **위험선**:
  - 0.05 (5%): GC가 CPU를 체감 수준으로 소비
  - **0.1+ (10%)**: 애플리케이션이 GC에 발목 잡힌 상태. Heap 튜닝 or 메모리 누수 의심
- **연관**: GC Pause Durations, Heap Used, Old Gen

### 4.10 Log Events ERROR/WARN (JVM Misc)

- **메트릭**: `rate(logback_events_total{level="error"}[1m])`
- **idle 정상**: 0
- **위험선**: 0 초과면 무조건 로그 확인. 한 개라도 있으면 원인 파악 전까지 다음 단계 넘어가지 않음
- **연관**: HTTP Errors (같은 시각?), Thread States
- **팁**: 가장 빠른 이상 감지 채널. 메트릭 집계 주기보다 로그가 먼저 뜬다

### 4.11 GC Pause Durations p99 (Garbage Collection)

- **메트릭**: `histogram_quantile(0.99, sum(rate(jvm_gc_pause_seconds_bucket[1m])) by (le, action))`
- **idle 정상**: G1 Young GC < 50ms
- **위험선**:
  - **p99 > 200ms**: 사용자 p99 latency에 그대로 얹힘
  - **Full GC / Concurrent Mark 단발 > 1s**: 치명적, 재현 조건 파악 필수
- **연관**: Heap Used (직전 증가?), Old Gen (promotion 과다?), HTTP Duration (같은 시각 튐?)
- **주의**: `action` 라벨로 분리해서 봐야 함. "end of minor GC" vs "end of major GC"는 의미가 완전히 다름

### 4.12 G1 Old Gen (Memory Pools Heap) — 조건부에서 승격

- **메트릭**: `jvm_memory_used_bytes{id="G1 Old Gen"}`
- **idle 정상**: 전체 Heap의 10~20%
- **위험선**:
  - **우상향이 멈추지 않음**: 메모리 누수 거의 확정
  - Mixed GC 후에도 회수 안 됨: 장기 참조 존재
- **연관**: Heap Used, GC Pause, GC Promoted
- **왜 별도로 보나**: Young Gen은 출렁여도 괜찮은데 Old Gen만큼은 "새는지"의 직접 증거. Heap Used는 Young과 Old가 합쳐진 총합이라 누수 신호를 가릴 수 있다

---

## 5. 대시보드 커스터마이즈 — 세 가지 패턴

4701을 그대로 쓸지 바꿀지, 바꾼다면 어떻게 바꿀지. 패턴 A, B, C 각각의 장단.

### 5.1 패턴 A — 원본 Save As → 불필요 패널 Remove

**방법**:

1. 4701 대시보드 우상단 `Save dashboard` → `Save as...`
2. 새 이름 `JVM Micrometer (Loadtest Trim)` 로 저장
3. 편집 모드 → 각 패널 `...` → `Remove`
4. 다시 저장

**장점**: 원본과 완전히 분리. 실수해도 4701은 그대로.
**단점**: 4701이 업데이트되면 혜택 못 받음. 수동 재동기화 필요.

### 5.2 패턴 B — Row로 그룹화 (collapse 운영)

**방법**:

1. 편집 모드에서 `Add row`
2. HIDE 분류에 해당하는 패널들을 `CodeHeap`, `Buffer Pools` 같은 row 아래로 드래그
3. row를 **기본 collapse 상태**로 저장
4. 필요할 때만 row 헤더 클릭해서 펼침

**장점**: 원본 정보 유지. 나중에 "Classloading 한 번 볼까" 했을 때 바로 접근.
**단점**: row 접어도 내부 패널이 시리즈 구독은 유지 → 브라우저 메모리 절감 효과는 제한적. 크롬 프로세스 무게 큰 차이 없음.

### 5.3 패턴 C — 부하 테스트 전용 대시보드 신설 ★ 추천

**방법**:

1. Grafana 홈 → `Create` → `New dashboard`
2. KEEP 11개를 PromQL로 직접 작성하여 추가
3. 이름: `Loadtest — JVM Snapshot`
4. URL 고정 (북마크)

**장점**:

- **질문 기반 배치** 가능 (아래 6절 참고). "Heap %" → "HTTP Rate" → "HTTP p95" → "GC Pause" 순서로 위에서 아래 **인과 순서**로 배치
- 브라우저 가벼움 (패널 11개만 렌더)
- 공유 용이 (팀원에게 "이거 하나만 보면 돼" 가능)
- 부하 테스트 외 상황에서 4701 원본은 그대로 유지

**단점**: 초기 작성 비용 30분~1시간. PromQL을 한 번씩 직접 써봐야 함.

**하지만 이 단점이 곧 학습**이다. PromQL을 직접 써보지 않으면 "이 숫자가 어떻게 나오는지"를 끝까지 모른다.

**결론**: Step C 본격 실행 전에 패턴 C로 전용 대시보드 만들고, 본 테스트는 거기서 본다. 사후 분석은 4701 원본도 병행 참조.

---

## 6. 부하 테스트 전용 대시보드 구성안 (PromQL 실전)

6개 패널만으로 부하 테스트 동안 벌어지는 일 대부분 설명된다. 각 쿼리의 **왜 이 식**인지 해설 포함.

### 6.1 Heap % (Stat 또는 Time series)

```promql
(jvm_memory_used_bytes{area="heap"} /
 jvm_memory_max_bytes{area="heap"}) * 100
```

- `area="heap"` 필터로 Non-Heap 제외
- 나눗셈으로 절대 바이트 → 퍼센트 정규화 (Heap 사이즈 바뀌어도 동일 기준으로 비교)
- `sum by(instance)` 안 붙임: 단일 인스턴스 전제. 멀티 인스턴스면 `sum() by(instance)` 필요

### 6.2 HTTP Rate (Time series)

```promql
sum(rate(http_server_requests_seconds_count[1m])) by (status)
```

- `rate[1m]`: **1분 윈도우**. 왜 1분?
  - 너무 짧으면 (15s): 스파이크 과민, 노이즈
  - 너무 길면 (5m): 변화 뒤늦게 보임
  - 부하 테스트의 stage 변경 주기(보통 1~3분)와 맞춘다
- `sum by (status)`: 2xx / 4xx / 5xx 스택 시각화. 에러가 시작되는 순간이 보인다

### 6.3 HTTP p95 Latency (Time series)

```promql
histogram_quantile(0.95,
  sum(rate(http_server_requests_seconds_bucket[1m])) by (le, uri)
)
```

- `histogram_quantile`: Prometheus histogram type의 bucket으로부터 백분위수 추정
- 동작 원리:
  - `http_server_requests_seconds_bucket` 은 "이 threshold(le) 이하 응답 수" 카운터들
  - `rate()`로 최근 1m 요청 분포 계산
  - quantile(0.95)가 "요청의 95%가 들어가는 가장 작은 le 버킷"을 보간
- `by (le, uri)`: URI별로 분리. 어느 엔드포인트가 느려지는지 특정
- **주의**: bucket 해상도 한계. p95가 250ms~500ms 구간이면 실제값은 그 사이 어디쯤, 정확 숫자는 신뢰 못 함

### 6.4 GC Pause p99 (Time series, action 분리)

```promql
histogram_quantile(0.99,
  sum(rate(jvm_gc_pause_seconds_bucket[1m])) by (le, action, cause)
)
```

- `action`: "end of minor GC" vs "end of major GC" 구분
- `cause`: "G1 Evacuation Pause", "G1 Humongous Allocation", "System.gc()" 등 GC 발생 원인
- p99 선택: 평균이나 p50은 의미 없음. 사용자는 가장 나쁜 케이스를 기억한다

### 6.5 CPU Process (Gauge)

```promql
process_cpu_usage * 100
```

- Gauge 타입 패널로 설정하고 threshold:
  - 0~60 녹색
  - 60~80 노랑
  - 80~100 빨강
- 숫자 하나에 "지금 안전/위험"이 즉시 보임

### 6.6 Threads Live + RUNNABLE (Time series)

```promql
jvm_threads_live_threads
jvm_threads_states_threads{state="runnable"}
```

- 두 쿼리를 같은 패널에
- Live 대비 RUNNABLE 비율이 부하 강도의 스냅샷
- RUNNABLE이 코어 수 × 2 넘어가면 컨텍스트 스위칭 오버헤드 + CPU 포화

---

## 7. 패널 시각화 타입 선택

같은 데이터도 시각화 타입에 따라 정보 전달력이 달라진다.

| 시각화 | 적합한 데이터 | 이 프로젝트 사용 예 |
|--------|-------------|-------------------|
| **Stat** | 단일 현재값 + 최근 변화 sparkline | Heap % 현재값 |
| **Gauge** | 범위·임계값이 중요한 현재값 | CPU 사용률 (60/80/100 threshold) |
| **Time series** | 추이, 여러 계열 비교 | 대부분의 시계열 (Rate, Latency, Threads) |
| **Bar gauge** | 여러 레이블의 현재값 비교 | URI별 p95 스냅샷 |
| **Heatmap** | histogram의 시간별 분포 | `http_server_requests_seconds_bucket` 전체 분포 |
| **Table** | 이산 값 목록, 정렬·필터 | 현재 연결된 WebSocket 세션 리스트 |
| **Logs** (Loki) | 시계열 로그 | (이번 단계 미도입) |

### 유용한 설정 팁

- **패널 타이틀 링크**: Panel → Edit → Links → "Open runbook" 식으로 해당 지표 이상 시 대응 문서 링크 박기. 새벽 3시 알람에서 생명을 구함
- **Threshold 색상 구역**: Time series 패널도 Override → Thresholds로 임계값 라인 + 색 영역 가능. p95 500ms를 빨간 라인으로 그어두면 한눈에
- **Mapping (value → text)**: status 코드 2xx/4xx/5xx 같은 건 Field → Value mappings로 "Success/Client Error/Server Error" 텍스트 매핑하면 공유 시 가독성 ↑

---

## 8. 캡처·공유 워크플로우

부하 테스트 결과 리포트에 Grafana 스냅샷을 붙이는 건 필수다. 매번 어떻게 할지 정해두면 10분 절약.

### 8.1 Time range 원칙

- 부하 테스트 **실행 중**: `Last 15m` + auto-refresh `5s`
- **종료 직후 관찰**: `Last 30m` + auto-refresh `off` (계속 갱신되면 분석 어려움)
- **리포트 작성용**: 정확한 절대 시각 고정 (`2026-04-22 03:55:00` to `2026-04-22 04:05:00`)

absolute time range는 공유 URL에 포함되므로 링크만 보내도 동료가 같은 그림을 본다.

### 8.2 단일 패널 풀스크린

```text
https://monitor.ghworld.co/d/<dashboard-uid>/<dashboard-slug>?orgId=1&viewPanel=<panel-id>
```

- `viewPanel` 쿼리 파라미터에 패널 ID를 넣으면 그 패널만 풀스크린으로 열림
- 패널 ID는 Panel → `Inspect` → URL에서 확인 가능
- 리포트에 "Heap 그래프 단독"을 붙일 때 유용

### 8.3 Share → Link

- 패널 우상단 `Share` → `Link` → `Copy`
- 현재 time range가 **절대값으로 박힌 URL** 생성
- Slack/PR 본문에 붙이면 열었을 때 같은 구간 재현

### 8.4 PNG 출력

| 방식 | 장단 |
|------|------|
| **Grafana Image Renderer** 플러그인 | 정식 기능. 서버 사이드 렌더 → 깔끔한 PNG. 단 Chromium 의존성·메모리 추가 |
| **브라우저 네이티브 캡처** | Chrome DevTools → `Run command` → `Capture full size screenshot`. 플러그인 불필요 |
| **Windows 캡처 도구** | Win + Shift + S. 빠르지만 가로 긴 패널은 안 맞음 |

개인 프로젝트 규모에선 **DevTools `Capture full size screenshot`** 이 최적. t3.small에 렌더러 플러그인 깔면 메모리 300MB 추가됨.

### 8.5 파일명 규칙

```text
loadtest/screenshots/2026-04-22-t04m-vu500-grafana-heap.png
                    └─ date ─┘ └ t ┘ └ vu ┘ └ source ┘ └ panel ┘
```

- 날짜 앞에 두기 (정렬)
- `t04m`: 테스트 시작 후 경과 시간 (4분 지점)
- `vu500`: 그 순간 VU 수
- `grafana-heap`: 어느 대시보드의 어느 패널

나중에 검색할 때 "vu500 스크린샷 어디 있더라" → `ls *vu500*` 한 방.

---

## 9. 실제 관찰 사례 — Week 7 Step C

### 9.1 상황 재현

```text
시각        Heap%   HTTP p95   GC Pause p99   Kafka Lag
t=0m        22      12ms       18ms           0
t=2m        42      180ms      45ms           1,200
t=2m 30s    44      220ms      67ms           1,450
t=3m        23      190ms      310ms          80
t=3m 15s    21      45ms       28ms           0
```

### 9.2 내러티브

**t=0~2m**: idle → ramping. Heap, latency, lag 모두 예상대로 상승. VU 200에서 SEND 폭주 시작.

**t=2m~2m 30s**: Kafka producer가 Outbox 폴링 결과를 `List<OutboxRecord>`로 메모리에 올리면서 Heap 42% 도달. consumer는 아직 따라잡는 중이라 lag 누적 (1,450).

**t=3m**: **여기가 핵심 순간**. Heap이 23%로 급락. 사용자가 본 것:

> "Heap이 줄었네 — 근데 부하는 오히려 늘었는데? Kafka consumer가 지금 뒤늦게 큰 묶음을 처리하면서 참조를 놓은 타이밍이고, G1이 그걸 감지해서 Mixed GC를 돌렸지?"

실제로 GC Pause p99가 310ms로 스파이크 (평소의 6배). `action="end of major GC"` 시리즈를 확인하니 같은 시각 Mixed GC 이벤트 2회. Kafka consumer lag는 1,450 → 80으로 급감 (consumer가 따라잡음).

**t=3m 15s**: GC 끝나고 Heap 안정. p95도 회복. consumer backlog 해소로 Kafka side도 안정화.

### 9.3 이 관찰에서 배운 것

1. **Heap이 줄어드는 게 항상 좋은 신호는 아니다**. GC가 강제로 돌아서 줄어든 것일 수 있고, 그 순간 사용자 latency가 찍힌다.
2. **여러 패널을 한 시각선으로 읽는 능력**이 관측성의 본질. Heap 혼자는 스토리를 안 준다. Heap + GC Pause + Kafka Lag + HTTP p95 를 **한 화면에 놓고 시각 정렬**해야 인과가 보인다.
3. **사람의 시스템 이해가 숫자의 의미를 만든다**. Grafana는 숫자를 보여줄 뿐 "왜"를 설명 못 한다. "Kafka consumer가 늦게 돈다 → List 참조 놓음 → Mixed GC"는 사용자 머릿속 모델이 만든 연결이다.

> **"대시보드는 증거를 모으는 곳이고, 추리는 사람이 한다."**

이게 한 줄 교훈. 관측 도구에 의사결정을 맡기지 않는다.

---

## 10. 자주 만나는 함정

### 10.1 `rate()` 윈도우 vs `scrape_interval` 불일치

**증상**: 그래프가 NaN, empty, 톱니 모양.

**원인**: `rate(metric[15s])` 인데 Prometheus `scrape_interval: 30s`. 15초 윈도우 안에 데이터 포인트가 1개 이하 → rate 계산 불가능.

**규칙**: `rate()` 윈도우는 **scrape_interval의 최소 4배**. 우리 스택은 `scrape_interval: 15s`라 `rate[1m]`이 안전선.

### 10.2 `histogram_quantile` 의 bucket 해상도 한계

**증상**: p95가 딱 50ms, 100ms, 250ms 같은 값에 고정되어 보임.

**원인**: 내부적으로 Spring이 노출하는 bucket이 `[0.025, 0.05, 0.1, 0.25, ...]` 같은 이산 값. `histogram_quantile`은 **그 구간 안에서 선형 보간**을 시도하지만 bucket이 넓으면 정밀도 낮음.

**대응**:

- 값 자체를 소숫점 4자리로 믿지 말고 "버킷 경계 ± 한 구간" 범위로 해석
- 더 정밀하게 보고 싶으면 `management.metrics.distribution.percentiles-histogram.http.server.requests=true` + `sla` 프로퍼티로 커스텀 버킷 정의

### 10.3 다른 job의 메트릭이 섞여 보임

**증상**: Prometheus에서 `process_cpu_usage` 쿼리 시 시리즈가 여러 개 뜨고 뭐가 뭔지 모름.

**원인**: `job` label 필터 누락. 여러 앱(app, cadvisor, node_exporter)이 같은 이름 메트릭을 export할 수 있음.

**대응**: 모든 쿼리에 `{job="gohyang-app"}` 같은 job 필터 박는 습관. 4701 대시보드는 `$job` 변수로 이미 처리되어 있지만 직접 PromQL 쓸 때 까먹기 쉬움.

### 10.4 auto-refresh 켜두고 방치 → 브라우저 메모리 누수

**증상**: Grafana 탭 켜둔 채 1시간 뒤 돌아오니 Chrome 2GB, 팬이 회전.

**원인**: 각 패널이 5초마다 시리즈 데이터를 받아 축적. DevTools Memory 프로파일 보면 timestamp-value 배열이 계속 자람.

**대응**:

- 부하 테스트 실행 중에만 auto-refresh on
- 관찰 끝나면 `Refresh: off` 또는 탭 닫기
- 리포트 작성 시엔 절대 time range로 고정 (새 데이터 pull 안 함)

### 10.5 Heap %를 절대값으로만 판단

**증상**: "Heap 30%니까 안전" 같은 판단.

**함정**:

- 30%인데 **우상향 중**이면 10분 뒤 80%
- 30%인데 Mixed GC 직후면 실제론 "한계 근처에서 떨어진 것"
- Heap size 자체가 `-Xmx512m`인지 `-Xmx4g`인지에 따라 의미 완전 다름

**교훈**: **순간값 < 추세 < 추세 + 맥락**. 관측성은 시간축과 시스템 이해 위에서만 작동한다.

---

## 11. 관측성의 본질 — 한 줄 서사

> "관측성은 '측정'이 아니라 '선별 + 해석'이다. 모든 걸 다 보이게 하는 건 아무것도 안 보이게 하는 것과 같다."

### 인프라 비중이 큰 환경 관점 (참고)

"관측성을 어떻게 설계했나" 질문이 들어오면:

> "Prometheus 4701 대시보드를 받으니 50+ 패널이 쏟아졌는데, 부하 테스트 목적으로는 11개만 남기고 숨겼습니다. 관측성의 본질은 '모든 메트릭 내보내기'가 아니라 '**질문에 답하는 최소한의 신호만 선별해서 해석 가능하게 만들기**'라고 봐서요. 실제 테스트 중 Heap·GC·Kafka Lag·HTTP p95를 한 화면에 놓고 시간축을 맞춰 G1 Mixed GC가 latency에 찍히는 순간을 찾아냈습니다."

"도구 많이 썼다"보다 "관측 신호를 설계했다"가 훨씬 강한 서사.

### 비백엔드 팀원 관점 (풀스택·프런트 비중 큰 환경, 참고)

팀 단위 관측성 ROI 측면:

> "부하 테스트 전용 대시보드를 따로 만든 이유는 **백엔드가 아닌 팀원도 읽을 수 있어야 한다**고 봤기 때문입니다. 50개 JVM 패널은 프런트 개발자에게는 잡음이지만, p95 latency·에러율·CPU 세 개는 누구나 이해합니다. 대시보드 설계가 곧 팀 내 공통언어 설계라고 생각합니다."

---

## 12. 참고 자료

### 공식 문서

- [Micrometer JVM Metrics](https://docs.micrometer.io/micrometer/reference/reference/jvm.html) — `JvmMemoryMetrics`, `JvmGcMetrics`, `JvmThreadMetrics` 등 바인더 전체 목록
- [Grafana Dashboard 4701 (JVM Micrometer)](https://grafana.com/grafana/dashboards/4701) — 원본 JSON 다운로드 가능
- [Prometheus histogram & quantile](https://prometheus.io/docs/practices/histograms/) — `histogram_quantile` 사용법과 함정
- [Spring Boot Actuator `/actuator/prometheus`](https://docs.spring.io/spring-boot/reference/actuator/metrics.html) — 내보내는 메트릭 네임스페이스 전체

### Grafana 패널 기능

- [Panel options — Links](https://grafana.com/docs/grafana/latest/panels-visualizations/configure-panel-links/) — 패널 타이틀 링크로 runbook 연결
- [Panel overrides — Thresholds](https://grafana.com/docs/grafana/latest/panels-visualizations/configure-thresholds/) — 임계값 색상 구역
- [Value mappings](https://grafana.com/docs/grafana/latest/panels-visualizations/configure-value-mappings/) — status 코드 → 텍스트 매핑

### 이 프로젝트 문서

- [40. 관측성 스택 도입기](./40-observability-stack-decisions.md) — Prometheus + Grafana 선택의 상위 결정
- [41. k6 사용법·설계](./41-k6-load-testing-setup.md) — 부하 생성 쪽. 이 문서와 짝
- [부하 테스트 2026-04-22 리포트](../reports/load-test-2026-04-22.md) — 실제 관찰 원본

---

## 13. 요약 — 한 줄

**"4701 원본은 참고용으로 두고, 부하 테스트 전용 11개 패널짜리 대시보드를 따로 만든다. 질문에 답하는 최소 신호만 남기고, Heap·GC·Latency·Kafka Lag의 시간축을 맞춰 읽어 인과를 추적한다."**
