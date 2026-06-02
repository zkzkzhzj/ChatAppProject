package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class DuplicateThankReplyException extends BusinessException {

    public DuplicateThankReplyException() {
        super(
                ConfessionErrorCode.DUPLICATE_THANK_REPLY.getMessage(),
                ConfessionErrorCode.DUPLICATE_THANK_REPLY.getHttpStatus(),
                ConfessionErrorCode.DUPLICATE_THANK_REPLY.getCode()
        );
    }
}
