package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidConfessionLetterStateException extends BusinessException {

    public InvalidConfessionLetterStateException() {
        super(
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_STATE.getMessage(),
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_STATE.getHttpStatus(),
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_STATE.getCode()
        );
    }
}
