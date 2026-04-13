package com.maeum.gohyang.communication.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidMessageBodyException extends BusinessException {

    public InvalidMessageBodyException() {
        super(
            CommunicationErrorCode.INVALID_MESSAGE_BODY.getMessage(),
            CommunicationErrorCode.INVALID_MESSAGE_BODY.getHttpStatus(),
            CommunicationErrorCode.INVALID_MESSAGE_BODY.getCode()
        );
    }
}
