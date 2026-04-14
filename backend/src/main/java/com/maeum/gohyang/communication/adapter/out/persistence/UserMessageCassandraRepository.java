package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;

import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;

public interface UserMessageCassandraRepository
        extends CassandraRepository<UserMessageCassandraEntity, UserMessageKey> {

    /** 특정 유저의 채팅방 메시지를 최신순으로 limit개 조회 */
    @Query("SELECT * FROM user_message WHERE chat_room_id = ?0 AND user_id = ?1 LIMIT ?2")
    List<UserMessageCassandraEntity> findRecent(long chatRoomId, long userId, int limit);
}
