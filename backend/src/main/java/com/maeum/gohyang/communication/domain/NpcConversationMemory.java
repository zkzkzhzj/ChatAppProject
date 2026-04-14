package com.maeum.gohyang.communication.domain;

import java.time.LocalDateTime;
import java.util.List;

/**
 * NPC 대화 맥락 요약 Domain Entity.
 *
 * 유저별로 N회 대화가 누적되면 LLM이 요약하여 생성한다.
 * 요약 텍스트와 함께 임베딩 벡터를 저장하여 시맨틱 유사도 검색에 사용한다.
 * NPC 응답 시 유저 메시지와 가장 관련 있는 요약을 시스템 프롬프트에 주입한다.
 */
public class NpcConversationMemory {

    private final Long id;
    private final long userId;
    private final String summary;
    private final int messageCount;
    private final List<Float> embedding;
    private final LocalDateTime createdAt;

    private NpcConversationMemory(Long id, long userId, String summary,
                                   int messageCount, List<Float> embedding,
                                   LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.summary = summary;
        this.messageCount = messageCount;
        this.embedding = embedding;
        this.createdAt = createdAt;
    }

    public static NpcConversationMemory create(long userId, String summary,
                                                int messageCount, List<Float> embedding) {
        return new NpcConversationMemory(null, userId, summary, messageCount, embedding, LocalDateTime.now());
    }

    public static NpcConversationMemory restore(Long id, long userId, String summary,
                                                 int messageCount, List<Float> embedding,
                                                 LocalDateTime createdAt) {
        return new NpcConversationMemory(id, userId, summary, messageCount, embedding, createdAt);
    }

    public Long getId() {
        return id;
    }

    public long getUserId() {
        return userId;
    }

    public String getSummary() {
        return summary;
    }

    public int getMessageCount() {
        return messageCount;
    }

    public List<Float> getEmbedding() {
        return embedding;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
