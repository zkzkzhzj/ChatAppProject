# Infrastructure — 마음의 고향

---

## 1. 로컬 개발 환경

Docker Compose로 외부 인프라를 로컬에서 구동한다.

```yaml
# docker-compose.yml (개발용 요약)
services:
  postgres:
    # pgvector 확장 포함 — 대화 맥락 요약 벡터 저장용 (V6 마이그레이션 필수)
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: gohyang
      POSTGRES_USER: gohyang
      POSTGRES_PASSWORD: gohyang

  redis:
    # Redis 7.x — 8.0부터 라이선스 변경 (ADR-001 참조)
    image: redis:7.2-alpine

  cassandra:
    image: cassandra:4.1
    environment:
      CASSANDRA_CLUSTER_NAME: gohyang
      CASSANDRA_DC: datacenter1

  kafka:
    # KRaft 모드 (Zookeeper 없음) — apache/kafka 3.7+ 기본 지원 (ADR-001 참조)
    image: apache/kafka:3.7.0
```

전체 설정은 프로젝트 루트의 `docker-compose.yml` 참조.

### Cassandra 초기 세팅 주의사항

Cassandra는 기동 후 keyspace를 별도로 생성해야 한다. `schema-action`은 keyspace가 이미 존재한다고 가정하기 때문이다.

```sql
CREATE KEYSPACE IF NOT EXISTS gohyang
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
```

운영 환경에서는 인프라 프로비저닝 단계에서 실행한다.
테스트 환경에서는 `BaseTestContainers`의 static 블록에서 `CqlSession`으로 자동 생성한다.

---

## 2. 인프라별 역할

| 인프라 | 용도 | 소유 Context |
|--------|------|-------------|
| PostgreSQL | 핵심 도메인 데이터 (Identity, Village, Economy, Safety) + pgvector 대화 맥락 벡터 | 다수 |
| Redis | 세션 캐싱 (현재 미사용, 스케일아웃 시 WebSocket Pub/Sub 교체용으로 도입 예정) | — |
| Cassandra | 채팅 메시지 저장 (파티션 키: chat_room_id) | Communication |
| Kafka | 도메인 간 비동기 이벤트 (현재: `user.registered`, `npc.conversation.summarize`) | Identity → Village, Communication 내부 |

---

## 3. 테스트 환경

통합 테스트에서는 Docker가 아닌 **Testcontainers**를 사용한다. 테스트 실행 시 컨테이너가 자동으로 뜨고 테스트 후 정리된다.

```java
// BaseTestContainers.java
static {
    Startables.deepStart(postgres, redis, kafka, cassandra).join();

    // Cassandra keyspace는 Spring Context 초기화 전에 직접 생성해야 한다
    try (CqlSession session = CqlSession.builder()
            .addContactPoint(cassandra.getContactPoint())
            .withLocalDatacenter("datacenter1")
            .build()) {
        session.execute(
            "CREATE KEYSPACE IF NOT EXISTS gohyang " +
            "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
        );
    }
}
```

로컬 Docker Compose와 테스트 환경은 독립적이다. 테스트가 로컬 DB에 의존하지 않는다.

---

## 4. 이미지 선정 근거

| 인프라 | 이미지 | 이유 |
|--------|--------|------|
| PostgreSQL | `pgvector/pgvector:pg16` | pgvector 확장 포함 (V6 마이그레이션의 `vector(768)` 컬럼 필수) |
| Redis | `redis:7.2-alpine` | 8.0부터 라이선스 변경(RSALv2/SSPLv1)으로 7.x 고정 |
| Cassandra | `cassandra:4.1` | Phase 3 도입 시점 LTS 버전 |
| Kafka | `apache/kafka:3.7.0` | KRaft 모드 기본 지원, Zookeeper 불필요 |
