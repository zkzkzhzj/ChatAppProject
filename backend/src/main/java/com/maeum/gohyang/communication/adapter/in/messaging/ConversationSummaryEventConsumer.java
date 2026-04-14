package com.maeum.gohyang.communication.adapter.in.messaging;

import java.util.List;
import java.util.UUID;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.out.GenerateEmbeddingPort;
import com.maeum.gohyang.communication.application.port.out.LoadMessageHistoryPort;
import com.maeum.gohyang.communication.application.port.out.SaveConversationMemoryPort;
import com.maeum.gohyang.communication.application.port.out.SummarizeConversationPort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.NpcConversationMemory;
import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;
import com.maeum.gohyang.global.infra.idempotency.IdempotencyGuard;
import com.maeum.gohyang.global.infra.outbox.KafkaEventIdExtractor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * npc.conversation.summarize 이벤트를 수신하여 대화를 요약하고 pgvector에 저장한다.
 *
 * 흐름:
 * 1. user_message 테이블에서 해당 유저의 최근 10개 메시지 직접 조회
 * 2. LLM(SummarizeConversationPort)으로 요약 생성
 * 3. 요약 텍스트의 임베딩 벡터 생성
 * 4. npc_conversation_memory 테이블에 요약 + 임베딩 저장
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConversationSummaryEventConsumer {

    private static final String TOPIC = "npc.conversation.summarize";
    private static final int MESSAGES_TO_SUMMARIZE = 10;

    private final LoadMessageHistoryPort loadMessageHistoryPort;
    private final SummarizeConversationPort summarizeConversationPort;
    private final GenerateEmbeddingPort generateEmbeddingPort;
    private final SaveConversationMemoryPort saveConversationMemoryPort;
    private final IdempotencyGuard idempotencyGuard;
    private final AlertPort alertPort;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = TOPIC)
    @Transactional
    public void handle(ConsumerRecord<String, String> record) {
        log.debug("npc.conversation.summarize 수신: key={}", record.key());
        try {
            UUID idempotencyKey = KafkaEventIdExtractor.extract(record);
            if (idempotencyGuard.isAlreadyProcessed(idempotencyKey)) {
                log.debug("중복 요약 이벤트 무시: key={}", record.key());
                return;
            }

            JsonNode root = objectMapper.readTree(record.value());
            long userId = root.get("userId").asLong();
            long chatRoomId = root.get("chatRoomId").asLong();

            List<Message> userMessages = loadMessageHistoryPort
                    .loadUserRecent(chatRoomId, userId, MESSAGES_TO_SUMMARIZE);

            if (userMessages.isEmpty()) {
                log.warn("요약할 유저 메시지 없음 — userId={}, chatRoomId={}", userId, chatRoomId);
                idempotencyGuard.markAsProcessed(idempotencyKey);
                return;
            }

            List<String> messageTexts = userMessages.stream()
                    .map(Message::getBody)
                    .toList();

            String summary = summarizeConversationPort.summarize(messageTexts);
            List<Float> embedding = generateEmbeddingPort.generate(summary);

            saveConversationMemoryPort.save(
                    NpcConversationMemory.create(userId, summary, userMessages.size(), embedding));

            idempotencyGuard.markAsProcessed(idempotencyKey);
            log.info("대화 요약 저장 완료 — userId={}, messageCount={}, hasEmbedding={}, summary={}",
                    userId, userMessages.size(), !embedding.isEmpty(), summary);
        } catch (Exception e) {
            alertPort.critical(
                    AlertContext.of("communication-consumer", record.key(), record.key()),
                    "npc.conversation.summarize 처리 실패: " + e.getMessage()
            );
            log.error("대화 요약 처리 실패: key={} error={}", record.key(), e.getMessage(), e);
            throw e;
        }
    }
}
