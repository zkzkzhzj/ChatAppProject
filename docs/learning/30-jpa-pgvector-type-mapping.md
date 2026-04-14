# 30. JPA + pgvector 타입 매핑 — Hibernate 네이티브 벡터 지원까지의 4가지 삽질

> 작성 시점: 2026-04-15
> 맥락: pgvector의 `vector` 타입 컬럼을 JPA Entity에 매핑하려는데, Spring Boot 4.x (Hibernate 7.2.4) 환경에서 예상보다 까다로웠다. 4가지 접근법을 시도한 기록.
> 관련 학습노트: [29. pgvector + 벡터 임베딩 도입기](./29-vector-embedding-pgvector-semantic-search.md)

---

## 배경

NPC 대화 기억을 시맨틱 검색하려면 PostgreSQL에 `vector(768)` 타입 컬럼이 필요하다 ([29번 학습노트](./29-vector-embedding-pgvector-semantic-search.md) 참고). 문제는 JPA/Hibernate가 `vector`라는 타입을 기본적으로 모른다는 것이다.

Java에서 임베딩 데이터는 `float[]`로 다루는데, 이걸 PostgreSQL의 `vector` 타입으로 어떻게 매핑할 것인가? 단순히 `float[]`을 넣으면 Hibernate가 `real[]` (PostgreSQL 배열)로 보내버려서, pgvector의 연산자(`<->`, `<=>` 등)를 쓸 수 없다.

---

## 선택지 비교

| | A. Native INSERT + cast | B. stringtype=unspecified | C. 외부 라이브러리 | D. Hibernate 네이티브 벡터 |
|--|------------------------|--------------------------|-------------------|--------------------------|
| 핵심 아이디어 | SQL에서 직접 `cast(:embedding AS vector)` | JDBC 레벨에서 모든 String 타입 지정 포기 | pgvector-java, hypersistence-utils 등 | `hibernate-vector` 모듈의 `@JdbcTypeCode(SqlTypes.VECTOR)` |
| 장점 | SQL만으로 해결, 추가 의존성 없음 | 한 줄 설정으로 동작 | 커뮤니티에서 검증된 방식 | 프레임워크 네이티브, 타입 안전, 추가 외부 의존성 없음 |
| 단점 | `@Transient` 필드를 Hibernate validate가 체크해서 실패 | **전역 설정**이라 모든 String 파라미터에 영향. 예기치 않은 타입 오류 가능 | Hibernate 7.x에서는 불필요한 의존성 추가 | `hibernate-vector` 모듈을 별도로 추가해야 함 (자동 포함 아님) |
| 동작 여부 | 실패 (SchemaManagementException) | 동작하지만 위험 | 동작하지만 과잉 | 동작, 깔끔 |
| 적합한 상황 | Hibernate를 쓰지 않는 순수 JDBC 환경 | 빠른 PoC, 벡터 컬럼만 있는 단순 스키마 | Hibernate 6.3 이하 (네이티브 지원 없는 버전) | **Hibernate 6.4+ / 7.x 환경 (현재 프로젝트)** |

---

## 각 접근법의 구체적 실패/성공 과정

### A. Native INSERT + @Transient — 실패

첫 번째 시도는 가장 직관적이었다. Entity에서 `embedding` 필드를 `@Transient`로 선언하고, native query에서 직접 캐스팅하면 되지 않을까?

```java
@Transient
private float[] embedding;

// Repository
@Query(value = "INSERT INTO memory ... VALUES (..., cast(:embedding AS vector))", nativeQuery = true)
void saveWithEmbedding(@Param("embedding") String embedding);
```

결과: `SchemaManagementException` 발생. Hibernate의 `validate` 모드가 DB 스키마와 Entity를 대조할 때, `@Transient` 필드는 무시하지만 **DB에 있는 `embedding` 컬럼에 매핑되는 Entity 필드가 없다**고 에러를 던진다. 반대 방향의 문제.

`@Transient`를 빼면 이번에는 Hibernate가 `vector` 타입을 몰라서 또 에러. 진퇴양난.

### B. stringtype=unspecified — 동작하지만 위험

