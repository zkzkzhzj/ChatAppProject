package com.maeum.gohyang.communication.adapter.out.persistence;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyClass;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyColumn;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Cassandra message 테이블 복합 Primary Key.
 *
 * Partition Key : chat_room_id  — 채팅방 단위로 파티셔닝
 * Clustering Key: created_at DESC, id DESC — 최신 메시지 우선 조회
 *
 * id를 clustering key에 포함하는 이유:
 * 동일 timestamp 충돌 시에도 UUID로 유니크함을 보장한다.
 */
@PrimaryKeyClass
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MessageKey implements Serializable {

    @PrimaryKeyColumn(name = "chat_room_id", ordinal = 0, type = PrimaryKeyType.PARTITIONED)
    private Long chatRoomId;

    @PrimaryKeyColumn(name = "created_at", ordinal = 1, type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private Instant createdAt;

    @PrimaryKeyColumn(name = "id", ordinal = 2, type = PrimaryKeyType.CLUSTERED, ordering = Ordering.DESCENDING)
    private UUID id;
}
