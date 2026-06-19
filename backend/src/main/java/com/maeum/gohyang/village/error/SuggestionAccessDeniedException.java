package com.maeum.gohyang.village.error;

import com.maeum.gohyang.global.error.BusinessException;

public class SuggestionAccessDeniedException extends BusinessException {

    public SuggestionAccessDeniedException() {
        super(
                VillageErrorCode.SUGGESTION_ACCESS_DENIED.getMessage(),
                VillageErrorCode.SUGGESTION_ACCESS_DENIED.getHttpStatus(),
                VillageErrorCode.SUGGESTION_ACCESS_DENIED.getCode()
        );
    }
}
