package com.maeum.gohyang.communication.adapter.out.npc;

import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.maeum.gohyang.communication.application.port.out.SummarizeConversationPort;

import lombok.extern.slf4j.Slf4j;

/**
 * Ollama LLM을 이용한 대화 요약 Adapter.
 * 최근 대화 목록을 받아 한 문장으로 요약한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "ollama")
@EnableConfigurationProperties(OllamaProperties.class)
public class OllamaSummarizeAdapter implements SummarizeConversationPort {

    private static final String SUMMARIZE_PROMPT = NpcPrompts.SUMMARIZE + "\n대화 내용:\n";

    private final RestClient restClient;
    private final OllamaProperties properties;

    public OllamaSummarizeAdapter(OllamaProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .build();
    }

    @Override
    public String summarize(List<String> messages) {
        String conversationText = String.join("\n", messages);

        List<Map<String, String>> llmMessages = List.of(
                Map.of("role", "system", "content", SUMMARIZE_PROMPT),
                Map.of("role", "user", "content", conversationText)
        );

        Map<String, Object> requestBody = Map.of(
                "model", properties.model(),
                "messages", llmMessages,
                "stream", false,
                "options", Map.of("temperature", 0.3)
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/api/chat")
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return fallbackSummary(messages);
            }

            @SuppressWarnings("unchecked")
            Map<String, String> message = (Map<String, String>) response.get("message");
            if (message == null || message.get("content") == null) {
                return fallbackSummary(messages);
            }

            return message.get("content");
        } catch (Exception e) {
            log.error("대화 요약 LLM 호출 실패 — fallback 요약 사용, error={}", e.getMessage());
            return fallbackSummary(messages);
        }
    }

    private String fallbackSummary(List<String> messages) {
        return "최근 대화: " + String.join(" / ", messages);
    }
}
