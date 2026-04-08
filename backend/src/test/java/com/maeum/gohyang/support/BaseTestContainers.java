package com.maeum.gohyang.support;

import com.datastax.oss.driver.api.core.CqlSession;
import org.testcontainers.cassandra.CassandraContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;


/**
 * 통합 테스트용 컨테이너 기반 클래스.
 *
 * 역할:
 * - 컨테이너를 "언제, 어떻게 기동하는가"를 한 곳에서 관리한다.
 * - 정적 초기화 블록으로 컨테이너를 JVM당 한 번만 기동한다.
 *   이 클래스를 extends하는 테스트가 몇 개든 컨테이너는 한 번만 뜬다.
 * - Startables.deepStart()로 4개 컨테이너를 병렬 기동해 대기 시간을 줄인다.
 * - @DynamicPropertySource로 컨테이너의 랜덤 포트를 Spring 프로퍼티에 주입한다.
 *   application.yml의 기본값을 Spring Context 초기화 전에 덮어쓴다.
 *
 * Cassandra:
 * - Phase 3 (Communication) 구현으로 추가됐다.
 * - 기동 후 CQL로 keyspace를 먼저 생성한다. Spring Data Cassandra는 keyspace가
 *   존재해야 schema-action(create-if-not-exists)으로 테이블을 생성할 수 있다.
 */
public abstract class BaseTestContainers {

    protected static final PostgreSQLContainer postgres =
            new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"))
                    .withDatabaseName("gohyang")
                    .withUsername("gohyang")
                    .withPassword("gohyang");

    // Redis 7.x 고정 — 8.0부터 라이선스 변경 (ADR-001 참조)
    protected static final GenericContainer<?> redis =
            new GenericContainer<>(DockerImageName.parse("redis:7.2-alpine"))
                    .withExposedPorts(6379);

    protected static final KafkaContainer kafka =
            new KafkaContainer(DockerImageName.parse("apache/kafka:3.7.0"));

    protected static final CassandraContainer cassandra =
            new CassandraContainer(DockerImageName.parse("cassandra:4.1"));

    static {
        Startables.deepStart(postgres, redis, kafka, cassandra).join();

        // getContactPoint()가 이미 InetSocketAddress(host, mappedPort)를 반환한다.
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

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("spring.cassandra.contact-points",
                () -> cassandra.getContactPoint().getAddress().getHostAddress());
        registry.add("spring.cassandra.port",
                () -> cassandra.getContactPoint().getPort());
        registry.add("spring.cassandra.local-datacenter", () -> "datacenter1");
        registry.add("spring.cassandra.keyspace-name", () -> "gohyang");
        registry.add("spring.cassandra.schema-action", () -> "create-if-not-exists");
    }
}
