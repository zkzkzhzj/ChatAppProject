package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.application.port.out.LoadConversationMemoryPort;
import com.maeum.gohyang.communication.application.port.out.SaveConversationMemoryPort;
import com.maeum.gohyang.communication.domain.NpcConversationMemory;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ConversationMemoryPersistenceAdapter
        implements SaveConversationMemoryPort, LoadConversationMemoryPort {

    private final NpcConversationMemoryJpaRepository repository;

    @Override
    public NpcConversationMemory save(NpcConversationMemory memory) {
        return repository.save(NpcConversationMemoryJpaEntity.from(memory)).toDomain();
    }

    /**
     * 시맨틱 유사도 검색. 임베딩이 비어있으면 최신순 fallback.
     * fallback은 임베딩 모델 미사용 환경(테스트, hardcoded 모드)을 위한 것이다.
     */
    @Override
    public List<NpcConversationMemory> loadSimilar(long userId, List<Float> queryEmbedding, int limit) {
        if (queryEmbedding == null || queryEmbedding.isEmpty()) {
            return repository.findTop3ByUserIdOrderByCreatedAtDesc(userId).stream()
                    .map(NpcConversationMemoryJpaEntity::toDomain)
                    .toList();
        }

        String vectorStr = NpcConversationMemoryJpaEntity.toVectorString(queryEmbedding);
        return repository.findSimilar(userId, vectorStr, limit).stream()
                .map(NpcConversationMemoryJpaEntity::toDomain)
                .toList();
    }
}
