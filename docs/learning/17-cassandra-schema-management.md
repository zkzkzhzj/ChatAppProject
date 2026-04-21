# 17. Cassandra 스키마 관리 전략 — PostgreSQL과 왜 다른가

> 작성 시점: 2026-04-13
> 맥락: 프로젝트 루트에 `cassandra-init.cql`이 덩그러니 놓여있었다. PostgreSQL은 Flyway가 알아서 하는데, Cassandra만 왜 별도 초기화 스크립트가 필요한가? 이 질문에서 출발해 스키마 관리 방식을 `schema-action` + `CassandraConfig`로 전환했다.

---

## 배경

이 프로젝트는 PostgreSQL과 Cassandra를 함께 쓴다.

- **PostgreSQL** — 유저, 지갑, 채팅방 메타 등 관계형 데이터. Flyway로 스키마를 버전 관리한다.
- **Cassandra** — 채팅 메시지 저장. write-once, 시간순 조회에 최적화된 용도.

PostgreSQL 쪽은 깔끔하다. `V1__initial_schema.sql` 하나로 Flyway가 앱 기동 시 알아서 마이그레이션을 돌린다. 별도 init 컨테이너 같은 게 필요 없다.

그런데 Cassandra 쪽은 달랐다. Docker Compose에 `cassandra-init`이라는 별도 컨테이너를 띄워서 `cassandra-init.cql` 파일을 실행하는 방식이었다. "왜 하나는 앱이 알아서 하고, 하나는 외부 스크립트가 필요하지?"라는 의문이 자연스럽게 생겼다.

### 근본적 차이: RDB vs Cassandra의 스키마 관리 철학

PostgreSQL(RDB)은 **스키마가 데이터의 계약**이다. 테이블 구조가 바뀌면 데이터도 맞춰서 마이그레이션해야 하고, 이 과정을 트랜잭션으로 감쌀 수 있다. DDL이 트랜잭션 안에서 동작하니까 "스키마 변경 실패 → 롤백"이 가능하다. Flyway 같은 도구가 안정적으로 동작할 수 있는 기반이다.

Cassandra는 다르다. **DDL에 트랜잭션이 없다.** `ALTER TABLE`이 실패하면 절반만 적용된 상태가 될 수 있다. 또한 Cassandra의 스키마 변경은 클러스터 전체에 gossip 프로토콜로 전파되는데, 이 과정에서 **일시적으로 노드마다 스키마가 다른 상태**가 발생한다. "schema agreement"라고 부르는 이 동기화가 완료될 때까지 기다려야 한다.

이런 특성 때문에 Cassandra에는 Flyway 같은 "앱이 기동할 때 자동으로 마이그레이션 돌리기" 패턴이 RDB만큼 자연스럽지 않다.

---

## 선택지 비교

| | Docker init CQL | schema-action (Spring Data) | cassandra-migration 라이브러리 | Flyway (Redgate) |
|--|-----------------|----------------------------|-------------------------------|------------------|
| **핵심 개념** | Docker Compose에 init 컨테이너를 띄워서 CQL 스크립트 실행 | Spring Data Cassandra가 `@Table` 엔티티를 스캔해서 DDL 자동 생성 | Flyway 스타일의 버전 관리형 CQL 마이그레이션 | Flyway가 `.cql` 확장자를 지원 (Redgate 에디션) |
| **버전 관리** | 없음. 스크립트가 곧 전부 | 없음. 엔티티 클래스가 곧 스키마 | 있음. `schema_migration` 테이블로 추적 | 있음. Flyway 기본 메커니즘 |
| **keyspace 생성** | 스크립트에 포함 가능 | 불가. 별도 Config 필요 | 불가. keyspace는 미리 존재해야 함 | 불가. keyspace는 미리 존재해야 함 |
| **ALTER TABLE** | 스크립트에 직접 작성 | 불가. 기존 테이블은 그대로 유지됨 | 지원. 새 버전 스크립트로 ALTER 가능 | 지원 |
| **장점** | 앱 코드와 완전 분리, 인프라팀이 관리 가능 | 설정 한 줄이면 끝, 추가 의존성 없음 | 변경 이력 추적 가능, Flyway와 익숙한 패턴 | RDB와 동일한 워크플로우 통일 |
| **단점** | 앱과 스키마가 따로 놀 수 있음, 버전 관리 안 됨 | 스키마 변경(컬럼 추가/삭제) 감지 못 함, 프로덕션 위험 | 커뮤니티 규모 작음, Spring Boot 4.x 호환 미확인 | 유료 (Redgate 에디션), Cassandra 지원은 preview 단계 |
| **적합한 상황** | 인프라를 코드와 분리 관리하는 조직 | 초기 개발, 스키마가 자주 바뀌지 않는 단순 구조 | 프로덕션에서 스키마 변경 이력이 중요한 경우 | 이미 Flyway를 쓰고 있고 Redgate 라이선스가 있는 경우 |
| **실제 사용 사례** | 많은 Cassandra + Docker 프로젝트의 기본 패턴 | Spring Data Cassandra 공식 문서의 기본 예시 | Cobli(브라질 IoT 기업)가 실전 도입 사례 공유 | Redgate 고객사 (2025년 preview 추가) |

