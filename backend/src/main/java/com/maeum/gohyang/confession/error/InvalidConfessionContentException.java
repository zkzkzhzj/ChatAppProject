package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidConfessionContentException extends BusinessException {

    public InvalidConfessionContentException() {
        super(
                ConfessionErrorCode.INVALID_CONFESSION_CONTENT.getMessage(),
                ConfessionErrorCode.INVALID_CONFESSION_CONTENT.getHttpStatus(),
                ConfessionErrorCode.INVALID_CONFESSION_CONTENT.getCode()
        );
    }
}
