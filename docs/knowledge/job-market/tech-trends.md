> append only

## 2026-04-16 -- 3사 JD 공통 기술 트렌드 분석

### 1. 공통 필수 기술

| 기술 | 마플 | SOOP | 네이버/치지직 | 비고 |
|------|:----:|:----:|:------------:|------|
| **Node.js / TypeScript** | O | O (API/NestJS/Global) | - | SOOP 4개 포지션에서 요구 |
| **Java / Spring** | - | O (광고서버/방송시스템) | O | 네이버 핵심 스택 |
| **PostgreSQL** | O | - | - | 마플 주력 DB |
| **Redis** | O | - | O | 캐싱/세션 |
| **Kafka** | - | O (광고서버) | O | 이벤트 드리븐 필수 |
| **Docker / Kubernetes** | O (Docker) | O (K8s) | O (K8s) | 컨테이너 운영 공통 |
| **REST API 설계** | O | O | O | 모든 포지션 공통 |

### 2. 회사별 차별화 기술

#### 마플코퍼레이션
- **함수형 프로그래밍 (FxTS/FxSQL)**: 유일하게 함수형 패러다임을 핵심으로 채택
- **풀스택 개발 문화**: 프론트+백엔드 모두 다루는 것을 기대
- **NestJS + Remix.js**: 모던 Node.js 프레임워크 조합

#### SOOP (숲)
- **C/C++ 시스템 프로그래밍**: 미디어 서버, 방송 시스템에 필수
- **P2P / 네트워크 프로그래밍**: 라이브 방송 특화
- **NestJS**: Global 서비스에서 NestJS 채택
- **Elasticsearch**: 검색/광고 서비스
- **Go**: 글로벌 인프라에서 Go 사용
- **미디어 처리**: Transcoder, Packetizer, 코덱 기술

#### 치지직 (네이버)
- **Kotlin**: Java와 함께 주력 언어로 부상
- **Spring WebFlux**: 리액티브 프로그래밍
- **NCP (Naver Cloud Platform)**: 자체 클라우드 인프라
- **MSA 아키텍처**: 대규모 서비스 운영 표준

### 3. 전체적 트렌드 요약

#### (1) Node.js + NestJS가 스트리밍 업계의 서비스 레이어 표준으로 부상
- SOOP: 웹 API, Global 서비스 모두 Node.js/NestJS 채택
- 마플: NestJS 도입
- 코어 시스템(C/C++)과 서비스 레이어(Node.js)의 이중 구조가 일반적

#### (2) Kafka 기반 이벤트 드리븐 아키텍처가 필수화
- SOOP 광고서버, 네이버 데이터 플랫폼 모두 Kafka 활용
- 하이퍼커넥트 등 스트리밍 기업의 추천 시스템도 Kafka 기반
- 실시간 데이터 파이프라인의 표준 인프라

#### (3) 대용량 트래픽/동시 접속 처리 역량이 핵심 평가 기준
- 3사 모두 "대용량 트랜잭션", "대규모 트래픽", "Scale-out" 키워드 반복
- 성능 최적화, 부하 테스트 경험이 차별화 요소

#### (4) 글로벌 서비스 경험 가치 상승
- SOOP: 글로벌 통합 플랫폼 전략 (2026년)
- 치지직: 글로벌 확장 고려
- 다국어, CDN, 글로벌 인프라 경험 우대

#### (5) 컨테이너/오케스트레이션이 기본 인프라
- Docker는 기본, Kubernetes 운영 경험이 경쟁력
- CI/CD 파이프라인 구축 경험 우대

출처:
- https://www.wanted.co.kr/wd/146262 (SOOP LIVE 방송 시스템)
- https://www.wanted.co.kr/wd/76869 (SOOP 서비스 웹 API)
- https://www.wanted.co.kr/wd/126670 (SOOP Global NestJS)
- https://www.wanted.co.kr/wd/52488 (SOOP 광고서버)
- https://www.wanted.co.kr/wd/128260 (SOOP 글로벌 인프라)
- https://www.wanted.co.kr/wd/29086 (마플 백엔드)
- https://recruit.navercorp.com/micro/teamnaver2025/tech (네이버 공채)
- https://hyperconnect.github.io/2022/01/24/event-driven-recsys.html (하이퍼커넥트 이벤트 드리븐)
- https://www.gamevu.co.kr/news/articleView.html?idxno=55857 (SOOP 2026 전략)
