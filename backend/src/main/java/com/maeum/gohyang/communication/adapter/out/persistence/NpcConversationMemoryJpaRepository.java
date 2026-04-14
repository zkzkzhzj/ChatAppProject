package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NpcConversationMemoryJpaRepository
        extends JpaRepository<NpcConversationMemoryJpaEntity, Long> {

    /** 최신순 조회 (임베딩 없는 기억 포함, fallback용) */
    List<NpcConversationMemoryJpaEntity> findTop3ByUserIdOrderByCreatedAtDesc(long userId);

    /**
     * 시맨틱 유사도 검색 — pgvector cosine distance.
     * 유저의 메시지 임베딩과 가장 유사한 대화 요약을 찾는다.
     * embedding이 null인 행은 제외한다.
     * queryEmbedding은 문자열로 전달되어 cast()로 vector 변환된다.
     */
    @Query(value = """
            SELECT * FROM npc_conversation_memory
            WHERE user_id = :userId AND embedding IS NOT NULL
            ORDER BY embedding <=> cast(:queryEmbedding AS vector)
            LIMIT :lim
            """, nativeQuery = true)
    List<NpcConversationMemoryJpaEntity> findSimilar(
            @Param("userId") long userId,
            @Param("queryEmbedding") String queryEmbedding,
            @Param("lim") int limit);
}
