package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;

import org.springframework.data.cassandra.repository.CassandraRepository;

public interface MessageCassandraRepository extends CassandraRepository<MessageCassandraEntity, MessageKey> {

    List<MessageCassandraEntity> findTop50ByKeyChatRoomId(long chatRoomId);

    List<MessageCassandraEntity> findTop10ByKeyChatRoomId(long chatRoomId);
}