JDBC URL에 `?stringtype=unspecified`를 붙이면, PostgreSQL JDBC 드라이버가 String 파라미터를 보낼 때 타입을 지정하지 않는다. PostgreSQL 서버가 알아서 타입을 추론해준다.

```
jdbc:postgresql://localhost:5432/mydb?stringtype=unspecified
```

이렇게 하면 `"[0.1, 0.2, 0.3]"` 같은 문자열을 보내도 PostgreSQL이 `vector` 컬럼이라는 걸 보고 자동 캐스팅한다. 동작은 한다.

**문제는 "모든" String 파라미터에 영향을 준다는 것.** 예를 들어 `VARCHAR` 컬럼에 숫자 문자열을 넣을 때 PostgreSQL이 `integer`로 추론해버리는 등, 의도치 않은 타입 변환이 발생할 수 있다. 벡터 매핑 하나 때문에 전체 JDBC 동작을 바꾸는 건 부작용 위험이 크다.

### C. 외부 라이브러리 — 과잉

두 가지를 조사했다:

- **pgvector-java (0.1.6)**: pgvector 공식 Java 라이브러리. `PGvector` 타입을 제공하지만, Hibernate 7.x에서는 Hibernate 자체가 벡터를 지원하므로 불필요하다. 오히려 Hibernate의 타입 시스템과 충돌할 수 있다.
- **hypersistence-utils (3.15.0)**: Vlad Mihalcea의 라이브러리로 PostgreSQL의 특수 타입들(JSON, Array, Range 등)을 Hibernate에 매핑해준다. 벡터도 지원하지만, 이 프로젝트에서는 벡터 타입 하나만 필요한데 이 라이브러리는 너무 많은 걸 가져온다. "파리 잡으려고 대포 쏘기".

조사 결과 Hibernate 7.x가 네이티브로 벡터를 지원한다는 걸 알게 되어, 외부 라이브러리는 배제했다.

### D. Hibernate 네이티브 벡터 타입 — 최종 선택

Hibernate 6.4부터 `SqlTypes.VECTOR` (코드: 10000)가 추가되었고, 7.x에서 더 발전했다. 핵심은 **별도 모듈이 필요하다**는 것.

```groovy
// build.gradle.kts
implementation("org.hibernate.orm:hibernate-vector")
// 버전은 Spring Boot BOM이 관리하므로 명시 불필요
```

```java
@JdbcTypeCode(SqlTypes.VECTOR)
@Array(length = 768)
@Column(name = "embedding")
private float[] embedding;
```

이것만으로 Hibernate가 `float[]`을 PostgreSQL의 `vector(768)` 타입으로 정확히 바인딩한다. JPQL에서도 벡터 함수를 쓸 수 있고, Hibernate의 validate 모드도 통과한다.

---

## 이 프로젝트에서 고른 것

**선택: D. Hibernate 네이티브 벡터 타입**

이유:
1. Hibernate ORM 자체 모듈이라 버전 호환성 걱정이 없다. Spring Boot BOM이 버전을 관리해준다.
2. `float[]` 필드에 어노테이션만 붙이면 되므로 코드가 가장 깔끔하다.
3. 외부 라이브러리 의존성이 없어서 공급망 리스크가 낮다.
4. Hibernate의 타입 시스템 안에서 동작하므로 validate 모드, 스키마 생성, 쿼리 바인딩이 모두 정상 작동한다.

---

## 핵심 개념 정리

### SqlTypes.VECTOR란

Hibernate가 내부적으로 SQL 타입을 정수 코드로 관리한다. `SqlTypes.VARCHAR`가 12, `SqlTypes.INTEGER`가 4인 것처럼, `SqlTypes.VECTOR`는 **10000번 코드**로 등록되어 있다. 이 코드를 `@JdbcTypeCode`에 지정하면 Hibernate가 해당 필드를 벡터 타입으로 취급한다.

### hibernate-vector 모듈이 하는 일

`hibernate-core`에는 `SqlTypes.VECTOR` 코드 정의만 있고, **실제로 이 코드를 PostgreSQL의 `vector` 타입으로 변환하는 로직**은 `hibernate-vector` 모듈에 있다. 그래서 모듈 없이 `@JdbcTypeCode(SqlTypes.VECTOR)`만 쓰면 이런 에러가 난다:

