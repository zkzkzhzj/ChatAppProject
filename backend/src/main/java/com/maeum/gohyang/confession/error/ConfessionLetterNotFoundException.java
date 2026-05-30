package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class ConfessionLetterNotFoundException extends BusinessException {

    public ConfessionLetterNotFoundException() {
        super(
                ConfessionErrorCode.CONFESSION_LETTER_NOT_FOUND.getMessage(),
                ConfessionErrorCode.CONFESSION_LETTER_NOT_FOUND.getHttpStatus(),
                ConfessionErrorCode.CONFESSION_LETTER_NOT_FOUND.getCode()
        );
    }
}
