package com.maeum.gohyang.identity.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum IdentityErrorCode {

    DUPLICATE_EMAIL("IDENTITY_001", "이미 사용 중인 이메일입니다", HttpStatus.CONFLICT),
    ;

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