```
no type mapping for SqlTypes code: 10000
```

이건 "10000번 코드가 뭔지 모르겠다"는 뜻이다. `hibernate-vector` 모듈이 이 코드에 대한 타입 매핑을 등록해준다.

### @Array(length = 768)의 역할

벡터의 차원 수를 지정한다. 이게 없으면 Hibernate가 벡터의 크기를 모르고, DDL 생성 시 `vector` (크기 미지정)로 만든다. pgvector는 크기가 없어도 동작하지만, **크기를 지정하면 잘못된 차원의 벡터 삽입을 DB 레벨에서 막아준다.**

```
-- @Array(length = 768) 있을 때
embedding vector(768)

-- 없을 때
embedding vector
```

### 동작 흐름

```
float[] [0.1, 0.2, ...768개]
  ↓ JPA persist
Hibernate: @JdbcTypeCode(VECTOR) 확인
  ↓ hibernate-vector 모듈
JDBC PreparedStatement: setObject(idx, pgVector, Types.OTHER)
  ↓ PostgreSQL JDBC Driver
PostgreSQL: vector(768) 컬럼에 저장
```

---

## 실전에서 주의할 점

- **hibernate-vector 모듈을 빼먹기 쉽다.** `SqlTypes.VECTOR`가 `hibernate-core`에 정의되어 있어서 import도 되고 컴파일도 되는데, 런타임에 "no type mapping" 에러가 난다. 에러 메시지만 보면 원인을 찾기 어렵다.
- **stringtype=unspecified는 "동작하니까 넘어가자"의 유혹이 강하다.** 한 줄로 해결되니까 StackOverflow에서도 많이 추천하는데, 프로덕션에서 다른 쿼리에 영향을 줄 수 있다. 특히 동적 쿼리가 많은 프로젝트에서는 위험하다.
- **Hibernate 6.3 이하**를 쓰고 있다면 D 방식은 쓸 수 없다. 그때는 C(외부 라이브러리) 또는 B(stringtype)를 써야 한다.

---

## 나중에 돌아보면

- Hibernate 7.2부터 `VECTOR_FLOAT16`, `VECTOR_BINARY` 같은 추가 벡터 타입도 지원한다. 임베딩 모델이 half-precision (FP16)을 지원하면 스토리지를 절반으로 줄일 수 있다. 벡터 데이터가 수억 건 이상으로 늘어나면 검토할 가치가 있다.
- Spring Data JPA도 최근 **Repository Vector Search Methods**를 도입했다. `findByEmbeddingNear(...)` 같은 메서드 네이밍으로 벡터 검색을 할 수 있다. 현재는 native query로 코사인 유사도를 직접 쓰고 있는데, Spring Data가 안정화되면 전환을 고려할 수 있다.
- pgvector 대신 전용 벡터 DB (Pinecone, Milvus, Weaviate)로 갈 수도 있지만, 현재 규모에서는 PostgreSQL 하나로 관리하는 게 운영 복잡도 면에서 훨씬 낫다.

---

## 더 공부할 거리

- [Hibernate 7.2 What's New — 벡터 관련 변경사항](https://docs.hibernate.org/orm/7.2/whats-new/)
- [Hibernate SqlTypes Javadoc — VECTOR 코드 정의](https://docs.hibernate.org/orm/7.0/javadocs/org/hibernate/type/SqlTypes.html)
- [Spring Data JPA — Repository Vector Search Methods](https://docs.spring.io/spring-data/jpa/reference/repositories/vector-search.html)
- [pgvector-java GitHub — Hibernate 6.x에서의 사용법](https://github.com/pgvector/pgvector-java)
- [Baeldung — Working with Repository Vector Search Methods in Spring Data](https://www.baeldung.com/spring-data-repository-vector-search-methods)
- Hibernate의 커스텀 타입 매핑 구조를 더 깊이 이해하고 싶다면 `JdbcType`, `JavaType`, `TypeContributor` 인터페이스를 파보면 된다. hibernate-vector 모듈이 이 구조를 활용해서 VECTOR 타입을 등록하는 방식을 볼 수 있다.
