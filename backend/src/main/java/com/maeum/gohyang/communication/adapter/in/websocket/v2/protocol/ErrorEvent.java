package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

import com.maeum.gohyang.communication.error.CommunicationErrorCode;

/**
 * 서버 -> 클라이언트 에러 통보. STOMP의 ERROR frame을 대체한다.
 *
 * code/message는 {@link CommunicationErrorCode}를 그대로 노출해 REST 에러 응답과
 * 키를 일치시킨다.
 */
public record ErrorEvent(
        EnvelopeType type,
        String code,
        String message
) implements OutboundFrame {

    public static ErrorEvent of(CommunicationErrorCode errorCode) {
        return new ErrorEvent(EnvelopeType.ERROR, errorCode.getCode(), errorCode.getMessage());
    }

    public static ErrorEvent of(String code, String message) {
        return new ErrorEvent(EnvelopeType.ERROR, code, message);
    }
}
