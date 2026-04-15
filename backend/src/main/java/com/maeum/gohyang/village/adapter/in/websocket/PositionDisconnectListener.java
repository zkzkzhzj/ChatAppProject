package com.maeum.gohyang.village.adapter.in.websocket;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.maeum.gohyang.global.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * STOMP 세션 종료 시 해당 유저의 퇴장을 broadcast한다.
 *
 * 클라이언트는 userType="LEAVE"인 메시지를 받으면 해당 유저를 화면에서 제거한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PositionDisconnectListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (!(event.getUser() instanceof AuthenticatedUser user)) {
            return;
        }

        PositionBroadcast leave = new PositionBroadcast(
                user.displayId(), PositionUserType.LEAVE, 0, 0
        );
        messagingTemplate.convertAndSend(PositionHandler.TOPIC_POSITIONS, leave);

        log.debug("유저 퇴장 broadcast: {}", user.displayId());
    }
}
