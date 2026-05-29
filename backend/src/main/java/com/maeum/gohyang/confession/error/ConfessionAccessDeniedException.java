package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class ConfessionAccessDeniedException extends BusinessException {

    public ConfessionAccessDeniedException() {
        super(
                ConfessionErrorCode.CONFESSION_ACCESS_DENIED.getMessage(),
                ConfessionErrorCode.CONFESSION_ACCESS_DENIED.getHttpStatus(),
                ConfessionErrorCode.CONFESSION_ACCESS_DENIED.getCode()
        );
    }
}
