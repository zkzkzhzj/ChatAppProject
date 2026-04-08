package com.maeum.gohyang.communication.adapter.out.persistence;

import org.springframework.data.cassandra.repository.CassandraRepository;

import java.util.List;

public interface MessageCassandraRepository extends CassandraRepository<MessageCassandraEntity, MessageKey> {

    List<MessageCassandraEntity> findTop50ByKeyChatRoomId(long chatRoomId);
}
