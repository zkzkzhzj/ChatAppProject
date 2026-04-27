package com.maeum.gohyang.communication.adapter.out.messaging.redis;

/**
 * Redis Pub/Sub 채널 네이밍의 단일 진실.
 *
 * `learning/45` §A.1 결정: 방당 1채널 + exact SUBSCRIBE. PSUBSCRIBE/글로벌 채널은
 * 채널톡 O(M×N) 함정을 그대로 재현하므로 금지.
 */
public final class RoomChannelNaming {

    private static final String CHAT_ROOM_PREFIX = "chat:room:";

    private RoomChannelNaming() {
    }

    public static String chatRoomChannel(long roomId) {
        return CHAT_ROOM_PREFIX + roomId;
    }
}
