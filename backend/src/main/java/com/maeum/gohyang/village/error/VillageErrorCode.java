package com.maeum.gohyang.village.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VillageErrorCode {

    CHARACTER_NOT_FOUND("VILLAGE_001", "캐릭터를 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    SPACE_NOT_FOUND("VILLAGE_002", "공간을 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    GUEST_NO_PERSONAL_SPACE("VILLAGE_003", "게스트는 개인 공간을 가질 수 없습니다", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
