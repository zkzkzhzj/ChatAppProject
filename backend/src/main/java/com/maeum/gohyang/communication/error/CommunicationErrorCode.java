package com.maeum.gohyang.communication.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunicationErrorCode {

    CHAT_ROOM_NOT_FOUND("COMM_001", "채팅방을 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    NOT_PARTICIPANT("COMM_002", "해당 채팅방의 참여자가 아닙니다.", HttpStatus.FORBIDDEN),
    GUEST_CHAT_NOT_ALLOWED("COMM_003", "게스트는 채팅 기능을 사용할 수 없습니다. 회원가입 후 이용해주세요.", HttpStatus.FORBIDDEN),
    INVALID_MESSAGE_BODY("COMM_004", "메시지 내용이 비어있거나 허용 길이(1000자)를 초과했습니다.", HttpStatus.BAD_REQUEST),
    BROADCAST_SERIALIZATION_FAILED("COMM_005", "실시간 메시지 직렬화에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
