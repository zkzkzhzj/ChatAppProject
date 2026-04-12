package com.maeum.gohyang.communication.application.port.in;

/**
 * NPC 채팅방 생성 유스케이스.
 * 채팅방 생성과 동시에 유저(HOST)와 NPC 참여자를 자동 등록한다.
 */
public interface CreateChatRoomUseCase {

    Result execute(Command command);

    record Command(long userId, String displayName) { }

    record Result(long chatRoomId, long participantId) { }
}
