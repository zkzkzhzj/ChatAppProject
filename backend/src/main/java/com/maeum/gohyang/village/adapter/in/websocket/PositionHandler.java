package com.maeum.gohyang.village.adapter.in.websocket;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.maeum.gohyang.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 유저 위치 실시간 공유 STOMP 핸들러.
 *
 * 클라이언트가 /app/village/position 으로 자신의 좌표를 보내면
 * /topic/village/positions 로 모든 구독자에게 broadcast한다.
 *
 * 게스트 포함 모든 인증된 유저가 전송 가능하다.
 * 위치는 비영속 — 메모리에만 존재하며 DB 저장하지 않는다.
 */
@Controller
@RequiredArgsConstructor
public class PositionHandler {

    static final String TOPIC_POSITIONS = "/topic/village/positions";

    private final SimpMessagingTemplate messagingTemplate;

    @org.springframework.beans.factory.annotation.Value("${village.map.max-x:2400.0}")
    private double maxX;

    @org.springframework.beans.factory.annotation.Value("${village.map.max-y:1600.0}")
    private double maxY;

    @MessageMapping("/village/position")
    public void handlePosition(@Valid @Payload PositionRequest request, Principal principal) {
        if (!(principal instanceof AuthenticatedUser user)) {
            return;
        }

        if (!isValidCoordinate(request.x(), request.y())) {
            return;
        }

        double clampedX = Math.max(0, Math.min(request.x(), maxX));
        double clampedY = Math.max(0, Math.min(request.y(), maxY));

        PositionBroadcast broadcast = new PositionBroadcast(
                user.displayId(),
                user.isGuest() ? PositionUserType.GUEST : PositionUserType.MEMBER,
                clampedX,
                clampedY
        );

        messagingTemplate.convertAndSend(TOPIC_POSITIONS, broadcast);
    }

    private boolean isValidCoordinate(double x, double y) {
        return Double.isFinite(x) && Double.isFinite(y);
    }
}
