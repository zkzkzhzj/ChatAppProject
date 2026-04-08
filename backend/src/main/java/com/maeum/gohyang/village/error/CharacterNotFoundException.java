package com.maeum.gohyang.village.error;

import com.maeum.gohyang.global.error.BusinessException;

public class CharacterNotFoundException extends BusinessException {

    public CharacterNotFoundException() {
        super(
                VillageErrorCode.CHARACTER_NOT_FOUND.getMessage(),
                VillageErrorCode.CHARACTER_NOT_FOUND.getHttpStatus(),
                VillageErrorCode.CHARACTER_NOT_FOUND.getCode()
        );
    }
}
