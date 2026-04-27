package com.maeum.gohyang.communication.adapter.out.messaging;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.maeum.gohyang.communication.ChatTopics;
import com.maeum.gohyang.communication.adapter.in.web.MessageResponse;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;

/**
 * STOMP 브로드캐스트 어댑터의 회귀 안전망. ws-redis 트랙에서 Redis 어댑터를 추가하면서
 * V1 어댑터가 같은 토픽·같은 페이로드 모양을 유지하는지 검증한다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WebSocketBroadcastAdapter — STOMP NPC 브로드캐스트")
class WebSocketBroadcastAdapterTest {

    @Mock SimpMessagingTemplate messagingTemplate;
    @InjectMocks WebSocketBroadcastAdapter adapter;

    @Test
    void NPC_응답은_VILLAGE_CHAT_토픽으로_NPC_타입_payload로_전송된다() {
        // Given
        Message npcMessage = Message.restore(
                UUID.randomUUID(), 1L, 7L, "마음을 잘 들었어요",
                MessageType.TEXT, Instant.now());

        // When
        adapter.broadcastNpcReply(npcMessage);

        // Then
        MessageResponse expected = MessageResponse.fromNpc(npcMessage);
        verify(messagingTemplate).convertAndSend(eq(ChatTopics.VILLAGE_CHAT), eq(expected));
    }
}
