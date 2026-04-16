package com.maeum.gohyang.communication.adapter.out.npc;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.maeum.gohyang.communication.application.port.out.GenerateEmbeddingPort;

import lombok.extern.slf4j.Slf4j;

/**
 * OpenAI Embeddings API를 사용한 텍스트 임베딩 생성 Adapter.
 *
 * text-embedding-3-small 모델 기준 768차원 벡터를 반환한다 (dimensions 파라미터로 축소).
 * OpenAI 호출 실패 시 빈 리스트를 반환하여 recency fallback을 유도한다.
 *
 * @see <a href="https://platform.openai.com/docs/api-reference/embeddings">OpenAI Embeddings API</a>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "openai")
@EnableConfigurationProperties(OpenAiProperties.class)
public class OpenAiEmbeddingAdapter implements GenerateEmbeddingPort {

    /** pgvector 스키마(768차원)와 일치시키기 위한 임베딩 차원 수. */
    private static final int EMBEDDING_DIMENSIONS = 768;

    private final RestClient restClient;
    private final OpenAiProperties properties;

    public OpenAiEmbeddingAdapter(OpenAiProperties properties) {
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
    public List<Float> generate(String text) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", properties.embeddingModel(),
                    "input", text,
                    "dimensions", EMBEDDING_DIMENSIONS
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/v1/embeddings")
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                log.warn("OpenAI 임베딩 응답이 null");
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
            if (data == null || data.isEmpty()) {
                log.warn("OpenAI 임베딩 응답에 data 필드 없음");
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<Number> embedding = (List<Number>) data.getFirst().get("embedding");
            if (embedding == null) {
                log.warn("OpenAI 임베딩 응답에 embedding 필드 없음");
                return Collections.emptyList();
            }

            return embedding.stream()
                    .map(Number::floatValue)
                    .toList();
        } catch (Exception e) {
            log.error("OpenAI 임베딩 생성 실패 — recency fallback 사용, error={}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