---

## 이 프로젝트에서 고른 것

**선택: `schema-action: create_if_not_exists` + `CassandraConfig`에서 keyspace 자동 생성**

이유:

1. **현재 단계에 맞는 복잡도.** Cassandra에 저장하는 건 채팅 메시지 테이블 하나다. 버전 관리형 마이그레이션 도구를 도입하기엔 오버엔지니어링이다.
2. **Docker init CQL의 문제.** `cassandra-init.cql`이 프로젝트 루트에 있으면 앱 코드와 스키마 정의가 따로 논다. Spring Data의 `@Table` 엔티티와 CQL 파일이 각각 스키마를 정의하는 셈이라, 둘이 어긋나면 런타임에서야 알게 된다.
3. **앱이 자기 스키마를 관리하는 원칙.** PostgreSQL은 Flyway가 앱 기동 시 자동으로 돌아가는데, Cassandra만 외부 스크립트에 의존하면 일관성이 깨진다. "앱이 필요한 인프라를 스스로 준비한다"는 원칙을 유지하고 싶었다.
4. **cassandra-migration 라이브러리는 아직 이르다.** `org.cognitor.cassandra:cassandra-migration`이 Flyway 스타일로 동작하지만, Spring Boot 4.x와의 호환성이 검증되지 않았고, 커뮤니티 규모가 작다. 테이블이 늘어나고 스키마 변경이 잦아지면 그때 도입해도 늦지 않다.

---

## 핵심 개념 정리

### keyspace vs table — 왜 별도 Config가 필요한가

Cassandra의 구조를 RDB에 비유하면:

```text
keyspace  ≈  database (PostgreSQL의 gohyang DB)
table     ≈  table
```

Spring Data Cassandra의 `schema-action`은 **테이블만 관리한다.** `create_if_not_exists`로 설정하면 `@Table`이 붙은 엔티티 클래스를 스캔해서 `CREATE TABLE IF NOT EXISTS ...`를 실행한다. 하지만 그 테이블이 들어갈 **keyspace가 이미 존재해야 한다.**

왜 Spring Data가 keyspace까지 안 만들어줄까? keyspace 생성에는 replication 전략(SimpleStrategy vs NetworkTopologyStrategy), replication factor, durable_writes 같은 **인프라 수준의 결정**이 필요하기 때문이다. 이건 앱 레벨의 관심사가 아니라 운영 환경에 따라 달라지는 인프라 설정이다. Spring Data 입장에서 "이걸 내가 결정해도 되나?"라는 판단인 거다.

그래서 우리 프로젝트에서는 `CassandraConfig`를 따로 만들었다:

```java
@PostConstruct
void createKeyspaceIfNotExists() {
    cqlSession.execute(
        "CREATE KEYSPACE IF NOT EXISTS " + keyspaceName
        + " WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
    );
}
```

이 코드가 하는 일은 단순하다. 앱이 뜰 때 keyspace가 없으면 만든다. `SimpleStrategy`에 `replication_factor: 1`은 로컬 개발 환경용 설정이다.

### schema-action의 네 가지 옵션

```text
NONE                  → 아무것도 안 함 (프로덕션 기본값)
CREATE                → 테이블 생성. 이미 있으면 에러
CREATE_IF_NOT_EXISTS  → 테이블 생성. 이미 있으면 무시 (개발용)
RECREATE              → DROP 후 CREATE. 데이터 날아감 (테스트용)
```

**핵심 함정: `CREATE_IF_NOT_EXISTS`는 "이미 있으면 무시"다.** 엔티티에 컬럼을 추가해도 기존 테이블은 그대로다. ALTER TABLE을 실행하지 않는다. 이게 프로덕션에서 위험한 이유다.

---

## 실전에서 주의할 점

### 1. schema-action은 컬럼 변경을 감지하지 못한다

`MessageCassandraEntity`에 `readAt` 필드를 추가했다고 하자. `create_if_not_exists`는 테이블이 이미 있으면 아무것도 안 한다. 새 컬럼은 추가되지 않는다. 개발 중에는 Cassandra 볼륨을 날리고 다시 시작하면 되지만, 프로덕션에서는 이 방식이 통하지 않는다.

### 2. keyspace 생성 시 replication 전략은 환경별로 달라야 한다

현재 `SimpleStrategy`에 `replication_factor: 1`을 쓰고 있다. 이건 단일 노드 개발 환경에서만 적합하다. 프로덕션 다중 데이터센터 환경에서는 반드시 `NetworkTopologyStrategy`를 써야 한다.

