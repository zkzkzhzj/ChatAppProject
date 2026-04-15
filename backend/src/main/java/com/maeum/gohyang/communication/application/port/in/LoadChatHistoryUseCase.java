package com.maeum.gohyang.communication.application.port.in;

import java.util.List;

import com.maeum.gohyang.communication.domain.Message;

public interface LoadChatHistoryUseCase {

    List<Message> execute(long chatRoomId, int limit);
}
