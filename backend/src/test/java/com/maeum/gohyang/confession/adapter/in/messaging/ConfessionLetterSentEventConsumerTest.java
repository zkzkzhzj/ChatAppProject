package com.maeum.gohyang.confession.adapter.in.messaging;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.IdempotencyGuard;

import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class ConfessionLetterSentEventConsumerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private IdempotencyGuard idempotencyGuard;

    @Mock
    private AlertPort alertPort;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private ConfessionLetterSentEventConsumer consumer;

    @BeforeEach
    void setUp() {
        consumer = new ConfessionLetterSentEventConsumer(
                messagingTemplate,
                idempotencyGuard,
                alertPort,
                objectMapper
        );
    }

    private ConsumerRecord<String, String> letterSentRecord() {
        return new ConsumerRecord<>(
                "confession.letter.sent",
                0,
                0L,
                "1",
                "{\"authorUserId\":1,\"confessionId\":10,\"letterId\":100}"
        );
    }

    @Test
    @DisplayName("새 마음 이벤트는 작성자 개인 우편 큐로 전송된다")
    void 새_마음_이벤트는_작성자_개인_우편_큐로_전송된다() {
        when(idempotencyGuard.tryAcquire(any(UUID.class))).thenReturn(true);

        consumer.handle(letterSentRecord());

        verify(messagingTemplate).convertAndSendToUser(
                eq("1"),
                eq("/queue/mail"),
                any(ConfessionLetterSentEventConsumer.MailNotificationMessage.class)
        );
    }

    @Test
    @DisplayName("중복 이벤트는 우편 큐로 재전송하지 않는다")
    void 중복_이벤트는_우편_큐로_재전송하지_않는다() {
        when(idempotencyGuard.tryAcquire(any(UUID.class))).thenReturn(false);

        consumer.handle(letterSentRecord());

        verify(messagingTemplate, never()).convertAndSendToUser(any(), any(), any());
    }
}
