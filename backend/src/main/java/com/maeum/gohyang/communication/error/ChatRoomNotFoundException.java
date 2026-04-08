package com.maeum.gohyang.communication.error;

import com.maeum.gohyang.global.error.BusinessException;

public class ChatRoomNotFoundException extends BusinessException {

    public ChatRoomNotFoundException() {
        super(
            CommunicationErrorCode.CHAT_ROOM_NOT_FOUND.getMessage(),
            CommunicationErrorCode.CHAT_ROOM_NOT_FOUND.getHttpStatus(),
            CommunicationErrorCode.CHAT_ROOM_NOT_FOUND.getCode()
        );
    }
}
