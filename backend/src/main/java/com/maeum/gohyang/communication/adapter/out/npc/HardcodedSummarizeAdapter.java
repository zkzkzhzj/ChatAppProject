package com.maeum.gohyang.communication.adapter.out.npc;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.application.port.out.SummarizeConversationPort;

/**
 * 테스트/CI용 하드코딩 대화 요약 Adapter.
 * LLM 없이 메시지를 단순 이어붙여 요약으로 저장한다.
 */
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "hardcoded", matchIfMissing = true)
public class HardcodedSummarizeAdapter implements SummarizeConversationPort {

    @Override
    public String summarize(List<String> messages) {
        return "최근 대화: " + String.join(" / ", messages);
    }
}
