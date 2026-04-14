package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.NpcConversationContext;

/**
 * NPC 응답 생성 Port.
 * Phase 3: 하드코딩 응답 구현체.
 * Phase 5: Ollama/Claude API 연동 구현체로 교체 예정.
 */
public interface GenerateNpcResponsePort {
    String generate(NpcConversationContext context);
}
