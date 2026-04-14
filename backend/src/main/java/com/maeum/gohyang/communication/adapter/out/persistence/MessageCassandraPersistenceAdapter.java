package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.application.port.out.LoadMessageHistoryPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.domain.Message;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class MessageCassandraPersistenceAdapter implements SaveMessagePort, LoadMessageHistoryPort {

    private final MessageCassandraRepository messageRepository;
    private final UserMessageCassandraRepository userMessageRepository;

    @Override
    public Message save(Message message) {
        return messageRepository.save(MessageCassandraEntity.from(message)).toDomain();
    }

    /**
     * 유저 메시지를 message + user_message 테이블에 동시 저장한다.
     * user_message 테이블은 (chatRoomId, userId)로 파티셔닝되어
     * 대화 요약 시 특정 유저 메시지만 효율적으로 조회할 수 있다.
     */
    @Override
    public Message saveWithUser(Message message, long userId) {
        MessageCassandraEntity saved = messageRepository.save(MessageCassandraEntity.from(message));
        userMessageRepository.save(UserMessageCassandraEntity.from(message, userId));
        return saved.toDomain();
    }

    @Override
    public List<Message> loadRecent(long chatRoomId, int limit) {
        List<MessageCassandraEntity> entities = (limit <= 10)
                ? messageRepository.findTop10ByKeyChatRoomId(chatRoomId)
                : messageRepository.findTop50ByKeyChatRoomId(chatRoomId);
        return entities.stream()
                .map(MessageCassandraEntity::toDomain)
                .toList();
    }

    @Override
    public List<Message> loadUserRecent(long chatRoomId, long userId, int limit) {
        return userMessageRepository.findRecent(chatRoomId, userId, limit)
                .stream()
                .map(UserMessageCassandraEntity::toDomain)
                .toList();
    }
}
