package com.maeum.gohyang.communication.adapter.out.persistence;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.mapping.Column;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

@Table("message")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MessageCassandraEntity {

    @PrimaryKey
    private MessageKey key;

    @Column("participant_id")
    private Long participantId;

    @Column("body")
    private String body;

    @Column("message_type")
    private String messageType;

    public static MessageCassandraEntity from(Message message) {
        MessageCassandraEntity e = new MessageCassandraEntity();
        e.key = new MessageKey(message.getChatRoomId(), message.getCreatedAt(), message.getId());
        e.participantId = message.getParticipantId();
        e.body = message.getBody();
        e.messageType = message.getMessageType().name();
        return e;
    }

    public Message toDomain() {
        return Message.restore(key.getId(), key.getChatRoomId(), participantId,
                body, MessageType.valueOf(messageType), key.getCreatedAt());
    }
}
