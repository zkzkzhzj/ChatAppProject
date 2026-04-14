package com.maeum.gohyang.communication.adapter.out.npc;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Ollama 연동 설정.
 *
 * application.yml의 npc.ollama.* 프로퍼티를 바인딩한다.
 */
@ConfigurationProperties(prefix = "npc.ollama")
public record OllamaProperties(
        String baseUrl,
        String model,
        String embeddingModel,
        int timeoutSeconds,
        int maxConcurrent,
        String systemPrompt
) { }
