# ADR-001: 기술 스택 선정 이유

> 작성일: 2026-04-03
> 상태: 확정

---

## Java 21

LTS(Long Term Support) 버전. 비LTS(18, 19, 20)는 6개월만 지원되고 끝난다. 실서비스 목표이므로 LTS 필수. Virtual Thread, Record Pattern 등 17 대비 생산성 향상.

## Spring Boot 4.x

> 2026-04-04: 3.5 → 4.0.3으로 업그레이드.

Java 17+ 최소 요구. 2.x는 2023년 EOL. Jakarta EE 전환(javax → jakarta) 완료. 새 프로젝트에서 2.x를 쓸 이유 없음.

4.x 선택 이유: Testcontainers 2.x를 Spring BOM이 직접 관리하여 버전 명시가 불필요해짐. `RestClient`가 테스트 HTTP 클라이언트의 표준으로 자리잡음. Spring Framework 7.x 기반의 장기 지원 기반 확보.

트레이드오프: 아직 생태계(서드파티 라이브러리)가 4.x 대응을 완료하지 않은 것들이 있을 수 있으나, 이 프로젝트의 의존성 범위(Cucumber, Testcontainers, JJWT)는 모두 호환 확인됨.

## Gradle Kotlin DSL

Groovy DSL 대비 IDE 자동완성, 타입 안전성 우수. AI 코드 생성 시 빌드 스크립트 오류 감소. 국내 백엔드 진영에서도 표준 채택 흐름.

## PostgreSQL (vs MySQL)

동시성 제어(MVCC)가 더 성숙. MySQL은 undo log 기반, PostgreSQL은 다중 버전 직접 유지. 포인트 차감 같은 동시 쓰기가 많은 도메인에 적합. JSON 타입 지원 우수. 국내 Node.js·풀스택 백엔드 진영의 메이저 스택과 일치.

## Cassandra (vs MongoDB)

채팅 메시지의 특성: write-once, 시간순 조회, 쓰기 빈번, 조회 패턴 고정. 이 특성에 Cassandra가 최적화돼 있음. MongoDB는 유연한 쿼리가 강점이지만 채팅에서는 그 강점이 불필요. Discord의 채팅 저장소 사례 참고. 성능 최적화가 필요한 시점에 ScyllaDB(Cassandra 호환)로 무중단 전환 가능.

## Redis

세션 캐싱, 위치 데이터 캐싱, 서버 간 WebSocket Pub/Sub. 7.x 사용 — Redis 8부터 라이선스가 BSD에서 RSALv2/SSPLv1로 변경됨. 상용 서비스 런칭 목표이므로 라이선스 리스크 회피.

## Kafka

도메인 간 비동기 이벤트 처리. 포인트 알림, 신고→제재 같은 부수 효과를 메인 트랜잭션과 분리. KRaft 모드 지원 버전(Confluent 7.6.0)을 사용하여 Zookeeper 없이 단독 구동 가능.

## Hexagonal Architecture

도메인마다 인프라가 다름 (PostgreSQL, Cassandra, Redis, Kafka). 도메인 로직을 인프라로부터 보호하기 위해 Port/Adapter 구조 채택. 전체 헥사고날 적용으로 프로젝트 일관성 확보. 교조적 적용은 지양하고, 간소화가 필요하면 ADR에 이유를 남기고 조정.

## Next.js (React) + Phaser.js

Next.js: 프론트엔드 프레임워크. 라우팅, SSR 등을 프레임워크가 제공하여 백엔드 개발자가 AI 도움을 받아 작업하기에 적합. Phaser.js: 2D 게임 프레임워크. 인터랙티브 공간(캐릭터 이동, 타일맵, 스프라이트)에 필요. AI 코드 생성과의 궁합이 좋음. React는 일반 UI(로그인, 상점, 설정), Phaser는 공간 렌더링을 담당.

## Phaser.js 선택 이유 (vs PixiJS)

Phaser는 게임 프레임워크로 물리엔진, 씬 관리, 입력 처리가 내장. PixiJS는 렌더링 라이브러리라 이런 것들을 직접 구현해야 함. 백엔드 개발자가 공간을 만드는 상황에서 프레임워크가 잡아주는 게 많을수록 유리.

## 픽셀(도트) 아트

AI 에셋 생성 시 스타일 일관성 유지가 가장 쉬운 아트 스타일. Phaser의 타일맵/스프라이트 시스템과 최적화. "따뜻한 레트로" 감성이 "고향" 컨셉에 부합.
