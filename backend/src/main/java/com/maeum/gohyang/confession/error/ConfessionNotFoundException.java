package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class ConfessionNotFoundException extends BusinessException {

    public ConfessionNotFoundException() {
        super(
                ConfessionErrorCode.CONFESSION_NOT_FOUND.getMessage(),
                ConfessionErrorCode.CONFESSION_NOT_FOUND.getHttpStatus(),
                ConfessionErrorCode.CONFESSION_NOT_FOUND.getCode()
        );
    }
}
