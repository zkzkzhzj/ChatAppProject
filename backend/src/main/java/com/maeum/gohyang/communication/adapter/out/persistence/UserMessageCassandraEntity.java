package com.maeum.gohyang.communication.adapter.out.persistence;

import org.springframework.data.cassandra.core.mapping.Column;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 유저별 메시지 조회용 Cassandra 비정규화 테이블.
 *
 * message 테이블과 동일한 데이터를 (chat_room_id, user_id) 파티션으로 저장한다.
 * 대화 요약 시 특정 유저의 메시지만 효율적으로 조회하기 위해 사용된다.
 */
@Table("user_message")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserMessageCassandraEntity {

    @PrimaryKey
    private UserMessageKey key;

    @Column("participant_id")
    private Long participantId;

    @Column("body")
    private String body;

    @Column("message_type")
    private String messageType;

    public static UserMessageCassandraEntity from(Message message, long userId) {
        UserMessageCassandraEntity e = new UserMessageCassandraEntity();
        e.key = new UserMessageKey(message.getChatRoomId(), userId,
                message.getCreatedAt(), message.getId());
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
