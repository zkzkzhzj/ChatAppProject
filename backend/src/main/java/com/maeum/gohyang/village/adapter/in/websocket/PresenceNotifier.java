package com.maeum.gohyang.village.adapter.in.websocket;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.maeum.gohyang.global.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 유저 입퇴장 시 채팅 시스템 메시지를 broadcast한다.
 *
 * 게스트: "손님이 입장하셨습니다."
 * 멤버: "이웃이 입장하셨습니다."
 * 퇴장: "손님/이웃이 퇴장하셨습니다."
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceNotifier {

    private static final String TOPIC_CHAT = "/topic/chat/village";

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        if (!(event.getUser() instanceof AuthenticatedUser user)) {
            return;
        }

        String name = user.isGuest() ? "손님" : "이웃";
        broadcast(name + "이 입장하셨습니다.");
        log.debug("입장 알림: {} ({})", user.displayId(), name);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (!(event.getUser() instanceof AuthenticatedUser user)) {
            return;
        }

        String name = user.isGuest() ? "손님" : "이웃";
        broadcast(name + "이 퇴장하셨습니다.");
        log.debug("퇴장 알림: {} ({})", user.displayId(), name);
    }

    private void broadcast(String body) {
        messagingTemplate.convertAndSend(TOPIC_CHAT, new SystemMessage(body));
    }

    /** 프론트엔드가 senderType으로 시스템 메시지를 구분한다. */
    public record SystemMessage(
            String id,
            long participantId,
            Long senderId,
            String senderType,
            String body,
            String createdAt
    ) {
        SystemMessage(String body) {
            this(
                    "system-" + System.currentTimeMillis(),
                    0,
                    null,
                    "SYSTEM",
                    body,
                    java.time.Instant.now().toString()
            );
        }
    }
}
