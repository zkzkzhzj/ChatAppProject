package com.maeum.gohyang.village.error;

import com.maeum.gohyang.global.error.BusinessException;

public class SpaceNotFoundException extends BusinessException {

    public SpaceNotFoundException() {
        super(
                VillageErrorCode.SPACE_NOT_FOUND.getMessage(),
                VillageErrorCode.SPACE_NOT_FOUND.getHttpStatus(),
                VillageErrorCode.SPACE_NOT_FOUND.getCode()
        );
    }
}
