package com.maeum.gohyang.confession.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConfessionErrorCode {

    INVALID_CONFESSION_CONTENT("CONFESSION_001", "고백 기록 내용을 확인해 주세요", HttpStatus.BAD_REQUEST),
    CONFESSION_NOT_FOUND("CONFESSION_002", "고백 기록을 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    CONFESSION_ACCESS_DENIED("CONFESSION_003", "고백 기록에 접근할 수 없습니다", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
