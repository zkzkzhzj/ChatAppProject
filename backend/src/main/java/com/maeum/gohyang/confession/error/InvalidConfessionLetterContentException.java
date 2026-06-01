package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidConfessionLetterContentException extends BusinessException {

    public InvalidConfessionLetterContentException() {
        super(
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_CONTENT.getMessage(),
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_CONTENT.getHttpStatus(),
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_CONTENT.getCode()
        );
    }
}
