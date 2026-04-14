package com.maeum.gohyang.communication.domain;

import java.util.List;

/**
 * NPC 응답 생성에 필요한 대화 맥락.
 *
 * conversationMemories: pgvector에서 조회한 최근 대화 요약 목록.
 * NPC가 유저와의 과거 대화를 기억하는 데 사용된다.
 */
public record NpcConversationContext(
        long chatRoomId,
        long npcParticipantId,
        long userId,
        String userMessage,
        List<String> conversationMemories
) {

    /** 맥락 없는 간편 생성 (하위 호환). */
    public NpcConversationContext(long chatRoomId, long npcParticipantId,
                                  long userId, String userMessage) {
        this(chatRoomId, npcParticipantId, userId, userMessage, List.of());
    }
}

