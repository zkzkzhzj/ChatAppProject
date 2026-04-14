package com.maeum.gohyang.communication.adapter.out.npc;

import java.util.Collections;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.application.port.out.GenerateEmbeddingPort;

/**
 * 테스트/CI용 임베딩 Adapter.
 * 빈 리스트를 반환하여 recency fallback을 유도한다.
 */
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "hardcoded", matchIfMissing = true)
public class HardcodedEmbeddingAdapter implements GenerateEmbeddingPort {

    @Override
    public List<Float> generate(String text) {
        return Collections.emptyList();
    }
}
