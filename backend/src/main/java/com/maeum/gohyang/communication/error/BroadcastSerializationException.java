package com.maeum.gohyang.communication.error;

import com.maeum.gohyang.global.error.BusinessException;

/**
 * Redis Pub/Sub 채널로 publish 또는 subscribe 콜백 처리 중 JSON 직렬화/역직렬화가
 * 실패했을 때 던진다. 사용자 입력에서 발생하지 않는 인프라 예외이지만, Critical Rule #4
 * (RuntimeException 직접 throw 금지)에 따라 도메인 예외로 감싼다.
 */
public class BroadcastSerializationException extends BusinessException {

    public BroadcastSerializationException(Throwable cause) {
        super(
                CommunicationErrorCode.BROADCAST_SERIALIZATION_FAILED.getMessage(),
                CommunicationErrorCode.BROADCAST_SERIALIZATION_FAILED.getHttpStatus(),
                CommunicationErrorCode.BROADCAST_SERIALIZATION_FAILED.getCode()
        );
        initCause(cause);
    }
}
