package com.maeum.gohyang.confession.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConfessionErrorCode {

    INVALID_CONFESSION_CONTENT("CONFESSION_001", "고백 기록 내용을 확인해 주세요", HttpStatus.BAD_REQUEST),
    CONFESSION_NOT_FOUND("CONFESSION_002", "고백 기록을 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    CONFESSION_ACCESS_DENIED("CONFESSION_003", "고백 기록에 접근할 수 없습니다", HttpStatus.FORBIDDEN),
    INVALID_CONFESSION_LETTER_CONTENT("CONFESSION_004", "편지 내용을 확인해 주세요", HttpStatus.BAD_REQUEST),
    CONFESSION_LETTER_NOT_FOUND("CONFESSION_005", "편지를 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    DUPLICATE_THANK_REPLY("CONFESSION_006", "이미 감사 답장을 남긴 편지입니다", HttpStatus.CONFLICT),
    INVALID_CONFESSION_REACTION("CONFESSION_007", "공감 정보를 확인해 주세요", HttpStatus.BAD_REQUEST),
    INVALID_CONFESSION_REPORT("CONFESSION_008", "신고 정보를 확인해 주세요", HttpStatus.BAD_REQUEST),
    INVALID_CONFESSION_LETTER_EVENT("CONFESSION_009", "편지 이벤트 정보를 확인해 주세요", HttpStatus.BAD_REQUEST),
    INVALID_CONFESSION_LETTER_STATE("CONFESSION_010", "편지 저장 상태를 확인해 주세요", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
