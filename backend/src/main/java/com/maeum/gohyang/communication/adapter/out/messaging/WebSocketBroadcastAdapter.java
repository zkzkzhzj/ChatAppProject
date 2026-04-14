package com.maeum.gohyang.communication.adapter.out.messaging;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.adapter.in.web.MessageResponse;
import com.maeum.gohyang.communication.application.port.out.BroadcastChatMessagePort;
import com.maeum.gohyang.communication.domain.Message;

import lombok.RequiredArgsConstructor;

/**
 * WebSocket(STOMP) 기반 메시지 브로드캐스트 Adapter.
 *
 * NPC 응답이 비동기로 생성된 후 /topic/chat/village로 전송한다.
 */
@Component
@RequiredArgsConstructor
public class WebSocketBroadcastAdapter implements BroadcastChatMessagePort {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void broadcastNpcReply(Message npcMessage) {
        messagingTemplate.convertAndSend(
                "/topic/chat/village",
                MessageResponse.fromNpc(npcMessage));
    }
}
