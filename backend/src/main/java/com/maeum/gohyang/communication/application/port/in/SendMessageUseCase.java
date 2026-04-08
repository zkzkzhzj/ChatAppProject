package com.maeum.gohyang.communication.application.port.in;

import java.time.Instant;
import java.util.UUID;

/**
 * 메시지 전송 유스케이스.
 * 유저 메시지 저장 후 NPC 응답을 생성하여 함께 반환한다.
 */
public interface SendMessageUseCase {

    Result execute(Command command);

    record Command(long userId, long chatRoomId, String body) {}

    record Result(MessageData userMessage, MessageData npcMessage) {}

    record MessageData(UUID id, long participantId, String body, Instant createdAt) {}
}
