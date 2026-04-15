package com.maeum.gohyang.communication.application.port.out;

import java.util.List;

/**
 * 대화 내용을 요약하는 Port.
 * LLM을 호출하여 여러 메시지를 하나의 요약 텍스트로 압축한다.
 */
public interface SummarizeConversationPort {

    String summarize(List<String> messages);
}
