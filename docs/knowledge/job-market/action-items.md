> append only

## 액션 아이템 -- 2026-04-16

> 기준: "마음의 고향" 프로젝트 현재 기술 스택 (Java 21 / Spring Boot 4.x / PostgreSQL / Redis / Cassandra / Kafka / WebSocket STOMP / Next.js + Phaser.js) 대비 타겟 3사 JD 요구사항 갭 분석

### 이미 보유한 역량 (JD 매칭)

| JD 요구사항 | 프로젝트 해당 기술 | 매칭 회사 |
|------------|------------------|----------|
| Java + Spring Boot | Java 21 + Spring Boot 4.x | 네이버, SOOP |
| PostgreSQL | PostgreSQL (주 DB) | 마플, 네이버 |
| Redis | Redis (캐싱/세션) | 마플, 네이버 |
| Kafka | Kafka (도메인 간 이벤트) | SOOP, 네이버 |
| WebSocket 실시간 통신 | STOMP WebSocket (채팅) | 3사 공통 |
| Docker | Docker Compose 환경 | 3사 공통 |
| REST API 설계 | 헥사고날 아키텍처 기반 API | 3사 공통 |
| 대용량 데이터 | Cassandra (채팅 메시지) | SOOP, 네이버 |
| 테스트 전략 | JUnit 5 + Testcontainers + BDD | 네이버 |

### 보완 필요 영역 (우선순위별)

#### P0 -- 빠르게 보완 가능 (프로젝트 내 즉시 적용)

1. **Kubernetes 운영 경험**
   - 현재: Docker Compose만 사용
   - 요구: SOOP(K8s 운영), 네이버(K8s 필수)
   - 액션: 로컬 k8s(minikube/kind)로 배포 파이프라인 구축 + 학습노트 작성
   - 예상 소요: 1-2주

2. **부하 테스트 / 성능 최적화 경험 증빙**
   - 현재: 동시성 테스트는 있으나 부하 테스트 미수행
   - 요구: 3사 공통 "대용량 트래픽 처리"
   - 액션: k6 또는 Gatling으로 WebSocket 채팅 부하 테스트 수행, 병목 분석 + 최적화 기록
   - 예상 소요: 1주

3. **CI/CD 파이프라인 고도화**
   - 현재: GitHub Actions 기본 설정
   - 요구: 컨테이너 빌드 + 자동 배포
   - 액션: GitHub Actions -> Docker 이미지 빌드 -> (K8s 배포) 파이프라인 구축
   - 예상 소요: 3일

#### P1 -- 프로젝트 확장으로 보완 가능

1. **Node.js / NestJS 경험**
   - 현재: 프로젝트에서 사용하지 않음
   - 요구: 마플(필수), SOOP(4개 포지션)
   - 액션 방안 A: 마음의 고향 프론트엔드 BFF(Backend For Frontend)를 NestJS로 구현
   - 액션 방안 B: 사이드 프로젝트로 NestJS 기반 간단한 실시간 서비스 구축
   - 예상 소요: 2-3주

2. **함수형 프로그래밍 역량** (마플 타겟 시)
   - 현재: Java Stream API 수준
   - 요구: 마플 -- FxTS/이터러블 프로그래밍 숙련
   - 액션: FxTS 라이브러리 학습 + TypeScript 함수형 패턴 실습
   - 예상 소요: 2주

3. **글로벌 서비스 / 다국어 처리 경험**
   - 현재: 한국어 단일 서비스
   - 요구: SOOP 글로벌 서비스
   - 액션: i18n 지원 추가, 타임존 처리 로직 구현
   - 예상 소요: 1주

#### P2 -- 장기 학습 필요

1. **Kotlin 역량** (네이버 타겟 시)
   - 현재: Java만 사용
   - 요구: 네이버 -- Java/Kotlin 병용
   - 액션: 일부 도메인 서비스를 Kotlin으로 마이그레이션 실습
   - 예상 소요: 3-4주

2. **MSA 분산 시스템 운영 경험**
   - 현재: 모놀리식 (헥사고날 아키텍처로 도메인 분리는 됨)
   - 요구: 네이버 -- MSA 경험 우대
   - 액션: 도메인별 서비스 분리 (채팅 서비스 독립 배포) 검토
   - 비고: 현재 규모에서는 모놀리식이 적절, 면접에서 "분리 가능한 구조로 설계했다"고 설명

### 프로젝트의 차별화 강점

JD에 직접 매칭되지 않지만, 면접에서 강조할 수 있는 포인트:

1. **헥사고날 아키텍처 실전 적용**: 도메인 순수성 유지, Port/Adapter 패턴
2. **AI NPC 통합**: Ollama 로컬 LLM + 시맨틱 검색 (RAG)
3. **이벤트 드리븐 설계**: Kafka 멱등성 보장, 도메인 간 느슨한 결합
4. **실시간 채팅 시스템**: WebSocket STOMP + JWT 인증 + 채널 인터셉터
5. **BDD 테스트 전략**: Cucumber + Given-When-Then
6. **AI Native 개발 프로세스**: Claude Code 활용한 체계적 개발 워크플로우

### 이번 달 추천 집중 영역

> SOOP "서비스 웹 API 개발" (경력 2년+, Node.js) 또는 "Global NestJS" (경력 3년+)가 현재 프로젝트와 가장 시너지가 크고, 보완도 빠른 타겟이다.

1. **K8s 배포 경험 만들기** (P0-1): 가장 빠르게 JD 매칭률을 올릴 수 있음
2. **부하 테스트 수행** (P0-2): WebSocket 채팅 1000명 동시 접속 시나리오
3. **NestJS BFF 검토** (P1-1): 마플/SOOP 양쪽 타겟에 유효
