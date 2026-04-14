package com.maeum.gohyang.communication.adapter.out.npc;

import java.util.List;
import java.util.Random;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.domain.NpcConversationContext;

/**
 * NPC 응답 하드코딩 구현체.
 *
 * npc.adapter=hardcoded(기본값) 또는 미설정 시 활성화된다.
 * Ollama가 설정되지 않은 환경(테스트, CI)에서 사용한다.
 */
@Component
@ConditionalOnProperty(name = "npc.adapter", havingValue = "hardcoded", matchIfMissing = true)
public class HardcodedNpcResponseAdapter implements GenerateNpcResponsePort {

    private static final List<String> RESPONSES = List.of(
            "어서 오세요! 마을에 오신 걸 환영해요. 편히 쉬다 가세요.",
            "오늘 날씨가 참 좋네요. 무슨 이야기든 들을게요.",
            "그런 일이 있으셨군요. 많이 힘드셨겠어요.",
            "맞아요, 가끔은 그냥 누군가와 이야기하고 싶을 때가 있죠.",
            "마을에 와 주셔서 기뻐요. 언제든지 찾아오세요.",
            "천천히 말씀해 주세요. 저 여기 있을게요.",
            "그 마음, 충분히 이해해요.",
            "오늘 하루도 고생 많으셨어요. 여기서는 편하게 쉬세요."
    );

    private final Random random = new Random();

    @Override
    public String generate(NpcConversationContext context) {
        return RESPONSES.get(random.nextInt(RESPONSES.size()));
    }
}
