# ghworld - 마음의 고향

> 대화가 그리운 사람을 위한 장소 기반 의사소통 서비스

**<https://ghworld.co>**

마음의 고향은 사용자가 3D 마을과 도서관에 들어와 잠시 머물고, 고백과 편지를 통해 마음을 남기고 읽는 서비스다. 마을과 도서관은 진입 경험이자 실시간 위치 공유가 일어나는 런타임 공간이며, 장기적으로 저장되는 핵심 데이터는 고백, 편지, 감사 답장, 비공개 사서 RAG 경계에 둔다.

---

## 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 회원가입 / 로그인 | 이메일 기반 인증과 게스트 토큰 | 구현 |
| 3D 마을 / 도서관 | Three.js 기반 진입 경험, 장면 전환, 기본 아바타 이동 | 구현 |
| 실시간 위치 공유 | STOMP 기반 위치 broadcast와 퇴장 감지 | 구현 |
| 마을 공개 채팅 | WebSocket(STOMP) 기반 공개 채팅 | 구현 |
| 방문 집계 | 오늘 방문자와 고백 수를 마을 대시보드에 표시 | 구현 |
| 건의 게시판 | 사용자가 서비스 건의를 남기는 표면 | 구현 |
| 고백 / 편지 | 고백 기록, 편지, 감사 답장, 반응, 신고 | 구현 |
| 비공개 사서 RAG | 고백과 도서관 맥락을 경계로 한 사서 응답 축 | 진행 트랙 |
| AWS 배포 | EC2 서울 리전 + nginx + Cloudflare SSL | 운영 |

수익 모델은 이번 트랙에서 설계하지 않는다. 현재 문서는 수익화 계획을 제품 범위로 선언하지 않는다.

---

## 기술 스택

### Backend

| 항목 | 버전 / 설명 |
|------|-------------|
| Java | 21 |
| Spring Boot | 4.x |
| Build | Gradle Kotlin DSL + Version Catalog |
| Architecture | Hexagonal Architecture |
| ORM | Hibernate 7.x |

### Infra

| 항목 | 용도 |
|------|------|
| PostgreSQL 16 | 주요 관계형 데이터 |
| Redis 7.2 | 세션 / 캐시 |
| Cassandra 4.1 | 채팅 메시지 저장 |
| Kafka 3.7 | 비동기 이벤트와 Outbox |
| LLM | 일반 채팅 기억이 아니라 고백/도서관 경계의 사서 RAG에 한정 |

### Frontend

| 항목 | 버전 / 설명 |
|------|-------------|
| Next.js | 16.x App Router |
| React | 19.x |
| Three.js | 3D 마을 / 도서관 렌더링 |
| Howler.js | 환경음 재생 |
| Tailwind CSS | 디자인 토큰 |
| Zustand | 클라이언트 상태 관리 |

### Test & CI/DX

| 항목 | 설명 |
|------|------|
| Cucumber BDD | Given-When-Then 인수 테스트 |
| Testcontainers | PostgreSQL, Kafka, Cassandra 통합 테스트 |
| Checkstyle | Naver Convention 기반 |
| Error Prone + NullAway | 컴파일 타임 버그 탐지 |
| ArchUnit | 헥사고날 의존 방향 검증 |
| JaCoCo | 라인 커버리지 검증 |
| ESLint + Prettier | 프론트엔드 코드 정리 |
| GitHub Actions CI | push / PR 자동 검증 |

---

## 아키텍처

```text
Hexagonal Architecture (Ports & Adapters)

[Adapter In]          [Application]         [Adapter Out]
Controller      ->    UseCase          ->   JPA Repository
WebSocket       ->    Service          ->   Cassandra Repository
Kafka Consumer  ->    Domain Model     ->   Kafka Producer / Outbox
```

### 도메인 구성

```text
identity/        # 인증, 회원, 게스트 세션
village/         # 런타임 마을/도서관 경험, 위치 공유, 방문 집계, 건의, 대시보드
communication/   # 공개 채팅, 채팅방, 메시지
confession/      # 고백, 편지, 감사 답장, 반응/신고, 사서 RAG 사적 데이터 경계
safety/          # 신고와 제재
global/          # Cross-cutting 설정, 예외, Outbox, 멱등성
```

### 주요 데이터 흐름

```text
사용자 진입 -> 3D 마을/도서관 런타임 -> 위치 broadcast
오늘 방문 기록 -> daily_visit insert-if-absent -> 대시보드 집계
고백 작성 -> confession_record 저장 -> 편지/감사 답장/반응/신고 흐름
사서 RAG -> 고백/도서관 사적 데이터 경계 안에서만 응답 맥락 구성
채팅 메시지 -> Cassandra 저장 -> WebSocket broadcast
```

---

## 로컬 실행

### 사전 요구 사항

- Docker Desktop
- Java 21
- Node.js 22+

### 전체 스택 기동

```bash
cp .env.example .env
docker-compose up --build
```

프론트엔드만 로컬 개발 모드로 실행하려면:

```bash
docker-compose stop frontend
cd frontend
npm install
npm run dev
```

### 테스트 실행

```bash
cd backend
./gradlew test
```

---

## 프로젝트 구조

```text
ChatAppProject/
├── backend/                    # Spring Boot 서버
│   ├── src/main/java/          # 비즈니스 로직
│   ├── src/main/resources/     # application.yml, Flyway
│   └── src/test/               # Cucumber BDD + 단위 테스트
├── frontend/                   # Next.js 클라이언트
│   ├── src/app/                # App Router 페이지
│   ├── src/components/chat/    # 채팅 UI
│   ├── src/three/              # Three.js 마을/도서관 런타임
│   └── src/lib/websocket/      # STOMP 클라이언트 facade
├── docs/                       # 프로젝트 문서
└── docker-compose.yml          # 로컬 인프라 구성
```

---

## 문서

| 목적 | 경로 |
|------|------|
| 현재 작업 상태 | `docs/handover/INDEX.md` |
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 도메인 경계 | `docs/architecture/domain-boundary.md` |
| 물리 ERD | `docs/architecture/erd.md` |
| API 명세 | `docs/specs/api/` |
| WebSocket 명세 | `docs/specs/websocket.md` |
| Kafka 이벤트 | `docs/specs/event.md` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스트 전략 | `docs/conventions/testing.md` |
| Git 전략 | `docs/conventions/git.md` |
