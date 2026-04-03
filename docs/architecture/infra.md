# Infrastructure — 마음의 고향

---

## 1. 로컬 개발 환경

Docker Compose로 외부 인프라를 로컬에서 구동한다.

```yaml
# docker-compose.yml (개발용)
services:
  postgresql:
    image: postgres:17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: maeum
      POSTGRES_USER: maeum
      POSTGRES_PASSWORD: maeum

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  cassandra:
    image: cassandra:4
    ports:
      - "9042:9042"

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      CLUSTER_ID: local-dev-cluster
```

---

## 2. 인프라별 역할

| 인프라 | 용도 | 소유 Context |
|--------|------|-------------|
| PostgreSQL | 핵심 도메인 데이터 (Identity, Village, Economy, Safety) | 다수 |
| Redis | 세션 캐싱, 위치 데이터 캐싱, Pub/Sub (서버 간 WebSocket 동기화) | Village, Identity |
| Cassandra | 채팅 메시지 저장 | Communication |
| Kafka | 도메인 간 비동기 이벤트 | Economy, Safety |

---

## 3. 테스트 환경

통합 테스트에서는 Docker가 아닌 **Testcontainers**를 사용한다. 테스트 실행 시 컨테이너가 자동으로 뜨고 테스트 후 정리된다.

```java
@Testcontainers
class PointWalletIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");
}
```

로컬 Docker Compose와 테스트 환경은 독립적이다. 테스트가 로컬 DB에 의존하지 않는다.