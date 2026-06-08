package com.maeum.gohyang.communication.application.port.in;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.error.InvalidMessageBodyException;

public interface SendMessageUseCase {

    int MAX_BODY_LENGTH = 1000;

    Result execute(Command command);

    record Command(long userId, long chatRoomId, String body) {
        public Command {
            if (body == null || body.isBlank() || body.length() > MAX_BODY_LENGTH) {
                throw new InvalidMessageBodyException();
            }
        }
    }

    record Result(Message userMessage) { }
}
