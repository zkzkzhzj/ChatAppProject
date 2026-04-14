package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.Message;

public interface SaveMessagePort {

    /** 메시지 저장 (message 테이블) */
    Message save(Message message);

    /** 유저 메시지 저장 (message + user_message 테이블 dual-write) */
    Message saveWithUser(Message message, long userId);
}
