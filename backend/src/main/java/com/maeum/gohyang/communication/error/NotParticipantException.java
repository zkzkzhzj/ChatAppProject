package com.maeum.gohyang.communication.error;

import com.maeum.gohyang.global.error.BusinessException;

public class NotParticipantException extends BusinessException {

    public NotParticipantException() {
        super(
            CommunicationErrorCode.NOT_PARTICIPANT.getMessage(),
            CommunicationErrorCode.NOT_PARTICIPANT.getHttpStatus(),
            CommunicationErrorCode.NOT_PARTICIPANT.getCode()
        );
    }
}
