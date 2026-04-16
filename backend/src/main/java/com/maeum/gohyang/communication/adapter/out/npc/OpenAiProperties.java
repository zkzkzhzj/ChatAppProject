package com.maeum.gohyang.communication.adapter.out.npc;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * OpenAI API 연동 설정.
 *
 * application.yml의 npc.openai.* 프로퍼티를 바인딩한다.
 */
@ConfigurationProperties(prefix = "npc.openai")
public record OpenAiProperties(
        String baseUrl,
        String apiKey,
        String model,
        String embeddingModel,
        int timeoutSeconds,
        int maxConcurrent
) { }
