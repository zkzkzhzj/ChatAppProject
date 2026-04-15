package com.maeum.gohyang.communication;

/**
 * WebSocket(STOMP) 토픽 경로 상수.
 * 동일 토픽 문자열이 여러 어댑터에서 사용되므로 상수로 통일한다.
 */
public final class ChatTopics {

    public static final String VILLAGE_CHAT = "/topic/chat/village";

    private ChatTopics() {
    }
}
