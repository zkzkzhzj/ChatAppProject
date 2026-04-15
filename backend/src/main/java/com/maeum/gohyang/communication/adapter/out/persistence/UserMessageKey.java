package com.maeum.gohyang.communication.adapter.out.persistence;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyClass;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyColumn;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * user_message 테이블 복합 Primary Key.
 *
 * Partition Key : (chat_room_id, user_id) — 유저별 메시지 조회에 최적화
 * Clustering Key: created_at DESC, id DESC — 최신 메시지 우선 조회
 *
 * message 테이블과 동일한 데이터를 유저 기준 쿼리 패턴에 맞게 비정규화한 것이다.
 * Cassandra에서는 쿼리 패턴마다 테이블을 만드는 것이 정석이다.
 */
@PrimaryKeyClass
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserMessageKey implements Serializable {

    @PrimaryKeyColumn(name = "chat_room_id", ordinal = 0, type = PrimaryKeyType.PARTITIONED)
    private Long chatRoomId;

    @PrimaryKeyColumn(name = "user_id", ordinal = 1, type = PrimaryKeyType.PARTITIONED)
    private Long userId;

    @PrimaryKeyColumn(name = "created_at", ordinal = 2, type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private Instant createdAt;

    @PrimaryKeyColumn(name = "id", ordinal = 3, type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private UUID id;
}
