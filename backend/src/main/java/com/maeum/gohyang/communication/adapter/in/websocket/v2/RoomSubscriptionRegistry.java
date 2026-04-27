package com.maeum.gohyang.communication.adapter.in.websocket.v2;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.maeum.gohyang.communication.adapter.out.messaging.redis.RoomMessageBus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * roomId → 로컬 sessionId 집합 역인덱스.
 *
 * 책임:
 * - 첫 세션이 방에 들어올 때 {@link RoomMessageBus#ensureRoomSubscribed}를 호출해
 *   Redis 채널 구독을 시작.
 * - 마지막 세션이 방을 떠날 때 {@link RoomMessageBus#removeRoomSubscription}을 호출해
 *   채널 구독을 해제 (채널톡 O(M×N) 함정의 회피 생명줄).
 * - Redis 에서 도착한 raw JSON 을 로컬 세션들에 그대로 fan-out (직렬화 1회).
 *
 * race-safe: {@link Map#compute}로 "set 변경 + bus 호출"을 원자 단위로 수행한다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoomSubscriptionRegistry {

    private final RoomMessageBus bus;
    private final WebSocketSessionRegistry sessionRegistry;

    private final Map<Long, Set<String>> roomToSessions = new ConcurrentHashMap<>();

    public void subscribe(long roomId, String sessionId) {
        roomToSessions.compute(roomId, (id, sessions) -> {
            Set<String> next = (sessions == null) ? ConcurrentHashMap.newKeySet() : sessions;
            boolean wasEmpty = next.isEmpty();
            next.add(sessionId);
            if (wasEmpty) {
                bus.ensureRoomSubscribed(id, this::fanOut);
            }
            return next;
        });
    }

    public void unsubscribe(long roomId, String sessionId) {
        roomToSessions.compute(roomId, (id, sessions) -> {
            if (sessions == null) {
                return null;
            }
            sessions.remove(sessionId);
            if (sessions.isEmpty()) {
                bus.removeRoomSubscription(id);
                return null;
            }
            return sessions;
        });
    }

    public void unsubscribeAll(String sessionId) {
        List<Long> snapshot = new ArrayList<>(roomToSessions.keySet());
        for (Long roomId : snapshot) {
            unsubscribe(roomId, sessionId);
        }
    }

    int roomCount() {
        return roomToSessions.size();
    }

    int sessionCount(long roomId) {
        Set<String> sessions = roomToSessions.get(roomId);
        return sessions == null ? 0 : sessions.size();
    }

    private void fanOut(long roomId, byte[] payload) {
        Set<String> targets = roomToSessions.get(roomId);
        if (targets == null) {
            return;
        }
        TextMessage textMessage = new TextMessage(new String(payload, StandardCharsets.UTF_8));
        for (String sid : targets) {
            sessionRegistry.get(sid).ifPresent(ws -> sendQuietly(ws, textMessage, sid));
        }
    }

    private void sendQuietly(WebSocketSession session, TextMessage message, String sid) {
        if (!session.isOpen()) {
            return;
        }
        try {
            session.sendMessage(message);
        } catch (IOException e) {
            log.warn("Failed to send fan-out to session {}: {}", sid, e.getMessage());
        }
    }
}
