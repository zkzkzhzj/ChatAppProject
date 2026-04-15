package com.maeum.gohyang.communication.adapter.in.websocket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * STOMP 메시지 전송 요청 DTO.
 * STOMP에서는 @Valid가 자동 적용되지 않으므로 이 어노테이션은 문서적 역할이며,
 * 실제 검증은 SendMessageUseCase.Command compact constructor에서 수행된다.
 */
public record StompSendMessageRequest(
        @NotBlank @Size(max = 1000) String body
) { }
