package com.maeum.gohyang.confession.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidConfessionReportException extends BusinessException {

    public InvalidConfessionReportException() {
        super(
                ConfessionErrorCode.INVALID_CONFESSION_REPORT.getMessage(),
                ConfessionErrorCode.INVALID_CONFESSION_REPORT.getHttpStatus(),
                ConfessionErrorCode.INVALID_CONFESSION_REPORT.getCode()
        );
    }
}
