# 38. 12-factor Config 이관 — application-prod.yml 없애기

> [37. CD 파이프라인 구축기](./37-cd-pipeline-design.md)의 마지막 장면에서 발견한 문제 — "CI로 빌드한 이미지엔 `application-prod.yml`이 없다" — 를 풀어나가는 후속편. 설정을 **이미지 밖으로** 완전히 빼는 작업.

---

## 1. 이전 이야기 복습

37번에서 발견한 문제 한 줄 요약:

```text
EC2에서 build 했을 땐    → 이미지 안에 application-prod.yml 포함됨 ✅
GitHub Actions에서 build  → Runner에 파일 없음 → 이미지에도 없음 ❌
```

긴급 해결책 3개가 있었다.

| 옵션 | 방법 | 판단 |
|------|------|------|
| A | volume mount로 호스트 파일을 컨테이너에 연결 | 임시방편 |
| B | 설정 자체를 env var로 이관 | **정답** |
| C | gitignore 해제해서 파일을 git에 올림 | 시크릿 유출 위험, 금지 |

"이왕 하는 거 제대로" 방향으로 **B를 선택**했다.

---

## 2. 근본 질문 — 실무에서는 어떻게 하나?

### Q1. application.yml에 모든 설정이 그대로 보이는 거면 보안 문제 아닌가?

**결론: 아니다. 보이는 건 "구조", 시크릿은 placeholder.**

이렇게 바뀐다:

```yaml
# Before (위험) — 값이 그대로 노출
spring:
  datasource:
    url: jdbc:postgresql://prod-db.internal:5432/gohyang
    username: admin
    password: MySecretPassword123!

# After (안전) — 구조만 공개, 값은 env로
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/gohyang}
    username: ${DB_USERNAME:gohyang}
    password: ${DB_PASSWORD:gohyang}
```

Git에 커밋되는 건 **placeholder + 로컬 기본값**뿐이다. 실제 운영 값은 `.env`(서버)나 Secrets Manager(클라우드)에 따로 둔다.

공격자가 GitHub 공개 레포에서 이 파일을 본다고 얻을 수 있는 정보:

- "PostgreSQL 쓰는구나"
- "Redis, Kafka 같은 인프라 쓰는구나"
- "로컬 dev는 localhost 기본값 쓰는구나"

**이 정도는 거의 모든 오픈소스 프로젝트에 노출되어 있다.** 문제 없음.

**진짜 보안 이슈는 "시크릿 값이 git history에 들어가는 것"**인데, placeholder만 쓰면 애초에 그럴 일이 없다.

### Q2. 그럼 private 레포 하나 더 파서 설정을 거기 두면?

**결론: 안티패턴. 평문 저장이라 위험 + 운영 복잡.**

이런 구조를 상상해볼 수 있다:

```text
[public] myapp                → 소스 코드
[private] myapp-config         → application-prod.yml (시크릿 포함)
         ↓
CI가 둘 다 clone해서 합침
```

겉보기엔 "private니까 안전"해 보이지만:

| 문제 | 설명 |
|------|------|
| **평문 저장** | 시크릿이 파일로 그대로 들어있음. 암호화 없음 |
| **git history 영구 보존** | 시크릿을 한 번 커밋하면 history에서 완전히 지우기 어려움 |
| **접근 제어가 거침** | repo 단위 권한만 가능. "DB 비번은 볼 수 있지만 OpenAI 키는 못 봄" 같은 fine-grained 제어 불가 |
| **감사 로그 없음** | 누가 언제 뭘 열람했는지 추적 어려움 |
| **로테이션 수동** | 시크릿 바꾸려면 PR 만들고 커밋하고… 사람 손을 탐 |
| **실수 위험** | 누군가 부주의로 public으로 전환하면 끝. 이미 노출된 시크릿은 즉시 전부 로테이션해야 함 |

실무에선 **시크릿 전용 저장소**를 쓴다. AWS Secrets Manager, HashiCorp Vault, GitHub Secrets 같은.

**공통 특징**:

- 암호화 저장 (at rest)
- IAM·RBAC으로 fine-grained 접근 제어
- 감사 로그
- 로테이션 자동화
- git에 흔적 안 남김

### 실무 조합 패턴

```text
application.yml (공개, git committed)
  └─ 구조 + placeholder + 로컬 기본값
  
시크릿 값 저장소:
  ├─ 소규모/단일서버 → .env 파일 (서버 파일시스템에만 존재)
  ├─ 중간 규모      → AWS Secrets Manager / Parameter Store
  └─ 대규모/엔터프라이즈 → HashiCorp Vault
  
배포 시 주입:
  ├─ docker-compose가 .env 읽음 → container env var로 전달
  └─ 또는 CI가 Secrets Manager에서 fetch → env var로 주입
```

