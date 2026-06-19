package com.maeum.gohyang.village.error;

import com.maeum.gohyang.global.error.BusinessException;

public class InvalidSuggestionContentException extends BusinessException {

    public InvalidSuggestionContentException() {
        super(
                VillageErrorCode.INVALID_SUGGESTION_CONTENT.getMessage(),
                VillageErrorCode.INVALID_SUGGESTION_CONTENT.getHttpStatus(),
                VillageErrorCode.INVALID_SUGGESTION_CONTENT.getCode()
        );
    }
}
