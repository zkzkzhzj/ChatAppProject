package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidConfessionReactionException extends BusinessException {

    public InvalidConfessionReactionException() {
        super(
                ConfessionErrorCode.INVALID_CONFESSION_REACTION.getMessage(),
                ConfessionErrorCode.INVALID_CONFESSION_REACTION.getHttpStatus(),
                ConfessionErrorCode.INVALID_CONFESSION_REACTION.getCode()
        );
    }
}