우리 프로젝트 규모(단일 EC2)에서는 **`.env` 파일로 충분**하다. 규모 커지면 나중에 AWS Secrets Manager로 옮기면 된다.

---

## 3. 12-factor App 원칙에서 본 이유

이 전체 논의의 이론적 배경. Heroku 창업자들이 2011년에 정리한 **SaaS 운영 12원칙** 중 Config 섹션:

> "An app's config is everything that is likely to vary between deploys (staging, production, developer environments, etc). Config should be **strictly separated from code**."

핵심 아이디어:

1. **환경별로 달라지는 값 = 설정**
2. **설정은 코드와 철저히 분리**
3. **환경변수로 주입**
4. **설정 파일을 코드 레포에 넣지 말 것**

여기서 "환경변수로"가 핵심. 왜?

- 환경변수는 **OS 레벨에서 표준화**됨. 어느 언어·플랫폼이든 지원
- **실행 시점에 주입** → 이미지는 환경 독립적
- **실수로 git에 들어가기 어려움** (.env는 gitignore 관습이 강함)

우리가 해야 할 건 결국 **이 원칙에 맞게 정리하는 것**이다.

---

## 4. 실제 이관 작업 — 뭘 바꿔야 하나

### 4.1 통합된 `application.yml` 초안

기존 분리된 파일들:

- `application.yml` (공개, 최소)
- `application-local.yml` (gitignored, 로컬 전체 설정)
- `application-prod.yml` (gitignored, 프로덕션 전체 설정)

통합 후:

```yaml
# application.yml (유일한 설정 파일, git 공개)
spring:
  application:
    name: gohyang
  
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/gohyang}
    username: ${DB_USERNAME:gohyang}
    password: ${DB_PASSWORD:gohyang}
    driver-class-name: org.postgresql.Driver
  
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
  
  cassandra:
    contact-points: ${CASSANDRA_HOST:127.0.0.1}
    port: ${CASSANDRA_PORT:9042}
    local-datacenter: ${CASSANDRA_DATACENTER:datacenter1}
    keyspace-name: ${CASSANDRA_KEYSPACE:gohyang}
    schema-action: ${CASSANDRA_SCHEMA_ACTION:create-if-not-exists}
  
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
  
  jpa:
    hibernate:
      ddl-auto: ${JPA_DDL_AUTO:validate}
    open-in-view: false

server:
  port: ${SERVER_PORT:8080}

# 환경별로 다른 것들
logging:
  level:
    com.maeum.gohyang: ${LOG_LEVEL_APP:INFO}
    org.springframework.security: ${LOG_LEVEL_SECURITY:INFO}

# 앱 커스텀 설정
jwt:
  secret: ${JWT_SECRET:dev-fake-secret-for-local-only-do-not-use-in-prod}
  expiration-ms: ${JWT_EXPIRATION_MS:86400000}

npc:
  adapter: ${NPC_ADAPTER:hardcoded}

openai:
  api-key: ${OPENAI_API_KEY:}
  
app:
  cors:
    allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:3001}

# Swagger/Actuator — 운영에선 닫기
springdoc:
  api-docs:
    enabled: ${SWAGGER_ENABLED:true}
  swagger-ui:
    enabled: ${SWAGGER_ENABLED:true}

management:
  endpoints:
    web:
      exposure:
        include: ${ACTUATOR_ENDPOINTS:health,info}
```

**패턴**: 모든 값이 `${환경변수:로컬_기본값}` 형태. 로컬 개발자는 env var 없이도 돌아감. 운영은 반드시 env var 주입.

### 4.2 `docker-compose.yml` environment 섹션 확장

```yaml
app:
  environment:
    # Spring Boot 표준 매핑: SPRING_DATASOURCE_URL → spring.datasource.url
    SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/gohyang
    DB_USERNAME: ${DB_USERNAME:-gohyang}
    DB_PASSWORD: ${DB_PASSWORD:-gohyang}
    
    REDIS_HOST: redis
    CASSANDRA_HOST: cassandra
    CASSANDRA_KEYSPACE: gohyang
    KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    
    JPA_DDL_AUTO: validate
    
    JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}  # ← 필수
    NPC_ADAPTER: ${NPC_ADAPTER:-hardcoded}
    OPENAI_API_KEY: ${OPENAI_API_KEY:-}
    APP_CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:3000}
    
    SWAGGER_ENABLED: ${SWAGGER_ENABLED:-false}
    LOG_LEVEL_APP: ${LOG_LEVEL_APP:-INFO}
```

