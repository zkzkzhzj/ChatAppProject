package com.maeum.gohyang.communication.adapter.out.messaging.redis;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol.OutboundFrame;
import com.maeum.gohyang.communication.error.BroadcastSerializationException;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

/**
 * Redis Pub/Sub 기반 {@link RoomMessageBus} 구현체.
 *
 * 설계 원칙 ({@code learning/45} §A.1, §B.3):
 * - 방당 1채널 + exact {@code SUBSCRIBE} 만 사용. {@code PSUBSCRIBE} 금지.
 * - 자기 JVM 에 접속자가 있는 방만 구독 → 채널톡 O(M×N) 함정 회피.
 * - 받은 payload 는 그대로 역직렬화하여 콜백에 전달, 실제 fan-out 은 호출자가 담당.
 */
@Component
@RequiredArgsConstructor
public class RedisChatRelay implements RoomMessageBus {

    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;
    private final ObjectMapper objectMapper;

    /** 방별 등록된 listener. {@code computeIfAbsent}로 중복 등록 차단. */
    private final Map<Long, MessageListener> roomListeners = new ConcurrentHashMap<>();

    @Override
    public void publish(long roomId, OutboundFrame event) {
        String channel = RoomChannelNaming.chatRoomChannel(roomId);
        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            throw new BroadcastSerializationException(e);
        }
        redisTemplate.convertAndSend(channel, payload);
    }

    @Override
    public void ensureRoomSubscribed(long roomId, RoomMessageHandler handler) {
        roomListeners.computeIfAbsent(roomId, id -> {
            MessageListener listener = (message, pattern) ->
                    handler.onMessage(id, message.getBody());
            listenerContainer.addMessageListener(listener,
                    new ChannelTopic(RoomChannelNaming.chatRoomChannel(id)));
            return listener;
        });
    }

    @Override
    public void removeRoomSubscription(long roomId) {
        MessageListener listener = roomListeners.remove(roomId);
        if (listener != null) {
            listenerContainer.removeMessageListener(listener,
                    new ChannelTopic(RoomChannelNaming.chatRoomChannel(roomId)));
        }
    }
}
