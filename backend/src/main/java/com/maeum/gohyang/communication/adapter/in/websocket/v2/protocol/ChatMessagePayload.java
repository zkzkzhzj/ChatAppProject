package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

import java.time.Instant;
import java.util.UUID;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.communication.domain.Message;

/**
 * MESSAGE event의 payload — 채팅 한 건을 표현한다.
 *
 * 모양은 REST 응답({@code MessageResponse})과 의도적으로 일치시킨다. 클라이언트가
 * REST/WS 두 경로에서 같은 모양의 메시지를 받게 해 표시 로직을 통일하기 위함.
 */
public record ChatMessagePayload(
        UUID id,
        long participantId,
        @Nullable Long senderId,
        String senderType,
        String body,
        Instant createdAt
) {

    public static ChatMessagePayload fromUser(Message message, long senderId) {
        return new ChatMessagePayload(
                message.getId(),
                message.getParticipantId(),
                senderId,
                "USER",
                message.getBody(),
                message.getCreatedAt()
        );
    }

    public static ChatMessagePayload fromNpc(Message message) {
        return new ChatMessagePayload(
                message.getId(),
                message.getParticipantId(),
                null,
                "NPC",
                message.getBody(),
                message.getCreatedAt()
        );
    }

    /**
     * 시스템 메시지 (입퇴장 알림 등). 영속 X — Cassandra 에 저장하지 않는다.
     * V1 {@code PresenceNotifier.SystemMessage} 와 모양이 동일하다.
     */
    public static ChatMessagePayload system(String body) {
        return new ChatMessagePayload(
                UUID.randomUUID(),
                0L,
                null,
                "SYSTEM",
                body,
                Instant.now()
        );
    }
}
