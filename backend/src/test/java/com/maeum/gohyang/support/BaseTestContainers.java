package com.maeum.gohyang.support;

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
 * - Startables.deepStart()로 3개 컨테이너를 병렬 기동해 대기 시간을 줄인다.
 * - @DynamicPropertySource로 컨테이너의 랜덤 포트를 Spring 프로퍼티에 주입한다.
 *   application.yml의 기본값을 Spring Context 초기화 전에 덮어쓴다.
 *
 * 주의:
 * - Cassandra는 기동 시간이 60초 이상 소요되고 현재 관련 코드가 없으므로 포함하지 않는다.
 *   Cassandra 통합 테스트가 필요해지면 별도 슈트에서 추가한다.
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

    static {
        Startables.deepStart(postgres, redis, kafka).join();
    }

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
}
