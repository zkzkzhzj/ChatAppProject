package com.maeum.gohyang.village.error;

import com.maeum.gohyang.global.error.BusinessException;

public class GuestNoPersonalSpaceException extends BusinessException {

    public GuestNoPersonalSpaceException() {
        super(
                VillageErrorCode.GUEST_NO_PERSONAL_SPACE.getMessage(),
                VillageErrorCode.GUEST_NO_PERSONAL_SPACE.getHttpStatus(),
                VillageErrorCode.GUEST_NO_PERSONAL_SPACE.getCode()
        );
    }
}