여기서 **Spring Boot의 magic**: 환경변수 `SPRING_DATASOURCE_URL`은 자동으로 `spring.datasource.url` 프로퍼티에 매핑된다 (대문자+언더스코어 → 소문자+점). 별도 설정 없이 그냥 동작한다.

### 4.3 `.env.example` 가이드

```bash
# ── 시크릿 (운영에서는 반드시 변경) ──
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-your-key-here   # NPC_ADAPTER=openai일 때만 필요

# ── 환경별 분기 ──
# 로컬 개발: 기본값 대부분 OK. 아래 정도만 설정
# DB_PASSWORD=gohyang
# NPC_ADAPTER=hardcoded   # openai 쓰려면 openai로

# 프로덕션: 아래 추가
# CORS_ALLOWED_ORIGINS=https://ghworld.co
# SWAGGER_ENABLED=false
# LOG_LEVEL_APP=INFO
```

핵심: **"로컬은 기본값으로도 돌아가도록, 운영만 명시적으로 설정"**. 개발자 온보딩이 쉬워진다.

### 4.4 삭제되는 파일

```text
backend/src/main/resources/application-local.yml  ← 삭제
backend/src/main/resources/application-prod.yml   ← 삭제
```

Spring Boot profile 기능(`SPRING_PROFILES_ACTIVE=prod`)도 이 프로젝트에선 더 이상 필요 없다. 환경변수가 전부 결정하니까.

---

## 5. 접근 2 — Deploy-only 디렉토리 분리

37번의 마지막 고민이었던 "EC2에 소스 코드가 있을 필요가 있나"에 대한 답. 지금까지 EC2엔 레포 전체가 있었지만, **실제로 필요한 건 3개 파일뿐**이다.

### 왜 같이 하나

이번 작업에서 어차피 `docker-compose.yml`을 대대적으로 뜯어고치니, **디렉토리 분리도 같은 PR에서**. 두 번 일하지 않기 위해.

### 목표 레포 구조

```text
ChatAppProject/
├── backend/              # 소스 코드
├── frontend/             # 소스 코드
├── docs/                 # 문서
├── deploy/               # ★ EC2에 필요한 것만
│   ├── docker-compose.yml
│   ├── .env.example
│   └── scripts/
│       └── deploy.sh
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

### 변경되는 것

| 파일 | 변경 |
|------|------|
| `docker-compose.yml` | `deploy/docker-compose.yml`로 이동 |
| `scripts/deploy.sh` | `deploy/scripts/deploy.sh`로 이동 |
| `deploy/docker-compose.yml` | build context를 `../backend`, `../frontend`로 수정 (레포 루트 기준) |
| `deploy/scripts/deploy.sh` | `cd /home/ubuntu/ChatAppProject/deploy` |
| `.github/workflows/deploy.yml` | paths-filter 경로 업데이트, SSM 명령 경로 수정 |
| `deploy.yml`의 docker build context | `./backend`, `./frontend` (루트 기준, 그대로) |

### EC2 측 변경

기존:

```text
/home/ubuntu/ChatAppProject/          (전체 레포)
```

신규:

```text
/home/ubuntu/gohyang-deploy/          (또는 그대로 ChatAppProject 유지)
├── docker-compose.yml
├── .env                              (시크릿)
└── scripts/deploy.sh
```

단순히 `ChatAppProject` 폴더에서 `backend/`, `frontend/` 등을 지우고 `deploy/` 내용만 루트로 올리는 것도 됨.

**실무 팁**: 일단은 **레포 전체 유지**하고 `deploy/` 위치만 바꿔도 충분하다. EC2 디스크가 빡빡해지면 그때 불필요한 디렉토리 지우면 됨. 지금은 수 MB 수준이라 괜찮다.

### trade-off

| 항목 | 전체 레포 유지 | deploy 디렉토리만 |
|------|---------------|------------------|
| EC2 디스크 | 몇십 MB 낭비 | 깨끗 |
| 디버깅 | 소스 보면서 verify 가능 | 이미지 안을 봐야 함 |
| 논리적 명료성 | 낮음 | 높음 |
| 관리 복잡도 | 낮음 | 중간 |

지금 단계에선 **deploy/ 디렉토리로 정리하되, EC2에서 불필요한 디렉토리 청소는 나중으로** 미룬다. 구조 이전만 확실히.

---

## 6. 마이그레이션 순서

PR 하나로 묶을지, 단계적으로 쪼갤지는 판단이 갈린다. 이 프로젝트는 **하나의 PR**로 간다 (서비스 다운 중이라 빠른 복구가 우선, 컨텍스트 분리하면 오히려 작업 길어짐).

### Step 1. application.yml 통합

- `application.yml` 전체 설정 병합, env var placeholder로 변환
- 로컬 기본값 설정 (개발자가 `.env` 없이도 돌리도록)
- 빌드 + 로컬 테스트 (`docker compose up --build`)

### Step 2. 기존 파일 삭제

- `application-local.yml`, `application-prod.yml` 제거
- Spring Boot profile 의존성 있는 코드 있는지 grep (`@Profile`)

### Step 3. docker-compose.yml env 확장

- 모든 SPRING_* env var 추가
- `${VAR:?}` 문법으로 필수 env var 검증 (누락 시 기동 거부)

### Step 4. .env.example 재작성

- 로컬 개발자 가이드 + 프로덕션용 주석 분리
- 시크릿 항목 명확화

### Step 5. deploy/ 디렉토리 이동

- `docker-compose.yml` → `deploy/docker-compose.yml`
- `scripts/deploy.sh` → `deploy/scripts/deploy.sh`
- 내부 경로 참조 수정

### Step 6. deploy.yml 워크플로우 업데이트

- paths-filter 경로 반영
- SSM 명령 경로 수정 (`/home/ubuntu/ChatAppProject/deploy/scripts/deploy.sh`)
- docker build context는 그대로 (루트 기준)

### Step 7. EC2에서 복구 순서 문서화

- 머지 후 EC2에서 실행할 명령 (다음 섹션)

### Step 8. 테스트 + PR

---

## 7. 머지 후 EC2 복구 절차

PR 머지 직후, EC2에서 1회만 실행하면 됨:

```bash
# Session Manager
sudo su - ubuntu
cd /home/ubuntu/ChatAppProject

