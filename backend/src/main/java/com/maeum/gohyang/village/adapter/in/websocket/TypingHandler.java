package com.maeum.gohyang.village.adapter.in.websocket;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.maeum.gohyang.global.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;

/**
 * 유저 타이핑 상태 broadcast 핸들러.
 *
 * 클라이언트가 /app/village/typing 으로 타이핑 상태를 보내면
 * /topic/village/typing 으로 모든 구독자에게 broadcast한다.
 */
@Controller
@RequiredArgsConstructor
public class TypingHandler {

    private static final String TOPIC_TYPING = "/topic/village/typing";

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/village/typing")
    public void handleTyping(@Payload TypingRequest request, Principal principal) {
        if (!(principal instanceof AuthenticatedUser user)) {
            return;
        }

        messagingTemplate.convertAndSend(TOPIC_TYPING, new TypingBroadcastMessage(
                user.displayId(), request.typing()
        ));
    }

    public record TypingRequest(boolean typing) { }

    public record TypingBroadcastMessage(String id, boolean typing) { }
}
