package com.maeum.gohyang.communication.application.service;

import java.util.List;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.maeum.gohyang.communication.application.port.out.BroadcastChatMessagePort;
import com.maeum.gohyang.communication.application.port.out.GenerateEmbeddingPort;
import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.application.port.out.LoadConversationMemoryPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.domain.NpcConversationContext;
import com.maeum.gohyang.communication.domain.NpcConversationMemory;
import com.maeum.gohyang.global.alert.AlertContext;
import com.maeum.gohyang.global.alert.AlertPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * NPC 응답 비동기 생성 서비스.
 *
 * 유저 메시지 저장 후 별도 스레드에서 실행된다.
 * 유저 메시지를 임베딩하여 pgvector cosine distance로 가장 관련 있는
 * 대화 요약을 검색하고, 맥락을 주입한 뒤 NPC 응답을 생성한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NpcReplyService {

    private static final int MAX_MEMORY_COUNT = 3;
    private static final String NPC_FALLBACK_MESSAGE = "죄송해요, 지금은 대화하기 어려운 상태예요. 잠시 후 다시 말을 걸어주세요.";

    private final GenerateNpcResponsePort generateNpcResponsePort;
    private final SaveMessagePort saveMessagePort;
    private final BroadcastChatMessagePort broadcastChatMessagePort;
    private final LoadConversationMemoryPort loadConversationMemoryPort;
    private final GenerateEmbeddingPort generateEmbeddingPort;
    private final AlertPort alertPort;

    @Async
    public void replyAsync(NpcConversationContext context) {
        log.info("NPC 응답 생성 시작 — chatRoomId={}, userId={}", context.chatRoomId(), context.userId());
        log.debug("NPC 요청 원문 — userMessage={}", context.userMessage());
        try {
            List<Float> queryEmbedding = generateEmbeddingPort.generate(context.userMessage());

            List<String> memories = loadConversationMemoryPort
                    .loadSimilar(context.userId(), queryEmbedding, MAX_MEMORY_COUNT).stream()
                    .map(NpcConversationMemory::getSummary)
                    .toList();

            NpcConversationContext enrichedContext = new NpcConversationContext(
                    context.chatRoomId(), context.npcParticipantId(),
                    context.userId(), context.userMessage(), memories);

            String npcResponseText = generateNpcResponsePort.generate(enrichedContext);
            log.info("NPC 응답 생성 완료 — chatRoomId={}", context.chatRoomId());
            log.debug("NPC 응답 원문 — response={}", npcResponseText);

            Message npcMessage = saveMessagePort.save(
                    Message.newMessage(
                            context.chatRoomId(),
                            context.npcParticipantId(),
                            npcResponseText,
                            MessageType.TEXT));

            broadcastChatMessagePort.broadcastNpcReply(npcMessage);
        } catch (Exception e) {
            log.error("NPC 응답 생성 실패 — chatRoomId={}, error={}",
                    context.chatRoomId(), e.getMessage(), e);
            alertPort.warning(
                    AlertContext.of("npc-reply", null, String.valueOf(context.userId())),
                    "NPC 응답 생성 실패 — chatRoomId=" + context.chatRoomId());

            // 유저에게 시스템 메시지로 피드백
            broadcastChatMessagePort.broadcastNpcReply(
                    Message.newMessage(
                            context.chatRoomId(),
                            context.npcParticipantId(),
                            NPC_FALLBACK_MESSAGE,
                            MessageType.TEXT));
        }
    }
}
