package com.maeum.gohyang.identity.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum IdentityErrorCode {

    DUPLICATE_EMAIL("IDENTITY_001", "이미 사용 중인 이메일입니다", HttpStatus.CONFLICT),
    INVALID_CREDENTIALS("IDENTITY_002", "이메일 또는 비밀번호가 올바르지 않습니다", HttpStatus.UNAUTHORIZED);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