# 최신 코드
git fetch origin main
git reset --hard origin/main
git clean -fd

# 기존 application-prod.yml 삭제 (더 이상 필요 없음)
rm -f backend/src/main/resources/application-prod.yml
rm -f backend/src/main/resources/application-local.yml

# .env가 필요한 env var 전부 포함하는지 확인
cat .env
# 누락된 키 있으면 추가 (JWT_SECRET, DB_PASSWORD, OPENAI_API_KEY, CORS_ALLOWED_ORIGINS 등)

# 새 구조로 이동 (deploy 디렉토리화 후)
cd deploy
docker compose down
docker compose pull
docker compose up -d --wait --wait-timeout 600

# 헬스체크
curl https://ghworld.co/actuator/health
```

그 다음부터는 CD가 알아서 돌린다. 수동 개입 끝.

---

## 8. 실전에서 배운 원칙 (요약)

1. **"설정은 코드와 분리"** — 이것만 지키면 12-factor의 절반
2. **application.yml은 구조, env var는 값**
3. **로컬 기본값 중요** — 개발자 온보딩·CI 테스트가 쉬워짐
4. **시크릿은 절대 git에** — private repo도 안 됨. 전용 저장소 쓸 것
5. **이미지는 환경 독립적** — 같은 이미지가 local, staging, prod 전부 돌아야 진짜 CD
6. **빌드 아티팩트 vs 실행 설정**을 분리해서 생각하기
   - 아티팩트(이미지)는 한 번 만들면 고정
   - 실행 설정(env var)은 배포 시점·환경마다 다름

---

## 9. 다음 여정

이 이관이 끝나면 이미지가 진정으로 portable해진다. 그 다음은:

- **AWS Secrets Manager 이관** (규모 커지면): `.env` → Secrets Manager. CD가 Secrets Manager에서 fetch
- **환경 복수화**: staging 추가. 같은 이미지, 다른 `.env`
- **부하 테스트 시작**: 드디어 Week 7의 Task 3 착수 가능

37번에서 시작된 "CD 구축" 여정이 **이미지와 설정의 완전한 분리**로 매듭지어진다.

---

## 10. 참고

### 원문

- [The Twelve-Factor App (한글판)](https://12factor.net/ko/) — 특히 Config 섹션

### 관련 문서

- Spring Boot 공식 — [Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- Spring Boot — [Environment variable binding rules](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config.typesafe-configuration-properties.relaxed-binding.environment-variables)

### 이 프로젝트 문서

- [37. CD 파이프라인 구축기](./37-cd-pipeline-design.md) — 이 글의 시작점
- `application.yml` — 실제 통합된 설정
- `deploy/docker-compose.yml` — env var 주입부
- `.env.example` — 로컬 개발자 가이드
