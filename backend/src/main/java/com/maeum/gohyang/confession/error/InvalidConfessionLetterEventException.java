package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidConfessionLetterEventException extends BusinessException {

    public InvalidConfessionLetterEventException(String fieldName) {
        super(
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_EVENT.getMessage() + ": " + fieldName,
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_EVENT.getHttpStatus(),
                ConfessionErrorCode.INVALID_CONFESSION_LETTER_EVENT.getCode()
        );
    }
}
