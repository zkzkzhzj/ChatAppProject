package com.maeum.gohyang.communication.adapter.out.npc;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.maeum.gohyang.communication.application.port.out.SummarizeConversationPort;

import lombok.extern.slf4j.Slf4j;

/**
 * OpenAI Chat Completions API를 이용한 대화 요약 Adapter.
 * 최근 대화 목록을 받아 한 문장으로 요약한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "openai")
@EnableConfigurationProperties(OpenAiProperties.class)
public class OpenAiSummarizeAdapter implements SummarizeConversationPort {

    private static final String SUMMARIZE_PROMPT = NpcPrompts.SUMMARIZE;

    private final RestClient restClient;
    private final OpenAiProperties properties;

    public OpenAiSummarizeAdapter(OpenAiProperties properties) {
        this.properties = properties;
        Duration timeout = Duration.ofSeconds(properties.timeoutSeconds());
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(timeout).build());
        requestFactory.setReadTimeout(timeout);
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .defaultHeader("Authorization", "Bearer " + properties.apiKey())
                .requestFactory(requestFactory)
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
                "temperature", 0.3,
                "max_tokens", 200
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/v1/chat/completions")
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return fallbackSummary(messages);
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                return fallbackSummary(messages);
            }

            @SuppressWarnings("unchecked")
            Map<String, String> message = (Map<String, String>) choices.getFirst().get("message");
            if (message == null || message.get("content") == null) {
                return fallbackSummary(messages);
            }

            return message.get("content");
        } catch (Exception e) {
            log.error("대화 요약 OpenAI 호출 실패 — fallback 요약 사용, error={}", e.getMessage());
            return fallbackSummary(messages);
        }
    }

    private String fallbackSummary(List<String> messages) {
        return "최근 대화: " + String.join(" / ", messages);
    }
}
