package com.maeum.gohyang.communication.adapter.out.npc;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.domain.NpcConversationContext;

import lombok.extern.slf4j.Slf4j;

/**
 * Ollama REST API 기반 NPC 응답 생성 Adapter.
 *
 * Ollama의 /api/chat 엔드포인트를 호출하여 LLM 응답을 받는다.
 * Semaphore로 동시 호출 수를 제한하여 GPU 자원을 보호한다.
 *
 * @see <a href="https://github.com/ollama/ollama/blob/main/docs/api.md">Ollama API Docs</a>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "ollama")
@EnableConfigurationProperties(OllamaProperties.class)
public class OllamaResponseAdapter implements GenerateNpcResponsePort {

    private static final String FALLBACK_MESSAGE = "아이고, 잠깐 딴 생각을 했나 봐. 다시 한 번 말해줄래?";

    private final RestClient restClient;
    private final OllamaProperties properties;
    private final Semaphore semaphore;

    public OllamaResponseAdapter(OllamaProperties properties) {
        this.properties = properties;
        this.semaphore = new Semaphore(properties.maxConcurrent());
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .build();
    }

    @Override
    public String generate(NpcConversationContext context) {
        boolean acquired = false;
        try {
            acquired = semaphore.tryAcquire(5, TimeUnit.SECONDS);
            if (!acquired) {
                log.warn("Ollama 동시 호출 한도 초과 — fallback 응답 반환");
                return FALLBACK_MESSAGE;
            }
            return callOllama(context);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Ollama 호출 대기 중 인터럽트 — fallback 응답 반환");
            return FALLBACK_MESSAGE;
        } catch (Exception e) {
            log.error("Ollama 호출 실패 — fallback 응답 반환, error={}", e.getMessage(), e);
            return FALLBACK_MESSAGE;
        } finally {
            if (acquired) {
                semaphore.release();
            }
        }
    }

    private String callOllama(NpcConversationContext context) {
        String systemPrompt = buildSystemPrompt(context);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", context.userMessage())
        );

        Map<String, Object> requestBody = Map.of(
                "model", properties.model(),
                "messages", messages,
                "stream", false,
                "options", Map.of(
                        "temperature", 0.7,
                        "top_p", 0.9,
                        "num_predict", 80
                )
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/api/chat")
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            log.warn("Ollama 응답이 null — fallback 응답 반환");
            return FALLBACK_MESSAGE;
        }

        @SuppressWarnings("unchecked")
        Map<String, String> message = (Map<String, String>) response.get("message");
        if (message == null || message.get("content") == null) {
            log.warn("Ollama 응답에 message.content 없음 — fallback 응답 반환");
            return FALLBACK_MESSAGE;
        }

        return message.get("content");
    }

    private String buildSystemPrompt(NpcConversationContext context) {
        if (context.conversationMemories() == null || context.conversationMemories().isEmpty()) {
            return properties.systemPrompt();
        }

        StringBuilder sb = new StringBuilder(properties.systemPrompt());
        sb.append("\n\n이 유저와의 이전 대화 기억:\n");
        for (String memory : context.conversationMemories()) {
            sb.append("- ").append(memory).append("\n");
        }
        sb.append("\n위 기억은 참고용이야. 유저의 현재 질문에만 집중해서 답해.")
          .append("\n기억 내용을 나열하거나 여러 주제를 한꺼번에 말하지 마.")
          .append("\n정말 관련 있는 기억이 있으면 하나만 자연스럽게 섞어서 답해.");
        return sb.toString();
    }
}
