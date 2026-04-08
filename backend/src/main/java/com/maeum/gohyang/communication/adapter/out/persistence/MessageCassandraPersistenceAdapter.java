package com.maeum.gohyang.communication.adapter.out.persistence;

import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.domain.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MessageCassandraPersistenceAdapter implements SaveMessagePort {

    private final MessageCassandraRepository messageRepository;

    @Override
    public Message save(Message message) {
        return messageRepository.save(MessageCassandraEntity.from(message)).toDomain();
    }
}
