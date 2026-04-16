package com.maeum.gohyang.communication.adapter.out.npc;

/**
 * NPC 어댑터 공통 프롬프트 상수.
 * Ollama/OpenAI 어댑터에서 동일한 프롬프트를 사용한다.
 */
final class NpcPrompts {

    static final String SUMMARIZE = """
            아래 대화 내용을 2~3문장으로 요약해줘.
            요약은 "이 유저는 ~에 대해 이야기했다" 형식으로, 유저의 관심사와 감정을 중심으로 써줘.
            반드시 한국어로만 답변해.
            """;

    private NpcPrompts() {
    }
}
