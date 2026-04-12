package com.maeum.gohyang.communication.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * 채팅 메시지 Domain Entity.
 * Cassandra에 저장된다. 순수 POJO.
 */
public class Message {

    private final UUID id;
    private final long chatRoomId;
    private final long participantId;
    private final String body;
    private final MessageType messageType;
    private final Instant createdAt;

    private Message(UUID id, long chatRoomId, long participantId,
                    String body, MessageType messageType, Instant createdAt) {
        this.id = id;
        this.chatRoomId = chatRoomId;
        this.participantId = participantId;
        this.body = body;
        this.messageType = messageType;
        this.createdAt = createdAt;
    }

    /** 신규 메시지 생성. id는 즉시 부여된다 (Cassandra TimeUUID 방식). */
    public static Message newMessage(long chatRoomId, long participantId, String body, MessageType messageType) {
        return new Message(UUID.randomUUID(), chatRoomId, participantId, body, messageType, Instant.now());
    }

    /** 영속화된 Message 복원 (Cassandra Adapter → Domain). */
    public static Message restore(UUID id, long chatRoomId, long participantId,
                                  String body, MessageType messageType, Instant createdAt) {
        return new Message(id, chatRoomId, participantId, body, messageType, createdAt);
    }

    public UUID getId() {
        return id;
    }

    public long getChatRoomId() {
        return chatRoomId;
    }

    public long getParticipantId() {
        return participantId;
    }

    public String getBody() {
        return body;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
