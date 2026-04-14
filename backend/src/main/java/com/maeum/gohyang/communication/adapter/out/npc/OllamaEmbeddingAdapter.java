package com.maeum.gohyang.communication.adapter.out.npc;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.maeum.gohyang.communication.application.port.out.GenerateEmbeddingPort;

import lombok.extern.slf4j.Slf4j;

/**
 * Ollama /api/embed API를 사용한 텍스트 임베딩 생성 Adapter.
 *
 * nomic-embed-text 모델 기준 768차원 벡터를 반환한다.
 * Ollama 호출 실패 시 빈 리스트를 반환하여 recency fallback을 유도한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "ollama")
@EnableConfigurationProperties(OllamaProperties.class)
public class OllamaEmbeddingAdapter implements GenerateEmbeddingPort {

    private final RestClient restClient;
    private final OllamaProperties properties;

    public OllamaEmbeddingAdapter(OllamaProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .build();
    }

    @Override
    public List<Float> generate(String text) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", properties.embeddingModel(),
                    "input", text
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/api/embed")
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                log.warn("Ollama 임베딩 응답이 null");
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<List<Number>> embeddings = (List<List<Number>>) response.get("embeddings");
            if (embeddings == null || embeddings.isEmpty()) {
                log.warn("Ollama 임베딩 응답에 embeddings 필드 없음");
                return Collections.emptyList();
            }

            return embeddings.getFirst().stream()
                    .map(Number::floatValue)
                    .toList();
        } catch (Exception e) {
            log.error("Ollama 임베딩 생성 실패 — recency fallback 사용, error={}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
