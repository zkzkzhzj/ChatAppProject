package com.maeum.gohyang.global.config;

import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.web.bind.annotation.ControllerAdvice;

import com.maeum.gohyang.global.error.BusinessException;

import lombok.extern.slf4j.Slf4j;

/**
 * STOMP @MessageMapping 핸들러에서 발생한 예외를 처리한다.
 *
 * 스택 트레이스가 클라이언트에 노출되지 않도록 마스킹하고,
 * 클라이언트에는 에러 메시지만 전달한다.
 */
@Slf4j
@ControllerAdvice
public class StompErrorHandler {

    @MessageExceptionHandler(BusinessException.class)
    @SendToUser("/queue/errors")
    public StompErrorResponse handleBusinessException(BusinessException ex) {
        log.warn("[STOMP] Business error: {} - {}", ex.getErrorCode(), ex.getMessage());
        return new StompErrorResponse(ex.getErrorCode(), ex.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/errors")
    public StompErrorResponse handleException(Exception ex) {
        log.error("[STOMP] Unexpected error", ex);
        return new StompErrorResponse("STOMP_ERROR", "서버 오류가 발생했습니다.");
    }

    public record StompErrorResponse(String code, String message) { }
}
