---
title: 로컬 인프라
tags: [infra, docker, postgres, redis, cassandra, kafka]
related: [infra/outbox-pattern.md]
last-verified: 2026-04-15
---

# 로컬 인프라 (Docker Compose)

## 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| postgres | pgvector/pgvector:pg16 | 5432 | 메인 RDBMS (Identity, Village, Economy, Safety) + pgvector 확장 (NPC 대화 임베딩) |
| redis | redis:7.2-alpine | 6379 | 캐시, 세션, Pub/Sub (스케일아웃 시) |
| cassandra | cassandra:4.1 | 9042 | 채팅 메시지 저장 |
| kafka | apache/kafka:3.7.0 | 9092 | 도메인 간 이벤트 (KRaft, ZK 없음) |
| cassandra-init | cassandra:4.1 | - | `cassandra-init.cql` 실행 후 종료 |
| app | backend/Dockerfile | 8080 | Spring Boot (docker 프로파일) |

## 자주 쓰는 명령

```bash
docker-compose up --build     # 전체 빌드 후 시작
docker-compose up -d          # 백그라운드 실행
docker-compose down           # 종료 (볼륨 유지)
docker-compose down -v        # 종료 + 볼륨 삭제 (데이터 초기화)
```

## 포트 충돌 해결

`.env` 파일로 오버라이드:

```
POSTGRES_PORT=5433
REDIS_PORT=6380
KAFKA_PORT=9093
```

## 프로파일

- **기본 (application.yml)**: localhost 접속 — 인프라만 Docker로 띄울 때
- **docker (application-docker.yml)**: 서비스명으로 접속 — app 컨테이너 포함 전체 실행 시

## Redis 버전 고정 이유

Redis 8.0부터 라이선스가 BSD → RSALv2/SSPLv1로 변경. 상업 사용 제한 가능성 → 7.x 고정 (ADR-001).

## Cassandra 초기화

`cassandra-init.cql`:
- `gohyang` keyspace 생성 (SimpleStrategy, RF=1)
- `gohyang.message` 테이블 생성

Cassandra는 초기 기동에 최대 60초 소요. `cassandra-init` 서비스는 `service_healthy` 조건 후 실행.
