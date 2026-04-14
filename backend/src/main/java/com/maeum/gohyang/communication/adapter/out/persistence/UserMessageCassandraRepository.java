package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;

import org.springframework.data.cassandra.repository.CassandraRepository;

public interface UserMessageCassandraRepository
        extends CassandraRepository<UserMessageCassandraEntity, UserMessageKey> {

    /** 특정 유저의 채팅방 메시지를 최신순으로 10개 조회 */
    List<UserMessageCassandraEntity> findTop10ByKeyChatRoomIdAndKeyUserId(
            long chatRoomId, long userId);
}
