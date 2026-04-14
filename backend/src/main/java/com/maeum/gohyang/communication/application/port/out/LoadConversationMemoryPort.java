package com.maeum.gohyang.communication.application.port.out;

import java.util.List;

import com.maeum.gohyang.communication.domain.NpcConversationMemory;

/**
 * 유저의 대화 요약 맥락을 조회하는 Port.
 * pgvector cosine distance로 유저 메시지와 가장 유사한 요약을 검색한다.
 * 임베딩이 없는 경우 최신순 fallback을 사용한다.
 */
public interface LoadConversationMemoryPort {

    /** 시맨틱 유사도 기반 검색. queryEmbedding이 비어있으면 최신순 fallback. */
    List<NpcConversationMemory> loadSimilar(long userId, List<Float> queryEmbedding, int limit);
}
