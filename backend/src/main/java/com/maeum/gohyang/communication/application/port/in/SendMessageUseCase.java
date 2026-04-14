package com.maeum.gohyang.communication.application.port.in;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.error.InvalidMessageBodyException;

/**
 * 메시지 전송 유스케이스.
 *
 * 유저 메시지를 저장하고 즉시 반환한다.
 * NPC 응답은 비동기로 생성되어 WebSocket으로 별도 브로드캐스트된다.
 */
public interface SendMessageUseCase {

    int MAX_BODY_LENGTH = 1000;

    Result execute(Command command);

    /**
     * 메시지 전송 커맨드.
     * REST와 STOMP 두 경로 모두 이 Command를 거치므로 입력 검증을 여기서 통합한다.
     */
    record Command(long userId, long chatRoomId, String body) {
        public Command {
            if (body == null || body.isBlank() || body.length() > MAX_BODY_LENGTH) {
                throw new InvalidMessageBodyException();
            }
        }
    }

    record Result(Message userMessage) { }
}
