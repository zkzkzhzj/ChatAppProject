# ghworld — 마음의 고향

> 대화가 그리운 사람을 위한 장소 기반 의사소통 서비스

**https://ghworld.co**

누군가의 온기가 필요할 때, 고향에 온 듯한 편안함을 느끼며 대화할 수 있는 **마을**을 제공한다.
인터랙티브 2D 공간에서 캐릭터가 마을을 돌아다니고, 자기 공간을 꾸미며, 이웃(유저 또는 AI 주민)과 자연스럽게 소통하는 서비스다.

---

## 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 회원가입/로그인 | 이메일 기반 인증 + 게스트 토큰 | ✅ 구현 완료 |
| 마을 공간 | 인터랙티브 2D 마을 (Phaser.js). 카메라 팔로우, 대각선 이동 | ✅ 구현 완료 |
| 마을 공개 채팅 | WebSocket(STOMP) 실시간 채팅. 유저/NPC/이웃 메시지 구분 | ✅ 구현 완료 |
| @멘션 NPC | 채팅에서 `@마을 주민`으로 NPC에게 말 걸기 | ✅ 구현 완료 |
| 실시간 위치 공유 | STOMP 기반 캐릭터 위치 broadcast + 입퇴장 감지 | ✅ 구현 완료 |
| 타이핑 인디케이터 | 상대방 입력 중 표시 | ✅ 구현 완료 |
| AI NPC | OpenAI GPT-4o-mini + 시맨틱 검색 대화 맥락 유지 (개발: Ollama EXAONE 3.5) | ✅ 구현 완료 |
| 대화 요약 | Kafka → LLM 요약 → pgvector 임베딩 저장. 3회 누적 시 자동 트리거 | ✅ 구현 완료 |
| 공간 꾸미기 | 아이템으로 내 집을 꾸미는 경험 | 미착수 |
| 포인트/아이템 | 포인트 획득 → 아이템 구매 → 인벤토리 | 미착수 |
| 음성/화면 공유 | WebRTC 기반 | 미착수 |
| AWS 배포 | EC2 서울 리전 + nginx + Cloudflare SSL | ✅ 운영 중 |

---

## 기술 스택

### Backend

| 항목 | 버전/설명 |
|------|-----------|
| Java | 21 |
| Spring Boot | 4.0.3 |
| Build | Gradle Kotlin DSL + Version Catalog |
| Architecture | Hexagonal (Ports & Adapters) |
| ORM | Hibernate 7.x + pgvector 네이티브 타입 |

### Infra

| 항목 | 용도 |
|------|------|
| PostgreSQL 16 + pgvector | 주 데이터베이스 + 벡터 시맨틱 검색 |
| Redis 7.2 | 세션/캐시 |
| Cassandra 4.1 | 채팅 메시지 저장 (write-heavy) |
| Kafka 3.7 (KRaft) | 도메인 간 비동기 이벤트 + Transactional Outbox |
| Ollama | 로컬 LLM 서빙 (exaone3.5:7.8b) |

### Frontend

| 항목 | 버전/설명 |
|------|-----------|
| Next.js | 16.2.2 (App Router) |
| React | 19.2.4 |
| Phaser.js | 3.90.0 (2D 마을 렌더링) |
| Tailwind CSS | 4.x (`@theme` 디자인 토큰) |
| Zustand | 채팅/게임 상태 관리 |

### Test & CI/DX

| 항목 | 설명 |
|------|------|
| Cucumber BDD | 7.34.2 — Given-When-Then 인수 테스트 |
| Testcontainers | PostgreSQL, Kafka, Cassandra 통합 테스트 |
| Checkstyle | Naver Convention 기반, `maxWarnings=0` |
| Error Prone + NullAway | 컴파일 타임 버그 탐지 |
| ArchUnit | 헥사고날 의존 방향 검증 |
| JaCoCo | 라인 커버리지 50% 강제 |
| ESLint + Prettier | 프론트엔드 코드 품질 |
| Husky + lint-staged | pre-commit 자동 검사 |
| GitHub Actions CI | push/PR 시 자동 빌드 + 테스트 |
| CodeRabbit | AI 코드 리뷰 (assertive 프로필) |

