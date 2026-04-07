package com.maeum.gohyang.identity.adapter.out.persistence;

import com.maeum.gohyang.global.infra.outbox.OutboxJpaEntity;
import com.maeum.gohyang.global.infra.outbox.OutboxJpaRepository;
import com.maeum.gohyang.identity.application.port.out.SaveOutboxEventPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OutboxPersistenceAdapter implements SaveOutboxEventPort {

    private static final String USER_REGISTERED_EVENT_TYPE = "user.registered";

    private final OutboxJpaRepository outboxJpaRepository;

    @Override
    public void saveUserRegisteredEvent(Long userId) {
        String payload = "{\"userId\":" + userId + "}";
        outboxJpaRepository.save(
                OutboxJpaEntity.pending(String.valueOf(userId), USER_REGISTERED_EVENT_TYPE, payload)
        );
    }
}
