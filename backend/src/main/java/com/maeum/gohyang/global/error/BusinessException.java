package com.maeum.gohyang.global.error;

import org.springframework.http.HttpStatus;

/**
 * 비즈니스 규칙 위반에 대한 커스텀 예외 베이스 클래스.
 * RuntimeException을 직접 throw하는 대신 이 클래스를 상속하여 사용한다.
 */
public abstract class BusinessException extends RuntimeException {

    private final HttpStatus httpStatus;
    private final String errorCode;

    protected BusinessException(String message, HttpStatus httpStatus, String errorCode) {
        super(message);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
