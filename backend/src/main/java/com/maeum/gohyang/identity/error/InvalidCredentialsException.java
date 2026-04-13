package com.maeum.gohyang.identity.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidCredentialsException extends BusinessException {

    public InvalidCredentialsException() {
        super(
            IdentityErrorCode.INVALID_CREDENTIALS.getMessage(),
            IdentityErrorCode.INVALID_CREDENTIALS.getHttpStatus(),
            IdentityErrorCode.INVALID_CREDENTIALS.getCode()
        );
    }
}
