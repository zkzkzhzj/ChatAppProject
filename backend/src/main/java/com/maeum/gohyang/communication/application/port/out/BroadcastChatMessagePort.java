package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.Message;

/**
 * 채팅 메시지를 실시간으로 브로드캐스트하는 Port.
 *
 * NPC 응답이 비동기로 생성된 후 WebSocket으로 전달할 때 사용한다.
 * Adapter에서 SimpMessagingTemplate을 통해 구현한다.
 */
public interface BroadcastChatMessagePort {

    void broadcastNpcReply(Message npcMessage);
}
