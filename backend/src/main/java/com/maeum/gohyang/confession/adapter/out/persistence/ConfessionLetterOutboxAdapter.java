package com.maeum.gohyang.confession.adapter.out.persistence;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.confession.application.port.out.PublishConfessionLetterEventPort;
import com.maeum.gohyang.global.infra.outbox.OutboxJpaEntity;
import com.maeum.gohyang.global.infra.outbox.OutboxJpaRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ConfessionLetterOutboxAdapter implements PublishConfessionLetterEventPort {

    public static final String LETTER_SENT_EVENT_TYPE = "confession.letter.sent";

    private final OutboxJpaRepository outboxJpaRepository;

    @Override
    public void publishLetterSent(long authorUserId, long confessionId, long letterId) {
        String payload = "{\"authorUserId\":" + authorUserId
                + ",\"confessionId\":" + confessionId
                + ",\"letterId\":" + letterId + "}";
        outboxJpaRepository.save(
                OutboxJpaEntity.pending(String.valueOf(authorUserId), LETTER_SENT_EVENT_TYPE, payload)
        );
    }
}
