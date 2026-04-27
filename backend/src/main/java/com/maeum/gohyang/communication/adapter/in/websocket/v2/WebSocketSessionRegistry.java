package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

/**
 * sessionId → {@link WebSocketSession} 매핑.
 *
 * 핸들러가 콜백마다 직접 session 을 들고 있으므로 등록 자체는 단순하지만, fan-out 시점에
 * 다른 컴포넌트({@code RoomSubscriptionRegistry})가 sessionId 만으로 세션을 찾을 수 있어야
 * 하므로 단일 진실로 끌어낸다.
 */
@Component
public class WebSocketSessionRegistry {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public void register(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    public Optional<WebSocketSession> get(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    public int size() {
        return sessions.size();
    }
}
