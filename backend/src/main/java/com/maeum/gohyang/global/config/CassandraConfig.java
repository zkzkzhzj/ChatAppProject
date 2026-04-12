package com.maeum.gohyang.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import com.datastax.oss.driver.api.core.CqlSession;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

/**
 * Cassandra keyspace 자동 생성.
 *
 * Spring Data Cassandra의 schema-action은 테이블만 관리하고
 * keyspace는 이미 존재해야 한다. 이 설정이 앱 기동 시
 * keyspace가 없으면 자동으로 생성한다.
 */
@Configuration
@RequiredArgsConstructor
public class CassandraConfig {

    private final CqlSession cqlSession;

    @Value("${spring.cassandra.keyspace-name}")
    private String keyspaceName;

    @PostConstruct
    void createKeyspaceIfNotExists() {
        cqlSession.execute(
                "CREATE KEYSPACE IF NOT EXISTS " + keyspaceName
                        + " WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
                        + " AND durable_writes = true"
        );
    }
}
