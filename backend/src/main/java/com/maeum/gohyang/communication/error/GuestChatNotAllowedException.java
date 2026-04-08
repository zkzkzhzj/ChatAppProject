package com.maeum.gohyang.communication.error;

import com.maeum.gohyang.global.error.BusinessException;

public class GuestChatNotAllowedException extends BusinessException {

    public GuestChatNotAllowedException() {
        super(
            CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED.getMessage(),
            CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED.getHttpStatus(),
            CommunicationErrorCode.GUEST_CHAT_NOT_ALLOWED.getCode()
        );
    }
}
