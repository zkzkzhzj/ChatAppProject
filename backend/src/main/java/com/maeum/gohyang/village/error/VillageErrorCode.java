package com.maeum.gohyang.village.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VillageErrorCode {

    CHARACTER_NOT_FOUND("VILLAGE_001", "캐릭터를 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    SPACE_NOT_FOUND("VILLAGE_002", "공간을 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    GUEST_NO_PERSONAL_SPACE("VILLAGE_003", "게스트는 개인 공간을 가질 수 없습니다", HttpStatus.FORBIDDEN),
    INVALID_SUGGESTION_CONTENT("VILLAGE_004", "건의사항 내용을 확인해 주세요", HttpStatus.BAD_REQUEST),
    SUGGESTION_ACCESS_DENIED("VILLAGE_005", "건의사항은 로그인한 이웃만 등록할 수 있습니다", HttpStatus.FORBIDDEN),
    INVALID_SUGGESTION_STATE("VILLAGE_006", "Suggestion data is inconsistent.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
