# 마음의 고향

> 대화가 그리운 사람을 위한 장소 기반 의사소통 서비스

누군가의 온기가 필요할 때, 고향에 온 듯한 편안함을 느끼며 대화할 수 있는 **마을**을 제공한다.
인터랙티브 2D 공간에서 캐릭터가 마을을 돌아다니고, 자기 공간을 꾸미며, 이웃(유저 또는 AI 주민)과 자연스럽게 소통하는 서비스다.

---

## 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 마을 공간 | 인터랙티브 2D 마을. 유저가 캐릭터로 돌아다닌다 | 설계 완료 |
| 채팅 | 근접 기반 실시간 텍스트 채팅 (WebSocket/STOMP) | 설계 완료 |
| 공간 꾸미기 | 아이템으로 내 집을 꾸미는 경험 | 설계 완료 |
| 포인트/아이템 | 광고 시청 → 포인트 획득 → 아이템 구매 | 설계 완료 |
| AI NPC | 마을에 상주하는 AI 주민. 초기 빈 마을 방지 | 설계 완료 |
| 음성/화면 공유 | WebRTC 기반 | 추후 예정 |

---

## 기술 스택

### Backend
| 항목 | 버전 |
|------|------|
| Java | 21 |
| Spring Boot | 4.0.3 |
| Build | Gradle Kotlin DSL |
| Architecture | Hexagonal (Ports & Adapters) |

### Infra
| 항목 | 용도 |
|------|------|
| PostgreSQL 16 | 주 데이터베이스 |
| Redis 7.2 | 세션/캐시/위치 동기화 |
| Cassandra 4.1 | 채팅 메시지 저장 (write-heavy) |
| Kafka 3.7 (KRaft) | 도메인 간 비동기 이벤트 |

### Frontend
| 항목 | 버전 |
|------|------|
| Next.js | 16.2.2 |
| React | 19.2.4 |
| Phaser.js | 3.90.0 (2D 공간 렌더링) |
| Tailwind CSS | 4.x |

### Test
| 항목 | 버전 |
|------|------|
| Cucumber (BDD) | 7.34.2 |
| Testcontainers | 2.x |

---

## 아키텍처

```
Hexagonal Architecture (Ports & Adapters)

[Adapter In]          [Application]         [Adapter Out]
Controller      →     UseCase               →  JPA Repository
WebSocket       →     Domain Service        →  Kafka Producer
                      Domain Entity         →  External API
                      Port (interface)
```

### 도메인 구성

```
communication/   # Core  — 채팅, 메시지, 참여자
village/         # Core  — 공간, 캐릭터, NPC
economy/         # Core  — 포인트(Wallet) + 아이템(Inventory)
  ├── wallet/
  ├── inventory/
  └── purchase/
safety/          # Support — 신고, 제재
identity/        # Generic — 인증/인가, 게스트 세션
notification/    # Infra — FCM Web Push
global/          # Cross-cutting — 설정, 예외 처리
```

---

## 로컬 실행

### 사전 요구 사항
- Docker Desktop
- Java 21
- Node.js 20+

### 전체 스택 기동

```bash
# 인프라 + 서버 전체 기동
docker-compose up --build

# 백엔드만 로컬 실행 (인프라는 Docker)
docker-compose up -d postgres redis kafka cassandra
cd backend && ./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트엔드
cd frontend && npm install && npm run dev
```

### 테스트 실행

```bash
cd backend
./gradlew test --rerun
# 리포트: backend/build/reports/cucumber/cucumber.html
```

---

## 현재 상태

```
✅ 인프라 구성       docker-compose (PostgreSQL, Redis, Kafka, Cassandra)
✅ 서버 기동         Spring Boot 4.0.3 + Dockerfile 멀티스테이지 빌드
✅ 테스트 환경       Cucumber BDD + Testcontainers 통합
✅ 물리 ERD 설계     테이블 명세, 카디널리티, 설계 결정 기록 완료
✅ 설계 문서         아키텍처, 도메인 경계, 패키지 구조, 코딩 컨벤션

❌ 비즈니스 로직     Entity, UseCase, Adapter 미구현
❌ REST API          미구현
❌ WebSocket 채팅    미구현
❌ 프론트엔드 UI     미구현
```

---

## 문서

| 목적 | 경로 |
|------|------|
| 현재 상태 파악 | `docs/handover.md` |
| 작업 히스토리 | `docs/history/` |
| 아키텍처 원칙 | `docs/architecture/architecture.md` |
| 도메인 경계 | `docs/architecture/domain-boundary.md` |
| 물리 ERD | `docs/architecture/erd.md` |
| 패키지 구조 | `docs/architecture/package-structure.md` |
| 코딩 컨벤션 | `docs/conventions/coding.md` |
| 테스팅 전략 | `docs/conventions/testing.md` |
| Git 전략 | `docs/conventions/git.md` |
| 기술 노트 | `docs/learning/` |