### 3. @PostConstruct의 타이밍

`CassandraConfig`의 `@PostConstruct`는 `CqlSession` 빈이 생성된 직후에 실행된다. 이 시점에 Spring Data의 schema-action은 아직 실행되지 않았다. 그래서 keyspace 생성 → 테이블 생성 순서가 자연스럽게 보장된다. 하지만 이 순서가 항상 보장되는지는 Spring의 빈 초기화 순서에 의존한다는 점을 인지해야 한다.

---

## 나중에 돌아보면

### 이 선택이 틀렸다고 느끼는 시점

- Cassandra 테이블이 **3개 이상**으로 늘어날 때
- **컬럼 추가/삭제**가 발생하는 릴리즈가 나올 때
- **여러 개발자**가 동시에 Cassandra 스키마를 변경하는 상황이 올 때

이 시점이 오면 `cassandra-migration` 같은 버전 관리형 도구로 전환해야 한다. `schema-action: none`으로 바꾸고, 모든 DDL을 버전 붙은 CQL 스크립트로 관리하는 방식이다.

### 프로덕션에서는 어떻게 달라져야 하는가

```text
개발 환경 (현재)
├── schema-action: create_if_not_exists
├── CassandraConfig: @PostConstruct로 keyspace 자동 생성
└── 편의성 우선

프로덕션 환경 (미래)
├── schema-action: none
├── keyspace: 인프라 프로비저닝(Terraform, Ansible 등)에서 생성
├── 테이블: cassandra-migration 또는 수동 CQL로 버전 관리
└── 안정성 우선
```

프로덕션에서 `schema-action: create_if_not_exists`를 쓰면 안 되는 이유:

1. **스키마 변경을 감지 못 한다** — 컬럼이 바뀌어도 기존 테이블은 그대로
2. **롤백이 불가능하다** — 어떤 스키마 변경이 언제 적용됐는지 기록이 없다
3. **멀티 인스턴스 배포에서 레이스 컨디션** — 여러 앱 인스턴스가 동시에 CREATE TABLE을 실행하면 schema agreement 문제가 생길 수 있다

---

## 더 공부할 거리

### 공식 문서

- [Spring Data Cassandra — Schema Management](https://docs.spring.io/spring-data/cassandra/reference/cassandra/schema-management.html) — `SchemaAction`의 네 가지 옵션과 동작 방식
- [SchemaAction API (Spring Data Cassandra 4.5.4)](https://docs.spring.io/spring-data/cassandra/docs/current/api/org/springframework/data/cassandra/config/SchemaAction.html) — 각 옵션의 정확한 의미
- [Apache Cassandra — CREATE TABLE](https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/create-table.html) — IF NOT EXISTS의 동작
- [Flyway Cassandra Database Support (Redgate)](https://documentation.red-gate.com/fd/cassandra-database-277579306.html) — Flyway의 Cassandra 지원 현황 (preview)

### 추천 아티클

- [The best way to manage schema migrations in Cassandra (Cobli)](https://medium.com/cobli/the-best-way-to-manage-schema-migrations-in-cassandra-92a34c834824) — cassandra-migration을 실전에 도입한 경험기
- [Cassandra schema migrations on application startup (findinpath)](https://www.findinpath.com/cassandra-migration-spring-boot/) — Spring Boot + cassandra-migration 통합 데모

### 관련 라이브러리

- [cognitor/cassandra-migration](https://github.com/patka/cassandra-migration) — Flyway 스타일의 Cassandra 마이그레이션. Spring Boot Starter 모듈 제공
- [Contrast-Security-OSS/cassandra-migration](https://github.com/Contrast-Security-OSS/cassandra-migration) — 또 다른 포크. plain CQL + Java 기반 마이그레이션 지원
- [Cobliteam/cassandra-migrate](https://github.com/Cobliteam/cassandra-migrate) — Python 기반. Java 프로젝트에는 안 맞지만 설계 철학 참고용

### 이 주제를 더 깊이 파려면

- **Cassandra의 schema agreement** — 클러스터에서 DDL이 전파되는 메커니즘. `nodetool describecluster`로 schema version을 확인하는 법
- **NetworkTopologyStrategy vs SimpleStrategy** — 다중 데이터센터에서 replication을 어떻게 설정하는가
- **RDB와 NoSQL의 스키마 진화(schema evolution) 비교** — RDB는 ALTER TABLE + 마이그레이션, Cassandra는 additive-only가 원칙 (컬럼 추가는 쉽지만 삭제/변경은 위험)
- **Spring Data Cassandra의 프로퍼티 네임스페이스** — Spring Boot 3.x에서 `spring.data.cassandra.*`가 `spring.cassandra.*`로 변경됨. 버전별 차이를 이해하면 설정 삽질을 줄일 수 있다