---

## 아키텍처

```text
Hexagonal Architecture (Ports & Adapters)

[Adapter In]          [Application]         [Adapter Out]
Controller      →     UseCase               →  JPA Repository
WebSocket       →     Domain Service        →  Cassandra Repository
Kafka Consumer  →     Domain Entity         →  Kafka Producer (Outbox)
                      Port (interface)      →  Ollama LLM API
```

### 도메인 구성

```text
identity/        # Generic — 인증/인가, 게스트 세션
village/         # Core — 캐릭터, 공간, 위치 공유, 타이핑 인디케이터
communication/   # Core — 채팅, 메시지, NPC 대화, @멘션, 대화 요약
global/          # Cross-cutting — 설정, 예외, Outbox, 멱등성
```

### 주요 이벤트 흐름

```text
회원가입 → Outbox → Kafka "user.registered" → 캐릭터/공간 자동 생성
채팅 3회 → Outbox → Kafka "npc.conversation.summarize" → LLM 요약 → pgvector 저장
NPC 응답 → 유저 메시지 임베딩 → pgvector 유사도 검색 → 맥락 주입 → LLM 호출
```

---

## 로컬 실행

### 사전 요구 사항

- Docker Desktop
- Java 21
- Node.js 22+

### 전체 스택 기동

```bash
# .env 파일 생성 (최초 1회)
cp .env.example .env

# 인프라 + 서버 전체 기동
docker-compose up --build

# 또는 프론트엔드만 로컬 개발 (HMR)
docker-compose stop frontend
cd frontend && npm install && npm run dev
```

### 에셋 설정

마을 배경 에셋은 유료 에셋이므로 git에 포함되지 않는다. `frontend/public/assets/village/` 디렉토리에 직접 배치해야 한다.
에셋 없이도 프로시저럴 배경으로 동작한다.

### 테스트 실행

```bash
cd backend
./gradlew test
# Cucumber 리포트: backend/build/reports/cucumber/cucumber.html
# JaCoCo 리포트: backend/build/reports/jacoco/test/html/index.html
```

---

## 프로젝트 구조

```text
ChatAppProject/
├── backend/                    # Spring Boot 서버
│   ├── src/main/java/          # 비즈니스 로직 (Hexagonal)
│   ├── src/main/resources/     # application.yml, Flyway 마이그레이션
│   └── src/test/               # Cucumber BDD + 단위 테스트
├── frontend/                   # Next.js 클라이언트
│   ├── src/app/                # App Router 페이지
│   ├── src/components/chat/    # 채팅 UI 컴포넌트
│   ├── src/game/               # Phaser 게임 씬
│   ├── src/hooks/              # 커스텀 훅
│   └── src/lib/websocket/      # STOMP 클라이언트
├── docs/                       # 프로젝트 문서
│   ├── architecture/           # 아키텍처, ERD, ADR
│   ├── specs/                  # API/WebSocket/이벤트 명세
│   ├── conventions/            # 코딩/테스팅/Git 컨벤션
│   ├── wiki/                   # 시스템 동작 원리
│   ├── feedback/               # 유저 피드백 & 기술 부채 트래커
│   ├── learning/               # 기술 학습 노트 (35건)
│   └── planning/               # 기획, Phase 로드맵
├── llm-test/                   # LLM 모델 비교 테스트
└── docker-compose.yml          # 전체 인프라 + 서버 구성
```

---

## 문서

| 목적 | 경로 |
|------|------|
| 현재 상태 파악 | `docs/handover.md` |
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 도메인 경계 | `docs/architecture/domain-boundary.md` |
| 물리 ERD | `docs/architecture/erd.md` |
| API 명세 | `docs/specs/api/` |
| WebSocket 명세 | `docs/specs/websocket.md` |
| Kafka 이벤트 | `docs/specs/event.md` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| Git 전략 | `docs/conventions/git.md` |
| 기술 학습 노트 | `docs/learning/` |
| Phase 로드맵 | `docs/planning/phases.md` |
| 유저 피드백 | `docs/feedback/` |
