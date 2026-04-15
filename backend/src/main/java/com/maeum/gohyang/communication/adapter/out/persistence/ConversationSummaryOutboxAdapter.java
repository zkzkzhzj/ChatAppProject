package com.maeum.gohyang.communication.adapter.out.persistence;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.application.port.out.PublishConversationSummaryEventPort;
import com.maeum.gohyang.global.infra.outbox.OutboxJpaEntity;
import com.maeum.gohyang.global.infra.outbox.OutboxJpaRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ConversationSummaryOutboxAdapter implements PublishConversationSummaryEventPort {

    private static final String EVENT_TYPE = "npc.conversation.summarize";

    private final OutboxJpaRepository outboxJpaRepository;

    @Override
    public void publish(long userId, long chatRoomId) {
        String payload = "{\"userId\":" + userId + ",\"chatRoomId\":" + chatRoomId + "}";
        outboxJpaRepository.save(
                OutboxJpaEntity.pending(String.valueOf(userId), EVENT_TYPE, payload));
    }
}
