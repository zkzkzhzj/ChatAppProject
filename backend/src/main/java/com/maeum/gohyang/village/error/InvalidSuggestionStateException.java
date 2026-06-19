package com.maeum.gohyang.village.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidSuggestionStateException extends BusinessException {

    public InvalidSuggestionStateException() {
        super(
                VillageErrorCode.INVALID_SUGGESTION_STATE.getMessage(),
                VillageErrorCode.INVALID_SUGGESTION_STATE.getHttpStatus(),
                VillageErrorCode.INVALID_SUGGESTION_STATE.getCode()
        );
    }
}
