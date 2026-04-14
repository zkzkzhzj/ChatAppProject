package com.maeum.gohyang.communication.application.port.out;

import java.util.List;

import com.maeum.gohyang.communication.domain.Message;

/**
 * Cassandra에서 채팅방 메시지 히스토리를 조회하는 Port.
 */
public interface LoadMessageHistoryPort {

    /** 채팅방 전체 메시지 최신순 조회 */
    List<Message> loadRecent(long chatRoomId, int limit);

    /** 특정 유저의 메시지만 최신순 조회 (user_message 테이블 사용) */
    List<Message> loadUserRecent(long chatRoomId, long userId, int limit);
}
