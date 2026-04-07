package com.maeum.gohyang.identity.domain;

import com.maeum.gohyang.global.error.BusinessException;

public class DuplicateEmailException extends BusinessException {

    public DuplicateEmailException() {
        super(
            IdentityErrorCode.DUPLICATE_EMAIL.getMessage(),
            IdentityErrorCode.DUPLICATE_EMAIL.getHttpStatus(),
            IdentityErrorCode.DUPLICATE_EMAIL.getCode()
        );
    }
}
