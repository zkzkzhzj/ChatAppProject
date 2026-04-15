package com.maeum.gohyang.communication.application.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.communication.application.port.out.BroadcastChatMessagePort;
import com.maeum.gohyang.communication.application.port.out.GenerateEmbeddingPort;
import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.application.port.out.LoadConversationMemoryPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.NpcConversationContext;
import com.maeum.gohyang.global.alert.AlertPort;

@ExtendWith(MockitoExtension.class)
class NpcReplyServiceTest {

    @Mock GenerateNpcResponsePort generateNpcResponsePort;
    @Mock SaveMessagePort saveMessagePort;
    @Mock BroadcastChatMessagePort broadcastChatMessagePort;
    @Mock LoadConversationMemoryPort loadConversationMemoryPort;
    @Mock GenerateEmbeddingPort generateEmbeddingPort;
    @Mock AlertPort alertPort;

    @InjectMocks NpcReplyService npcReplyService;

    private static final long CHAT_ROOM_ID = 1L;
    private static final long NPC_PARTICIPANT_ID = 1L;

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("NPC 응답을 생성하고 저장한 뒤 브로드캐스트한다")
        void NPC_응답을_생성하고_저장한_뒤_브로드캐스트한다() {
            // Given
            NpcConversationContext context = new NpcConversationContext(
                    CHAT_ROOM_ID, NPC_PARTICIPANT_ID, 42L, "안녕하세요");
            given(generateEmbeddingPort.generate(any(String.class))).willReturn(List.of());
            given(loadConversationMemoryPort.loadSimilar(anyLong(), any(), anyInt())).willReturn(List.of());
            given(generateNpcResponsePort.generate(any(NpcConversationContext.class))).willReturn("NPC 응답");
            given(saveMessagePort.save(any(Message.class))).willAnswer(inv -> inv.getArgument(0));

            // When
            npcReplyService.replyAsync(context);

            // Then
            verify(generateNpcResponsePort).generate(any(NpcConversationContext.class));
            verify(saveMessagePort).save(any(Message.class));
            verify(broadcastChatMessagePort).broadcastNpcReply(any(Message.class));
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("NPC 응답 생성 실패 시 에러 시스템 메시지를 브로드캐스트한다")
        void NPC_응답_생성_실패_시_에러_시스템_메시지를_브로드캐스트한다() {
            // Given
            NpcConversationContext context = new NpcConversationContext(
                    CHAT_ROOM_ID, NPC_PARTICIPANT_ID, 42L, "안녕하세요");
            given(generateEmbeddingPort.generate(any(String.class))).willReturn(List.of());
            given(loadConversationMemoryPort.loadSimilar(anyLong(), any(), anyInt())).willReturn(List.of());
            given(generateNpcResponsePort.generate(any(NpcConversationContext.class)))
                    .willThrow(new RuntimeException("LLM 연결 실패"));

            // When — 예외가 밖으로 전파되지 않아야 한다
            npcReplyService.replyAsync(context);

            // Then — 정상 저장은 안 되지만, 에러 피드백 메시지는 브로드캐스트된다
            verify(saveMessagePort, never()).save(any());
            verify(broadcastChatMessagePort).broadcastNpcReply(any(Message.class));
            verify(alertPort).warning(any(), any());
        }
    }
}
